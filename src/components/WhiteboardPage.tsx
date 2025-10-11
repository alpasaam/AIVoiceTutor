import { useState, useEffect, useRef } from 'react';
import { Whiteboard } from './Whiteboard';
import { QuestionInput } from './QuestionInput';
import { ElevenLabsService } from '../services/elevenlabs';
import { AITutorService } from '../services/aiTutor';
import { RunwareService } from '../services/runware';
import { GeminiService } from '../services/gemini';

interface UserSettings {
  voice_id: string;
  voice_name: string;
  ai_pushiness_level: number;
}

interface WhiteboardPageProps {
  settings: UserSettings;
}

export function WhiteboardPage({ settings }: WhiteboardPageProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [canvasElements, setCanvasElements] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const elevenLabsRef = useRef<ElevenLabsService | null>(null);
  const aiTutorRef = useRef<AITutorService | null>(null);
  const runwareRef = useRef<RunwareService | null>(null);
  const geminiRef = useRef<GeminiService | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    const runwareKey = import.meta.env.VITE_RUNWARE_API_KEY;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    console.log('🔑 API Keys status:', {
      elevenlabs: elevenLabsKey ? '✓ Present' : '✗ Missing',
      runware: runwareKey ? '✓ Present' : '✗ Missing',
      gemini: geminiKey ? '✓ Present' : '✗ Missing',
    });

    if (elevenLabsKey) {
      elevenLabsRef.current = new ElevenLabsService(elevenLabsKey);
      console.log('✓ ElevenLabs service initialized');
    } else {
      console.warn('⚠️ ElevenLabs API key missing - voice output disabled');
    }

    if (runwareKey) {
      runwareRef.current = new RunwareService(runwareKey);
      console.log('✓ Runware service initialized');
    }

    if (geminiKey) {
      geminiRef.current = new GeminiService(geminiKey);
      console.log('✓ Gemini service initialized');
    } else {
      console.warn('⚠️ Gemini API key missing - AI responses disabled');
    }

    if (settings) {
      aiTutorRef.current = new AITutorService({
        pushinessLevel: settings.ai_pushiness_level,
        conversationHistory: [],
      });
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        console.log('🎤 Voice recognized:', transcript);
        setCurrentTranscript(transcript);
        setStatusMessage('Processing your question...');
        await handleUserMessage(transcript);
      };

      recognitionRef.current.onstart = () => {
        console.log('🎤 Speech recognition started');
        setStatusMessage('Listening... speak now');
      };

      recognitionRef.current.onend = () => {
        console.log('🎤 Speech recognition ended');
        if (isListening) {
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        setStatusMessage(`Error: ${event.error}`);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [settings]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      console.log('🔴 Stopping speech recognition');
      recognitionRef.current.stop();
      setIsListening(false);
      setStatusMessage('');
    } else {
      console.log('🔴 Starting speech recognition');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setCurrentTranscript('');
      } catch (error) {
        console.error('❌ Failed to start recognition:', error);
        setStatusMessage('Failed to start listening');
      }
    }
  };

  const handleToggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
  };

  const handleQuestionSubmit = async (questionText: string, imageUrl?: string) => {
    if (imageUrl && geminiRef.current) {
      setIsProcessing(true);
      try {
        const imageAnalysis = await geminiRef.current.analyzeImage(imageUrl, questionText);
        const contextMessage = `${questionText}\n\nImage analysis: ${imageAnalysis}`;
        await handleUserMessage(contextMessage, imageUrl);
      } catch (error) {
        console.error('Error analyzing image:', error);
        await handleUserMessage(questionText, imageUrl);
      } finally {
        setIsProcessing(false);
      }
    } else {
      await handleUserMessage(questionText);
    }
  };

  const handleUserMessage = async (message: string, imageUrl?: string) => {
    if (!aiTutorRef.current || !settings) {
      console.error('❌ AI tutor not initialized');
      setStatusMessage('AI tutor not ready');
      return;
    }

    console.log('💬 Sending message to AI:', message);
    setIsProcessing(true);
    setStatusMessage('AI is thinking...');

    try {
      const response = await aiTutorRef.current.getResponse(message, imageUrl);
      console.log('🤖 AI response received:', response.substring(0, 100) + '...');
      setAiResponse(response);
      setStatusMessage('Generating voice response...');

      if (isSpeaking && elevenLabsRef.current) {
        console.log('🔊 Speaking response with voice:', settings.voice_name);
        await elevenLabsRef.current.speak(response, settings.voice_id);
        console.log('✓ Voice playback complete');
      } else if (isSpeaking && !elevenLabsRef.current) {
        console.warn('⚠️ Voice output disabled - ElevenLabs not initialized');
        setStatusMessage('Voice disabled - check API key');
      } else if (!isSpeaking) {
        setStatusMessage('');
      }

      if (aiTutorRef.current.shouldDrawOnCanvas(response)) {
        const drawingInstruction = aiTutorRef.current.extractDrawingInstruction(response);
        if (drawingInstruction && runwareRef.current) {
          try {
            const imageUrl = await runwareRef.current.generateImage({
              prompt: drawingInstruction,
              width: 512,
              height: 512,
            });

            console.log('Generated image for canvas:', imageUrl);
          } catch (error) {
            console.error('Error generating drawing:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      setStatusMessage('Error: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleCanvasUpdate = (elements: any[]) => {
    setCanvasElements(elements);
  };

  return (
    <div className="h-screen flex flex-col relative bg-slate-50">
      <div className="flex-1 overflow-hidden">
        <Whiteboard onCanvasUpdate={handleCanvasUpdate} initialElements={canvasElements} />
      </div>

      <QuestionInput
        onSubmit={handleQuestionSubmit}
        disabled={isProcessing}
        isListening={isListening}
        isSpeaking={isSpeaking}
        onToggleListening={handleToggleListening}
        onToggleSpeaking={handleToggleSpeaking}
      />

      {(isProcessing || statusMessage || currentTranscript || aiResponse) && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full px-4">
          <div className="bg-white px-6 py-4 rounded-lg shadow-xl border border-slate-200">
            {currentTranscript && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1">You said:</p>
                <p className="text-slate-800 font-medium">{currentTranscript}</p>
              </div>
            )}
            {statusMessage && (
              <p className="text-blue-600 font-medium flex items-center gap-2 mb-3">
                {isProcessing && (
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                )}
                {statusMessage}
              </p>
            )}
            {aiResponse && !isSpeaking && (
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs text-slate-500 mb-1">AI Response:</p>
                <p className="text-slate-800 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

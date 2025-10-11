import { useState, useEffect, useRef } from 'react';
import { Whiteboard } from './Whiteboard';
import { QuestionInput } from './QuestionInput';
import { VoiceControls } from './VoiceControls';
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
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

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
    setCurrentQuestion(questionText);
    setIsProcessing(true);
    setStatusMessage('Processing question...');

    try {
      if (!geminiRef.current || !runwareRef.current) {
        console.error('Services not initialized');
        setStatusMessage('Services not ready');
        return;
      }

      if (imageUrl) {
        const imageAnalysis = await geminiRef.current.analyzeImage(imageUrl, questionText);
        console.log('Image analysis:', imageAnalysis);
        questionText = `${questionText}\n\nImage shows: ${imageAnalysis}`;
      }

      const whiteboardPrompt = `Create a clean whiteboard image showing this math problem in the top-left corner: "${questionText}". Use clear handwriting style text on a white background. Leave plenty of space below and to the right for work.`;

      setStatusMessage('Generating whiteboard...');
      const newBackgroundUrl = await runwareRef.current.generateImage({
        prompt: whiteboardPrompt,
        width: 1024,
        height: 768,
      });

      setBackgroundImageUrl(newBackgroundUrl);
      await handleUserMessage(questionText);
    } catch (error) {
      console.error('Error processing question:', error);
      setStatusMessage('Error: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 3000);
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
      setStatusMessage('Generating voice response...');

      if (isSpeaking && elevenLabsRef.current) {
        console.log('🔊 Speaking response with voice:', settings.voice_name);
        await elevenLabsRef.current.speak(response, settings.voice_id);
        console.log('✓ Voice playback complete');
      } else if (isSpeaking && !elevenLabsRef.current) {
        console.warn('⚠️ Voice output disabled - ElevenLabs not initialized');
        setStatusMessage('Voice disabled - check API key');
      }

    } catch (error) {
      console.error('❌ Error processing message:', error);
      setStatusMessage('Error: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCanvasUpdate = async (canvasData: string) => {
    setCanvasDataUrl(canvasData);

    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(async () => {
      if (!geminiRef.current || !runwareRef.current || !backgroundImageUrl || !currentQuestion) return;

      try {
        setStatusMessage('AI analyzing your work...');

        const combinedImageUrl = await createCombinedImage(backgroundImageUrl, canvasData);

        const analysis = await geminiRef.current.analyzeCanvasForProblem(combinedImageUrl);
        console.log('Canvas analysis:', analysis);

        const needsHelp = analysis.toLowerCase().includes('error') ||
                         analysis.toLowerCase().includes('mistake') ||
                         analysis.toLowerCase().includes('incorrect') ||
                         analysis.toLowerCase().includes('wrong');

        if (needsHelp) {
          setStatusMessage('Deciding helpful annotations...');
          const annotationGuidance = await geminiRef.current.decideHelpfulAnnotations(analysis, currentQuestion);
          console.log('Annotation guidance:', annotationGuidance);

          const annotationPrompt = `Create a clean educational whiteboard image with this math problem at top-left: "${currentQuestion}". Add these specific helpful annotations based on student work: ${annotationGuidance}. Use: red circles for errors, green checkmarks for correct steps, blue handwritten hints. Keep annotations minimal, clear, and educational. White background, realistic whiteboard style.`;

          setStatusMessage('Updating whiteboard with helpful hints...');
          const annotatedBackground = await runwareRef.current.generateImage({
            prompt: annotationPrompt,
            width: 1024,
            height: 768,
          });

          setBackgroundImageUrl(annotatedBackground);
        }

        setStatusMessage('');
      } catch (error) {
        console.error('Error analyzing canvas:', error);
        setStatusMessage('');
      }
    }, 2000);
  };

  const createCombinedImage = async (bgUrl: string, overlayDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';

      bgImg.onload = () => {
        canvas.width = bgImg.width;
        canvas.height = bgImg.height;

        ctx.drawImage(bgImg, 0, 0);

        const overlayImg = new Image();
        overlayImg.onload = () => {
          ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        overlayImg.onerror = () => reject(new Error('Failed to load overlay'));
        overlayImg.src = overlayDataUrl;
      };

      bgImg.onerror = () => reject(new Error('Failed to load background'));
      bgImg.src = bgUrl;
    });
  };

  return (
    <div className="h-screen flex flex-col relative bg-slate-50">
      <div className="flex-1 overflow-hidden">
        <Whiteboard
          onCanvasUpdate={handleCanvasUpdate}
          backgroundImageUrl={backgroundImageUrl}
          isListening={isListening}
          isSpeaking={isSpeaking}
          onToggleListening={handleToggleListening}
          onToggleSpeaking={handleToggleSpeaking}
        />
      </div>

      <QuestionInput onSubmit={handleQuestionSubmit} disabled={isProcessing} />

      {(isProcessing || statusMessage || currentTranscript) && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white px-6 py-4 rounded-lg shadow-xl border border-slate-200 min-w-[300px]">
            {currentTranscript && (
              <div className="mb-2">
                <p className="text-xs text-slate-500 mb-1">You said:</p>
                <p className="text-slate-800 font-medium">{currentTranscript}</p>
              </div>
            )}
            {statusMessage && (
              <p className="text-blue-600 font-medium flex items-center gap-2">
                {isProcessing && (
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                )}
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

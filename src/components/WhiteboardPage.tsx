import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Whiteboard, WhiteboardRef } from './Whiteboard';
import { QuestionInput } from './QuestionInput';
import { AIContextWindow, AIContextContent } from './AIContextWindow';
import { ElevenLabsService } from '../services/elevenlabs';
import { AITutorService } from '../services/aiTutor';
import { RunwareService } from '../services/runware';
import { GeminiService } from '../services/gemini';
import { ContextWindowService } from '../services/contextWindowService';
import { supabase } from '../lib/supabase';

interface UserSettings {
  voice_id: string;
  voice_name: string;
  ai_pushiness_level: number;
}

interface WhiteboardPageProps {
  settings: UserSettings;
  onBack: () => void;
}

async function isCanvasBlank(canvasDataUrl: string): Promise<boolean> {
  if (!canvasDataUrl || canvasDataUrl.length < 100) {
    console.log('🔍 Canvas check: Empty or too small');
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log('🔍 Canvas check: No context available');
        resolve(true);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      let hasNonTransparentPixel = false;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] > 0) {
          hasNonTransparentPixel = true;
          break;
        }
      }

      console.log('🔍 Canvas check:', hasNonTransparentPixel ? 'HAS CONTENT' : 'BLANK');
      resolve(!hasNonTransparentPixel);
    };

    img.onerror = () => {
      console.error('🔍 Canvas check: Failed to load image');
      resolve(true);
    };

    img.src = canvasDataUrl;
  });
}

export function WhiteboardPage({ settings, onBack }: WhiteboardPageProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentQuestionText, setCurrentQuestionText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [contextContent, setContextContent] = useState<AIContextContent | null>(null);
  const [contextVisible, setContextVisible] = useState(false);
  const [contextMinimized, setContextMinimized] = useState(true);
  const [contextPosition, setContextPosition] = useState({ x: window.innerWidth - 440, y: 80 });
  const [contextTransparency, setContextTransparency] = useState(1.0);
  const [userId, setUserId] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState('');

  const elevenLabsRef = useRef<ElevenLabsService | null>(null);
  const aiTutorRef = useRef<AITutorService | null>(null);
  const runwareRef = useRef<RunwareService | null>(null);
  const geminiRef = useRef<GeminiService | null>(null);
  const recognitionRef = useRef<any>(null);
  const contextServiceRef = useRef<ContextWindowService>(new ContextWindowService());
  const positionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadUserAndSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const contextSettings = await contextServiceRef.current.getOrCreateSettings(user.id);
        setContextPosition({ x: contextSettings.x_position, y: contextSettings.y_position });
        setContextMinimized(contextSettings.is_minimized);
        setContextVisible(contextSettings.is_visible);
        setContextTransparency(contextSettings.transparency_level);
        if (contextSettings.last_shown_content) {
          setContextContent(contextSettings.last_shown_content);
        }
      }
    };

    loadUserAndSettings();
  }, []);
  const whiteboardRef = useRef<WhiteboardRef>(null);

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
      console.log('✓ Speech recognition API detected');
      console.log('🔍 Environment check:', {
        protocol: window.location.protocol,
        isHTTPS: window.location.protocol === 'https:',
        isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
        online: navigator.onLine,
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome' :
                 navigator.userAgent.includes('Edge') ? 'Edge' :
                 navigator.userAgent.includes('Safari') ? 'Safari' : 'Other',
      });

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      try {
        recognitionRef.current = new SpeechRecognition();

        // For non-localhost HTTPS, use shorter timeout settings
        if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
          console.log('⚠️ Non-localhost detected - using adjusted settings for better reliability');
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false; // Disable interim results for better stability
          recognitionRef.current.lang = 'en-US';
          recognitionRef.current.maxAlternatives = 1;
        } else {
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          recognitionRef.current.maxAlternatives = 1;
        }

        console.log('✓ Speech recognition instance created with settings:', {
          continuous: recognitionRef.current.continuous,
          interimResults: recognitionRef.current.interimResults,
          lang: 'en-US',
          isNonLocalhost: !window.location.hostname.includes('localhost'),
        });

        recognitionRef.current.onresult = async (event: any) => {
          console.log('🎤 Speech recognition result event:', event);
          const last = event.results.length - 1;
          const transcript = event.results[last][0].transcript;
          const isFinal = event.results[last].isFinal;
          const confidence = event.results[last][0].confidence;

          console.log('🎤 Transcript:', { transcript, isFinal, confidence });

          if (isFinal || !recognitionRef.current.interimResults) {
            // Process final result OR if interim results are disabled, process any result
            setCurrentTranscript(transcript);
            setStatusMessage('Processing your question and whiteboard...');
            setIsListening(false);
            await handleQuestionSubmit(transcript);
          } else {
            // Show interim results
            setStatusMessage(`Listening: "${transcript}"`);
          }
        };

        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech recognition started successfully');
          setStatusMessage('Listening... speak now');
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Speech recognition ended');
          setIsListening(false);
          if (statusMessage.startsWith('Listening')) {
            setStatusMessage('');
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('❌ Speech recognition error details:', {
            error: event.error,
            message: event.message,
            timeStamp: event.timeStamp,
            url: window.location.href,
            protocol: window.location.protocol,
            userAgent: navigator.userAgent,
            onLine: navigator.onLine,
          });

          let errorMessage = '';
          let shouldRetry = false;

          switch (event.error) {
            case 'network':
              if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
                errorMessage = 'Network issue with speech API. Your network may block Google services. Try: 1) Different network/wifi 2) VPN off 3) Browser restart';
                console.error('Network error on non-localhost - Common causes:');
                console.error('1. Corporate/school network blocking Google speech API');
                console.error('2. VPN/firewall blocking external connections');
                console.error('3. ISP-level restrictions');
                console.error('4. Chrome Web Speech API requires connection to www.google.com/speech-api/');
                console.error('Try: Access via localhost instead, or use different network');
              } else {
                errorMessage = 'Network error. Check internet connection and try again.';
                shouldRetry = true;
              }
              break;
            case 'not-allowed':
            case 'permission-denied':
              errorMessage = 'Microphone permission denied. Please allow microphone access in browser settings.';
              console.error('Permission denied - User needs to grant microphone access');
              break;
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again and speak clearly.';
              shouldRetry = true;
              console.warn('No speech detected');
              break;
            case 'aborted':
              errorMessage = 'Speech recognition stopped unexpectedly.';
              shouldRetry = true;
              console.warn('Recognition aborted');
              break;
            case 'audio-capture':
              errorMessage = 'Cannot access microphone. Check if another app is using it.';
              console.error('Audio capture error - Microphone may be in use by another app');
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech service blocked. Requires HTTPS or different browser settings.';
              console.error('Service not allowed - Current protocol:', window.location.protocol);
              break;
            default:
              errorMessage = `Speech error: ${event.error}. Try refreshing the page.`;
              console.error('Unknown speech recognition error:', event.error);
          }

          setStatusMessage(errorMessage + (shouldRetry ? ' (Will auto-clear)' : ''));
          setIsListening(false);
          setTimeout(() => setStatusMessage(''), shouldRetry ? 4000 : 8000);
        };

        console.log('✓ Speech recognition configured successfully');
      } catch (error) {
        console.error('❌ Failed to initialize speech recognition:', error);
      }
    } else {
      console.warn('⚠️ Speech recognition not supported in this browser');
    }

    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [settings]);

  const handleToggleListening = async () => {
    if (!recognitionRef.current) {
      const message = 'Speech recognition is not supported in your browser. Try Chrome, Edge, or Safari.';
      console.error('❌ Speech recognition not available');
      setStatusMessage(message);
      setTimeout(() => setStatusMessage(''), 5000);
      return;
    }

    if (isListening) {
      console.log('🔴 Stopping speech recognition');
      try {
        recognitionRef.current.stop();
        setIsListening(false);
        setStatusMessage('');
      } catch (error) {
        console.error('❌ Error stopping recognition:', error);
        setIsListening(false);
      }
    } else {
      console.log('🟢 Starting speech recognition...');
      console.log('Browser info:', {
        userAgent: navigator.userAgent,
        language: navigator.language,
        onLine: navigator.onLine,
      });

      if (!navigator.onLine) {
        console.error('❌ No internet connection detected');
        setStatusMessage('No internet connection. Speech recognition requires internet.');
        setTimeout(() => setStatusMessage(''), 5000);
        return;
      }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✓ Microphone access granted');

        setCurrentTranscript('');
        setIsListening(true);
        recognitionRef.current.start();
        console.log('✓ Speech recognition started');
      } catch (error: any) {
        console.error('❌ Failed to start recognition:', {
          error,
          name: error?.name,
          message: error?.message,
        });

        let errorMessage = 'Failed to start listening.';
        if (error?.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone in browser settings.';
        } else if (error?.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else if (error?.message) {
          errorMessage = `Error: ${error.message}`;
        }

        setStatusMessage(errorMessage);
        setIsListening(false);
        setTimeout(() => setStatusMessage(''), 5000);
      }
    }
  };

  const handleToggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
  };

  const handleQuestionSubmit = async (questionText: string, imageUrl?: string) => {
    console.log('📝 Question submitted:', { questionText, hasImage: !!imageUrl });
    setCurrentQuestion(questionText);
    setIsProcessing(true);
    setStatusMessage('Processing your question and whiteboard...');

    try {
      if (!geminiRef.current) {
        console.error('❌ Gemini service not initialized');
        setStatusMessage('Gemini service not ready. Check API key.');
        return;
      }

      let whiteboardScreenshot: string | undefined = undefined;

      if (whiteboardRef.current) {
        console.log('📸 Capturing complete whiteboard screenshot...');
        try {
          whiteboardScreenshot = await whiteboardRef.current.captureScreenshot();
          if (whiteboardScreenshot && whiteboardScreenshot.length > 100) {
            console.log('✓ Whiteboard screenshot captured:', whiteboardScreenshot.length, 'bytes');
          } else {
            console.log('ℹ️ Whiteboard appears empty');
            whiteboardScreenshot = undefined;
          }
        } catch (error: any) {
          console.error('❌ Failed to capture whiteboard screenshot:', error);
          whiteboardScreenshot = undefined;
        }
      } else {
        console.warn('⚠️ Whiteboard ref not available');
      }

      if (imageUrl) {
        console.log('🖼️ Analyzing uploaded image...');
        setBackgroundImageUrl(imageUrl);
        setCurrentQuestionText(questionText);
        try {
          const imageAnalysis = await geminiRef.current.analyzeImage(imageUrl, questionText);
          console.log('✓ Image analysis complete:', imageAnalysis.substring(0, 100) + '...');
          questionText = `${questionText}\n\nImage shows: ${imageAnalysis}`;
        } catch (imageError: any) {
          console.error('❌ Image analysis failed:', {
            error: imageError,
            message: imageError?.message,
          });
          setStatusMessage('Failed to analyze image, continuing without it...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      try {
        setStatusMessage('Generating context information...');
        const contextInfo = await geminiRef.current.generateContextInfo(questionText, imageUrl);
        const newContextContent: AIContextContent = {
          title: contextInfo.title,
          blocks: contextInfo.blocks,
          timestamp: Date.now(),
        };
        setContextContent(newContextContent);
        setContextVisible(true);
        setContextMinimized(false);

        if (userId) {
          await contextServiceRef.current.updateContent(userId, newContextContent);
          await contextServiceRef.current.updateVisibility(userId, true);
          await contextServiceRef.current.updateMinimized(userId, false);
        }

        console.log('✓ Context window updated and displayed');
      } catch (contextError: any) {
        console.error('❌ Failed to generate context info:', contextError);

        const fallbackContent: AIContextContent = {
          title: imageUrl ? 'Problem Analysis' : 'Question Guide',
          blocks: [
            {
              type: 'hint',
              content: imageUrl
                ? 'I\'m analyzing your uploaded image. Let me help you work through this problem step by step.'
                : 'Let me help you understand this topic. Feel free to draw or write on the whiteboard as we work through this together.'
            },
            {
              type: 'tip',
              content: 'Try breaking down the problem into smaller steps. I\'m here to guide you!'
            }
          ],
          timestamp: Date.now(),
        };

        setContextContent(fallbackContent);
        setContextVisible(true);
        setContextMinimized(false);

        if (userId) {
          await contextServiceRef.current.updateContent(userId, fallbackContent);
          await contextServiceRef.current.updateVisibility(userId, true);
          await contextServiceRef.current.updateMinimized(userId, false);
        }

        console.log('✓ Fallback context window displayed');
      }

      await handleUserMessage(questionText, whiteboardScreenshot);
    } catch (error: any) {
      console.error('❌ Error processing question:', {
        error,
        message: error?.message,
        stack: error?.stack,
      });
      setStatusMessage('Error: ' + (error?.message || 'Failed to process question'));
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handleUserMessage = async (message: string, canvasImageUrl?: string) => {
    if (!aiTutorRef.current || !settings) {
      console.error('❌ AI tutor not initialized');
      setStatusMessage('AI tutor not ready');
      return;
    }

    console.log('💬 Sending message to AI:', {
      message: message.substring(0, 100) + '...',
      hasCanvasImage: !!canvasImageUrl,
      canvasImageLength: canvasImageUrl?.length || 0,
      canvasImagePreview: canvasImageUrl?.substring(0, 50)
    });
    setIsProcessing(true);
    setStatusMessage('AI is analyzing your question and whiteboard...');

    try {
      console.log('📤 Calling aiTutorRef.current.getResponse with canvas image:', !!canvasImageUrl);
      const response = await aiTutorRef.current.getResponse(message, canvasImageUrl);
      console.log('📥 Response received from AI');
      console.log('🤖 AI response received:', response.substring(0, 100) + '...');
      setAiResponse(response);
      setStatusMessage('Generating voice response...');

      if (isSpeaking && elevenLabsRef.current) {
        console.log('🔊 Speaking response with voice:', settings.voice_name);

        // Stop listening while speaking to prevent feedback loop
        const wasListening = isListening;
        if (wasListening && recognitionRef.current) {
          console.log('⏸️ Pausing speech recognition during voice output');
          recognitionRef.current.stop();
          setIsListening(false);
        }

        await elevenLabsRef.current.speak(response, settings.voice_id);
        console.log('✓ Voice playback complete');

        // Resume listening if it was active before
        if (wasListening && recognitionRef.current) {
          console.log('▶️ Resuming speech recognition');
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (error) {
            console.error('Failed to resume recognition:', error);
          }
        }
      } else if (isSpeaking && !elevenLabsRef.current) {
        console.warn('⚠️ Voice output disabled - ElevenLabs not initialized');
        setStatusMessage('Voice disabled - check API key');
      } else if (!isSpeaking) {
        setStatusMessage('');
      }
    } catch (error: any) {
      console.error('❌ Error processing message:', {
        error,
        message: error?.message,
        stack: error?.stack,
      });
      setStatusMessage('Error: ' + (error?.message || 'Unknown error occurred'));
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const drawingActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCanvasUpdate = async (canvasData: string) => {
    setCanvasDataUrl(canvasData);

    if (contextVisible && !contextMinimized && contextContent) {
      if (drawingActivityTimeoutRef.current) {
        clearTimeout(drawingActivityTimeoutRef.current);
      }

      drawingActivityTimeoutRef.current = setTimeout(async () => {
        setContextMinimized(true);
        if (userId) {
          await contextServiceRef.current.updateMinimized(userId, true);
        }
      }, 3000);
    }

    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Canvas analysis and Runware annotation disabled for now
    // Infrastructure kept in place for future use
    /*
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
    */
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

  const handleContextClose = async () => {
    setContextVisible(false);
    if (userId) {
      await contextServiceRef.current.updateVisibility(userId, false);
    }
  };

  const handleContextToggleMinimize = async () => {
    const newMinimized = !contextMinimized;
    setContextMinimized(newMinimized);
    if (userId) {
      await contextServiceRef.current.updateMinimized(userId, newMinimized);
    }
  };

  const handleContextPositionChange = (x: number, y: number) => {
    setContextPosition({ x, y });

    if (positionUpdateTimeoutRef.current) {
      clearTimeout(positionUpdateTimeoutRef.current);
    }

    positionUpdateTimeoutRef.current = setTimeout(async () => {
      if (userId) {
        await contextServiceRef.current.updatePosition(userId, x, y);
      }
    }, 500);
  };

  return (
    <div className="h-screen flex flex-col relative bg-slate-50">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg shadow-md border border-slate-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="font-medium">Back</span>
      </button>

      <div className="flex-1 overflow-hidden relative">
        <Whiteboard
          ref={whiteboardRef}
          onCanvasUpdate={handleCanvasUpdate}
          backgroundImageUrl={backgroundImageUrl}
          questionText={currentQuestionText}
          isListening={isListening}
          isSpeaking={isSpeaking}
          onToggleListening={handleToggleListening}
          onToggleSpeaking={handleToggleSpeaking}
        />
      </div>

      <AIContextWindow
        content={contextContent}
        isVisible={contextVisible}
        isMinimized={contextMinimized}
        position={contextPosition}
        transparency={contextTransparency}
        onClose={handleContextClose}
        onToggleMinimize={handleContextToggleMinimize}
        onPositionChange={handleContextPositionChange}
      />

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

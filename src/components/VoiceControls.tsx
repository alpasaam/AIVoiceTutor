import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListening: () => void;
  onToggleSpeaking: () => void;
}

export function VoiceControls({
  isListening,
  isSpeaking,
  onToggleListening,
  onToggleSpeaking,
}: VoiceControlsProps) {
  return (
    <div className="absolute top-4 right-4 flex items-center space-x-4 z-10">
      {/* Voice Output Toggle */}
      <button
        onClick={onToggleSpeaking}
        className="flex items-center space-x-3 group"
      >
        <div
          className={`relative w-16 h-8 rounded-full transition-all duration-300 ease-in-out shadow-lg ${
            isSpeaking
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-slate-400 hover:bg-slate-500'
          }`}
        >
          {/* Toggle Circle */}
          <div
            className={`absolute top-1 flex items-center justify-center w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out ${
              isSpeaking ? 'translate-x-9' : 'translate-x-1'
            }`}
          >
            {isSpeaking ? (
              <Volume2 className="w-4 h-4 text-green-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-600" />
            )}
          </div>
        </div>
        <span className="text-white font-medium text-sm">
          {isSpeaking ? 'Voice On' : 'Voice Off'}
        </span>
      </button>

      {/* Voice Input Toggle */}
      <button
        onClick={onToggleListening}
        className="flex items-center space-x-3 group"
      >
        <div
          className={`relative w-16 h-8 rounded-full transition-all duration-300 ease-in-out shadow-lg ${
            isListening
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {/* Toggle Circle */}
          <div
            className={`absolute top-1 flex items-center justify-center w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ease-in-out ${
              isListening ? 'translate-x-9' : 'translate-x-1'
            } ${isListening ? 'animate-pulse' : ''}`}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-red-600" />
            ) : (
              <Mic className="w-4 h-4 text-blue-600" />
            )}
          </div>
        </div>
        <span className="text-white font-medium text-sm">
          {isListening ? 'Stop Voice' : 'Start Voice'}
        </span>
      </button>
    </div>
  );
}

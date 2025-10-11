import { useState, useEffect } from 'react';
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
    <div className="absolute top-4 right-4 flex items-center space-x-3 z-10">
      <button
        onClick={onToggleSpeaking}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium shadow-lg transition ${
          isSpeaking
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-slate-600 text-white hover:bg-slate-700'
        }`}
      >
        {isSpeaking ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        <span>{isSpeaking ? 'Voice On' : 'Voice Off'}</span>
      </button>

      <button
        onClick={onToggleListening}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium shadow-lg transition ${
          isListening
            ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        <span>{isListening ? 'Stop Listening' : 'Start Voice'}</span>
      </button>
    </div>
  );
}

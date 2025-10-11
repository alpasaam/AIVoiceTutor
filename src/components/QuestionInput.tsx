import { useState } from 'react';
import { Upload, Send, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

interface QuestionInputProps {
  onSubmit: (question: string, imageUrl?: string) => void;
  disabled?: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onToggleListening: () => void;
  onToggleSpeaking: () => void;
}

export function QuestionInput({ onSubmit, disabled = false, isListening, isSpeaking, onToggleListening, onToggleSpeaking }: QuestionInputProps) {
  const [questionText, setQuestionText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'text' | 'image'>('text');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setInputMode('image');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (inputMode === 'text' && questionText.trim()) {
      onSubmit(questionText);
      setQuestionText('');
    } else if (inputMode === 'image' && imagePreview) {
      onSubmit(questionText || 'Please help me solve this problem from the image', imagePreview);
      setImagePreview(null);
      setQuestionText('');
    }
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setInputMode('text');
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4">
      <div className="max-w-4xl mx-auto">
        {imagePreview && (
          <div className="mb-4 relative inline-block">
            <img
              src={imagePreview}
              alt="Question preview"
              className="max-h-32 rounded-lg border-2 border-slate-200"
            />
            <button
              onClick={handleClearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-start space-x-3">
          <div className="flex-1">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={
                imagePreview
                  ? 'Add additional context (optional)...'
                  : 'Type here. Press Enter to submit and Shift+Enter for new line.'
              }
              disabled={disabled}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex space-x-2">
            <div className="flex flex-col space-y-2">
              <label className="flex items-center justify-center w-12 h-12 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer transition disabled:opacity-50">
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={disabled}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSubmit}
                disabled={disabled || (!questionText.trim() && !imagePreview)}
                className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col space-y-2">
              {/* Voice Output Toggle */}
              <button
                onClick={onToggleSpeaking}
                className={`relative w-32 h-12 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center font-medium text-sm text-white ${
                  isSpeaking
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-slate-400 hover:bg-slate-500'
                }`}
              >
                <span className="absolute left-3">
                  {isSpeaking ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </span>
                <span>{isSpeaking ? 'Voice On' : 'Voice Off'}</span>
              </button>

              {/* Voice Input Toggle */}
              <button
                onClick={onToggleListening}
                className={`relative w-32 h-12 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center font-medium text-sm text-white ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                } ${isListening ? 'animate-pulse' : ''}`}
              >
                <span className="absolute left-3">
                  {isListening ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </span>
                <span>{isListening ? 'Stop Voice' : 'Start Voice'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Volume2, Sliders, Save, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type UserSettings = Database['public']['Tables']['user_settings']['Row'];

interface SettingsPageProps {
  settings: UserSettings | null;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<{ error?: any }>;
}

const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Default)', description: 'Warm and encouraging' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm and professional' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong and confident' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded and articulate' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Young and energetic' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep and engaging' },
];

const PUSHINESS_LEVELS = [
  { value: 1, label: 'Minimal Guidance', description: 'Only provides hints when asked' },
  { value: 2, label: 'Light Support', description: 'Offers occasional guidance' },
  { value: 3, label: 'Balanced Approach', description: 'Proactive but lets you think' },
  { value: 4, label: 'Active Coaching', description: 'Frequently checks and guides' },
  { value: 5, label: 'Maximum Support', description: 'Step-by-step detailed help' },
];

export function SettingsPage({ settings, onUpdateSettings }: SettingsPageProps) {
  const [selectedVoiceId, setSelectedVoiceId] = useState(settings?.voice_id || 'EXAVITQu4vr4xnSDxMaL');
  const [pushinessLevel, setPushinessLevel] = useState(settings?.ai_pushiness_level || 3);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setSelectedVoiceId(settings.voice_id);
      setPushinessLevel(settings.ai_pushiness_level);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const selectedVoice = ELEVENLABS_VOICES.find((v) => v.id === selectedVoiceId);

    const { error } = await onUpdateSettings({
      voice_id: selectedVoiceId,
      voice_name: selectedVoice?.name || 'Sarah (Default)',
      ai_pushiness_level: pushinessLevel,
    });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  };

  const hasChanges =
    settings?.voice_id !== selectedVoiceId || settings?.ai_pushiness_level !== pushinessLevel;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h2 className="text-3xl font-bold text-white mb-2">Tutor Settings</h2>
            <p className="text-blue-100">Customize your AI tutoring experience</p>
          </div>

          <div className="p-8 space-y-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Volume2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">Voice Selection</h3>
                  <p className="text-sm text-slate-600">Choose the voice for your AI tutor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ELEVENLABS_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoiceId(voice.id)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      selectedVoiceId === voice.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800">{voice.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{voice.description}</p>
                      </div>
                      {selectedVoiceId === voice.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Sliders className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">AI Guidance Level</h3>
                  <p className="text-sm text-slate-600">How hands-on should your tutor be?</p>
                </div>
              </div>

              <div className="space-y-3">
                {PUSHINESS_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setPushinessLevel(level.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition ${
                      pushinessLevel === level.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800">{level.label}</span>
                          <span className="text-xs font-medium text-slate-500">Level {level.value}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{level.description}</p>
                      </div>
                      {pushinessLevel === level.value && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold transition ${
                  !hasChanges || saving
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : saved
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Settings Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your AI tutor will use the selected voice to communicate with you verbally</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>The guidance level determines how proactive the tutor is in helping you</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Lower levels give you more independence to solve problems on your own</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Higher levels provide more frequent hints and step-by-step guidance</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

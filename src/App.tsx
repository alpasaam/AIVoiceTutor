import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { WhiteboardPage } from './components/WhiteboardPage';

interface UserSettings {
  voice_id: string;
  voice_name: string;
  ai_pushiness_level: number;
}

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const handleStart = (voiceId: string, voiceName: string, pushinessLevel: number) => {
    setSettings({
      voice_id: voiceId,
      voice_name: voiceName,
      ai_pushiness_level: pushinessLevel,
    });
    setHasStarted(true);
  };

  if (!hasStarted || !settings) {
    return <LandingPage onStart={handleStart} />;
  }

  return <WhiteboardPage settings={settings} />;
}

export default App;

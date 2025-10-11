import { sanitizeTextForSpeech } from '../utils/textSanitizer';

interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
}

interface TextToSpeechOptions {
  text: string;
  voiceId: string;
}

export class ElevenLabsService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async textToSpeech({ text, voiceId }: TextToSpeechOptions): Promise<Blob> {
    const sanitizedText = sanitizeTextForSpeech(text);
    console.log('🔊 ElevenLabs: Converting text to speech...', {
      voiceId,
      originalLength: text.length,
      sanitizedLength: sanitizedText.length
    });
    console.log('📝 Original text:', text.substring(0, 100) + '...');
    console.log('✨ Sanitized text:', sanitizedText.substring(0, 100) + '...');
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: sanitizedText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ElevenLabs API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`ElevenLabs API error (${response.status}): ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('✓ ElevenLabs: Audio generated successfully', { size: blob.size });
      return blob;
    } catch (error: any) {
      console.error('❌ ElevenLabs textToSpeech failed:', error);
      throw new Error(`Failed to convert text to speech: ${error.message}`);
    }
  }

  async speak(text: string, voiceId: string): Promise<void> {
    console.log('🔊 ElevenLabs: Starting speech playback...');
    try {
      const audioBlob = await this.textToSpeech({ text, voiceId });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('✓ ElevenLabs: Playback finished');
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (event) => {
          console.error('❌ ElevenLabs: Audio playback error:', event);
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };
        audio.play().catch((playError) => {
          console.error('❌ ElevenLabs: Failed to start playback:', playError);
          URL.revokeObjectURL(audioUrl);
          reject(playError);
        });
      });
    } catch (error: any) {
      console.error('❌ ElevenLabs speak failed:', error);
      throw new Error(`Failed to speak: ${error.message}`);
    }
  }

  async getVoices() {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

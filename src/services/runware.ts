interface RunwareConfig {
  apiKey: string;
}

interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
}

export class RunwareService {
  private apiKey: string;
  private baseUrl = 'https://api.runware.ai/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage({ prompt, width = 512, height = 512 }: ImageGenerationOptions): Promise<string> {
    console.log('🎨 Runware: Generating image...', { width, height });
    try {
      const response = await fetch(`${this.baseUrl}/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          model: 'stable-diffusion-v1-5',
          num_images: 1,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Runware API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(`Runware API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🎨 Runware response:', data);

      if (data.images && data.images.length > 0) {
        console.log('✓ Runware: Image generated successfully');
        return data.images[0].url;
      }

      console.error('❌ Runware: No images in response');
      throw new Error('No image generated');
    } catch (error: any) {
      console.error('❌ Runware generateImage failed:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  async drawOnCanvas(instruction: string, currentCanvasDataUrl?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/image/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        instruction,
        image: currentCanvasDataUrl,
        model: 'stable-diffusion-v1-5',
      }),
    });

    if (!response.ok) {
      throw new Error(`Runware API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.images && data.images.length > 0) {
      return data.images[0].url;
    }

    throw new Error('No image generated');
  }
}

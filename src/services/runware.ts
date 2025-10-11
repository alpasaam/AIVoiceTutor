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
    const requestBody = {
      taskType: 'imageInference',
      taskUUID: crypto.randomUUID(),
      model: 'runware:100@1',
      positivePrompt: prompt,
      width,
      height,
      numberResults: 1,
      outputType: 'URL',
    };

    console.log('🎨 Runware: Generating image...', {
      width,
      height,
      promptLength: prompt.length,
      apiUrl: `${this.baseUrl}`,
      requestBody,
    });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify([requestBody]),
      });

      console.log('🎨 Runware response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Runware API error:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestSent: requestBody,
        });
        throw new Error(`Runware API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('🎨 Runware full response:', data);

      if (Array.isArray(data) && data.length > 0 && data[0].imageURL) {
        console.log('✓ Runware: Image generated successfully');
        return data[0].imageURL;
      }

      if (data.images && data.images.length > 0) {
        console.log('✓ Runware: Image generated successfully (legacy format)');
        return data.images[0].url;
      }

      console.error('❌ Runware: Unexpected response format:', data);
      throw new Error('No image URL in response');
    } catch (error: any) {
      console.error('❌ Runware generateImage failed:', {
        error,
        message: error?.message,
        stack: error?.stack,
      });
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

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
      console.log('🎨 Runware full response:', JSON.stringify(data, null, 2));

      // Format 1: Nested in data array (current Runware format)
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const imageUrl = data.data[0].imageURL || data.data[0].imageSrc || data.data[0].url;
        if (imageUrl) {
          console.log('✓ Runware: Image generated successfully');
          return imageUrl;
        }
      }

      // Format 2: Direct array with imageURL
      if (Array.isArray(data) && data.length > 0) {
        if (data[0].imageURL) {
          console.log('✓ Runware: Image generated successfully (array format)');
          return data[0].imageURL;
        }
        if (data[0].imageSrc) {
          console.log('✓ Runware: Image generated successfully (array imageSrc)');
          return data[0].imageSrc;
        }
        if (data[0].url) {
          console.log('✓ Runware: Image generated successfully (array url)');
          return data[0].url;
        }
      }

      // Format 3: Direct object with image data
      if (data.imageURL) {
        console.log('✓ Runware: Image generated successfully (direct imageURL)');
        return data.imageURL;
      }

      if (data.imageSrc) {
        console.log('✓ Runware: Image generated successfully (direct imageSrc)');
        return data.imageSrc;
      }

      // Format 4: Legacy format
      if (data.images && data.images.length > 0) {
        console.log('✓ Runware: Image generated successfully (legacy format)');
        return data.images[0].url || data.images[0].imageURL;
      }

      console.error('❌ Runware: Unexpected response format. Full response:', data);
      console.error('Available keys:', Object.keys(data));
      if (Array.isArray(data) && data.length > 0) {
        console.error('First item keys:', Object.keys(data[0]));
      }
      throw new Error('No image URL in response. Check console for details.');
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

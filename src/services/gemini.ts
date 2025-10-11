interface GeminiConfig {
  apiKey: string;
}

interface Message {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

export class GeminiService {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeImage(imageDataUrl: string, question?: string): Promise<string> {
    const base64Data = imageDataUrl.split(',')[1];
    const mimeType = imageDataUrl.split(';')[0].split(':')[1];

    const prompt = question
      ? `The student has submitted this image with the following question: "${question}". Please analyze the image and identify what mathematical problem or concept is being shown. Provide a clear description of what you see.`
      : 'Please analyze this image and identify what mathematical problem or concept is being shown. Provide a clear description of what you see.';

    const response = await fetch(
      `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async chat(messages: Message[], systemPrompt: string): Promise<string> {
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      ...messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
      })),
    ];

    const response = await fetch(
      `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async analyzeCanvasForProblem(canvasDataUrl: string): Promise<string> {
    const base64Data = canvasDataUrl.split(',')[1];

    const response = await fetch(
      `${this.baseUrl}/models/gemini-2.0-flash-exp:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Analyze this whiteboard canvas. Describe any mathematical problems, equations, diagrams, or work that you see. If there is student work visible, describe their progress and any errors you notice.',
                },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
}

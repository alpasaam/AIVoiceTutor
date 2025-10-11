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
    console.log('🔍 Gemini: Analyzing image...');
    try {
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
        const errorText = await response.text();
        console.error('❌ Gemini API error:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Gemini: Unexpected response format:', data);
        throw new Error('Gemini returned unexpected response format');
      }

      console.log('✓ Gemini: Image analyzed successfully');
      return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      console.error('❌ Gemini analyzeImage failed:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
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
    console.log('🔍 Gemini: Analyzing canvas work...');
    try {
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
                    text: 'You are an expert math tutor analyzing a student\'s whiteboard work. Look at this image and identify:\n1. What problem they are working on\n2. What steps they have completed\n3. Any errors or mistakes in their work\n4. What would be helpful to circle, highlight, or annotate\n\nBe specific about WHERE errors are (e.g., "in step 2 on the left side") and WHAT is wrong. If the work is correct, say so clearly.',
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
        const errorText = await response.text();
        console.error('❌ Gemini API error:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error('❌ Gemini: Unexpected response format:', data);
        throw new Error('Gemini returned unexpected response format');
      }

      console.log('✓ Gemini: Canvas analyzed successfully');
      return data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      console.error('❌ Gemini analyzeCanvasForProblem failed:', error);
      throw new Error(`Failed to analyze canvas: ${error.message}`);
    }
  }

  async decideHelpfulAnnotations(canvasAnalysis: string, originalQuestion: string): Promise<string> {
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
                  text: `You are a helpful math tutor. Based on this analysis of a student's work:\n\n"${canvasAnalysis}"\n\nFor the problem: "${originalQuestion}"\n\nWhat visual annotations would be most helpful? Describe specific things to circle in red, checkmarks to add in green, or hints to write in blue. Be concrete and specific about what to annotate and why.`,
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

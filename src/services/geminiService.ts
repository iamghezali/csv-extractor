import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    throw new Error('API_KEY environment variable not set.');
}
const ai = new GoogleGenAI({ apiKey: apiKey });

export const extractData = async (
    prompt: string,
): Promise<string | undefined> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.1,
                topP: 0.9,
            },
        });

        return response.text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);

        const customError = new Error(
            'Failed to extract data from Gemini API.',
        );

        (customError as any).rawOutput =
            error instanceof Error ? error.message : String(error);
        throw customError;
    }
};

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY ?? '';
const genai = new GoogleGenerativeAI(apiKey);

async function main() {
  console.log('Testing Gemini API key:', apiKey.substring(0, 5) + '...');
  if (!apiKey) {
    console.error('No Gemini API key found in process.env');
    return;
  }
  
  try {
    const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent("Hello! Are you working? Answer with 'YES' if so.");
    console.log('Response:', result.response.text());
  } catch (err: any) {
    console.error('Gemini Error:', err.message);
  }
}

main().catch(console.error).finally(() => process.exit());

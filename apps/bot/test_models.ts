import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY ?? '';
const genai = new GoogleGenerativeAI(apiKey);

async function main() {
  console.log('Testing with API Key:', apiKey.substring(0, 5) + '...');
  
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'];
  
  for (const modelName of models) {
    try {
      const model = genai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hi");
      console.log(`Model ${modelName}: SUCCESS - ${result.response.text().trim()}`);
    } catch (err: any) {
      console.log(`Model ${modelName}: FAILED - ${err.message}`);
    }
  }
}

main().catch(console.error).finally(() => process.exit());

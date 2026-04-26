
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function testModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const candidates = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-flash-latest",
    "gemini-pro-latest"
  ];

  console.log("Testing candidate models for quota availability...");
  
  for (const modelName of candidates) {
    try {
      console.log(`\n--- Testing ${modelName} ---`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Respond with 'OK' if you can hear me.");
      console.log(`✅ ${modelName} is available and quota is OK.`);
      console.log(`Response: ${result.response.text()}`);
    } catch (error) {
      if (error.message.includes("quota") || error.message.includes("429")) {
        console.log(`❌ ${modelName}: Quota exceeded.`);
      } else if (error.message.includes("404") || error.message.includes("not found")) {
        console.log(`❌ ${modelName}: Model not found.`);
      } else {
        console.log(`❌ ${modelName}: Error - ${error.message}`);
      }
    }
  }
}

testModels();

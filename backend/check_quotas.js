
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const modelsToTest = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b"
];

async function testModels() {
  console.log("Testing Model Quotas...");
  console.log("=======================");

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("ping");
      const text = result.response.text();
      console.log(`✅ ${modelName}: SUCCESS (Quota OK)`);
    } catch (err) {
      if (err.message.includes("429")) {
        console.log(`❌ ${modelName}: 429 (Quota Exceeded)`);
      } else if (err.message.includes("404")) {
         console.log(`❌ ${modelName}: 404 (Model Not Found)`);
      } else {
        console.log(`❌ ${modelName}: ERROR - ${err.message}`);
      }
    }
  }
}

testModels();

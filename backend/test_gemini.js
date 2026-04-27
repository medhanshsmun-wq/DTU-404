import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite-preview";

async function test() {
  try {
    console.log(`Testing model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, are you working?");
    console.log("Response:", result.response.text());
    console.log("✅ API is working perfectly.");
  } catch (error) {
    console.error("❌ API Test Failed:", error.message);
  }
}

test();

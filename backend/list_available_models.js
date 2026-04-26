
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    
    console.log("Available Gemini Models:");
    console.log("========================");
    
    if (data.models && data.models.length > 0) {
      data.models.forEach(model => {
        console.log(`- Name: ${model.name}`);
        console.log(`  Display Name: ${model.displayName}`);
        console.log(`  Description: ${model.description}`);
        console.log(`  Capabilities: ${model.supportedGenerationMethods.join(", ")}`);
        console.log("------------------------");
      });
    } else {
      console.log("No models found.");
    }
  } catch (error) {
    console.error("Failed to list models:", error.message);
  }
}

listAllModels();

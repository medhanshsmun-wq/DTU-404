import "dotenv/config";

async function listModels() {
  try {
    const key = process.env.GEMINI_API_KEY.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      data.models.forEach(m => console.log(m.name));
    } else {
      console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}

listModels();

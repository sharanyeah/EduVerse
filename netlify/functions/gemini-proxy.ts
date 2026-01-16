
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // Security: Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { model, contents, config } = JSON.parse(event.body);
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "API_KEY_MISSING_ON_SERVER" }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Call Gemini through the official SDK on the server
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "GENERATION_FAILED", 
        message: error.message 
      }),
    };
  }
};

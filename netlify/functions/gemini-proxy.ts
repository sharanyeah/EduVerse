
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // CORS Headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    const { model, contents, config } = JSON.parse(event.body || "{}");
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("Critical: API_KEY is missing in Netlify environment variables.");
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ error: "API_KEY_MISSING_ON_SERVER", message: "Set API_KEY in Netlify Environment Variables" }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Call Gemini
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    if (!response || !response.text) {
      throw new Error("Empty response from Gemini API");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "GENERATION_FAILED", 
        message: error.message || "Unknown error during generation" 
      }),
    };
  }
};

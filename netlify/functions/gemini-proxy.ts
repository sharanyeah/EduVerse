
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
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
    
    // Check for both common variations of the key name
    const apiKey = process.env.API_KEY || process.env.VITE_API_KEY;

    if (!apiKey) {
      console.error("[PROX_FAIL] API_KEY environment variable is missing.");
      console.log("[PROX_DEBUG] Available keys:", Object.keys(process.env).filter(k => k.includes('API')));
      
      return { 
        statusCode: 500, 
        headers,
        body: JSON.stringify({ 
          error: "API_KEY_MISSING_ON_SERVER", 
          message: "The Gemini API key is missing on the Netlify server. Please set 'API_KEY' in Site Configuration > Environment Variables." 
        }) 
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents,
      config
    });

    if (!response || !response.text) {
      throw new Error("No text returned from Gemini API");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: response.text }),
    };
  } catch (error: any) {
    console.error("[PROX_ERROR]", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "GENERATION_FAILED", 
        message: error.message || "Unknown proxy error" 
      }),
    };
  }
};

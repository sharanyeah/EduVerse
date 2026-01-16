import { GoogleGenAI } from "@google/genai";

const DEFAULT_SYSTEM_PROMPT = `
You are DeepTutor, an academic document processing engine.
Priorities: speed, academic rigor, progressive generation.
All answers must be grounded in the provided document.
Use LaTeX $$ for all mathematical expressions.
`;

const SUPPORTED_INLINE_MIMES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "GEMINI_API_KEY is not configured on the server",
      }),
    };
  }

  try {
    const {
      prompt,
      attachment,
      history = [],
      modelType = "flash",
      responseType,
      useSearch,
      system,
    } = JSON.parse(event.body || "{}");

    const ai = new GoogleGenAI({ apiKey });

    const model =
      modelType === "pro"
        ? "gemini-3-pro-preview"
        : "gemini-3-flash-preview";

    const contents: any[] = history.map((m: any) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    let finalPrompt = prompt;

    // Handle document attachment
    if (attachment?.data && attachment?.mimeType) {
      const mime = attachment.mimeType;

      // Text-based files → embed directly
      if (
        mime === "text/plain" ||
        mime === "text/markdown" ||
        mime === "application/json"
      ) {
        const decoded = Buffer.from(attachment.data, "base64").toString("utf-8");
        finalPrompt =
          `[DOCUMENT CONTEXT START]\n${decoded}\n[DOCUMENT CONTEXT END]\n\n` +
          prompt;
      }
      // Supported binaries → inlineData
      else if (SUPPORTED_INLINE_MIMES.includes(mime)) {
        contents.push({
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: attachment.data,
                mimeType: mime,
              },
            },
          ],
        });
      }
      // Unsupported binaries (PPT, etc.)
      else {
        finalPrompt =
          `[NOTE: Binary file "${attachment.name}" cannot be parsed directly.]\n\n` +
          prompt;
      }
    }

    // Normal text-only prompt
    if (
      !contents.length ||
      contents[contents.length - 1]?.parts?.[0]?.text !== finalPrompt
    ) {
      contents.push({
        role: "user",
        parts: [{ text: finalPrompt }],
      });
    }

    const config: any = {
      systemInstruction: system || DEFAULT_SYSTEM_PROMPT,
      temperature: 0.1,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (responseType === "json") {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: response.text || "",
      }),
    };
  } catch (err: any) {
    console.error("Gemini Function Error:", err);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: err.message || "Internal AI processing error",
      }),
    };
  }
};

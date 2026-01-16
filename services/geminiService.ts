
import { GoogleGenAI } from "@google/genai";
import { CourseSection, Message, FileAttachment, LearningResource, PracticeQuestion, ScheduleItem, McqReview } from "../types";

const DEEPTUTOR_SYSTEM_PROMPT = `You are DeepTutor, a production-grade academic learning engine. 
You convert documents into structured learning workspaces using STRICT RAG. 
Retrieve ONLY from the provided context. Output strictly valid JSON. 
Priority: Speed and structural integrity.`;

class DeepTutorEngine {
  private ai: GoogleGenAI | null = null;

  private isProduction() {
    // Safely check for window to prevent crashes in Node.js environments like Netlify Functions
    if (typeof window === 'undefined') return true; 
    
    return window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1' &&
           !window.location.hostname.includes('webcontainer-api.io');
  }

  private getAi() {
    if (!this.ai) {
      const key = process.env.API_KEY;
      if (!key) throw new Error("API_KEY_MISSING");
      this.ai = new GoogleGenAI({ apiKey: key });
    }
    return this.ai;
  }

  private repairJson(text: string): string {
    let cleaned = text.replace(/```json\s*|```/g, "").trim();
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const lastValidChar = Math.max(lastBrace, lastBracket);
    if (lastValidChar !== -1) {
      return cleaned.substring(0, lastValidChar + 1);
    }
    return cleaned;
  }

  private sanitizeJson(text: string): any {
    try {
      const repaired = this.repairJson(text);
      return JSON.parse(repaired);
    } catch (e) {
      console.error("JSON Error:", text.substring(0, 100));
      return null;
    }
  }

  async generate(params: any) {
    const modelName = params.isInitialScan ? 'gemini-flash-lite-latest' : 'gemini-3-flash-preview';
    
    // PREPARE CONTENTS
    const contents: any[] = (params.history || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    const promptParts: any[] = [{ text: params.prompt }];
    
    const attachment = params.attachment as FileAttachment | undefined;
    if (attachment && attachment.data && typeof attachment.data === 'string') {
      const data: string = attachment.data;
      const mime: string = attachment.mimeType;
      const name: string = attachment.name;

      if (params.isInitialScan && mime === 'application/pdf') {
        promptParts[0].text = `Seed Document: "${name}"\nType: Academic Archive\n\n${params.prompt}`;
      } else if (mime.startsWith('text/')) {
        // Environment-safe base64 decoding
        const decoded = typeof atob === 'function' 
          ? atob(data) 
          : Buffer.from(data, 'base64').toString('utf-8');
          
        promptParts[0].text = `[DOC_CONTEXT]\n${decoded.substring(0, 30000)}\n[/DOC_CONTEXT]\n\n${params.prompt}`;
      } else {
        promptParts.push({ inlineData: { data, mimeType: mime } });
      }
    }

    contents.push({ role: 'user', parts: promptParts });

    const config: any = {
      systemInstruction: params.system || DEEPTUTOR_SYSTEM_PROMPT,
      temperature: 0.1,
      maxOutputTokens: params.maxTokens || 4096,
      responseMimeType: "application/json"
    };

    if (params.useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // PRODUCTION PROXY LOGIC
    if (this.isProduction()) {
      try {
        const response = await fetch('/.netlify/functions/gemini-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName, contents, config })
        });
        if (!response.ok) throw new Error("PROXY_REQUEST_FAILED");
        const result = await response.json();
        return this.sanitizeJson(result.text);
      } catch (e) {
        console.error("Production Proxy Error, attempting direct fallback (if key exists)...", e);
        const ai = this.getAi();
        const response = await ai.models.generateContent({ model: modelName, contents, config });
        return this.sanitizeJson(response.text);
      }
    } else {
      // DEV MODE: Direct call
      const ai = this.getAi();
      const response = await ai.models.generateContent({ model: modelName, contents, config });
      return this.sanitizeJson(response.text);
    }
  }
}

const engine = new DeepTutorEngine();

export const handleAIError = (error: any): string => {
  console.error("DeepTutor Service Error:", error);
  return "Neural sync disrupted. Adjusting cognitive parameters...";
};

export const getDocumentStructure = async (attachment: FileAttachment) => {
  const prompt = `Deconstruct "${attachment.name}" into exactly 6 broad study units.
  JSON Array: [{"title": "Informative Unit Title", "summary": "Goal"}]`;
  
  const result = await engine.generate({ 
    prompt, 
    attachment, 
    isInitialScan: true,
    maxTokens: 800 
  });
  return result || [];
};

export const synthesizeUnitWorkspace = async (section: CourseSection, attachment: FileAttachment) => {
  const prompt = `Using ONLY document context for unit "${section.title}", generate a COMPLETE workspace.
  BE CONCISE to avoid server timeouts.
  
  1. "detailedSummary": Sophisticated overview (3 sentences max).
  2. "content": Core Markdown theory (Rich formatting).
  3. "definitions": 5 key {term, definition}.
  4. "lexicon": 5 domain words {word, meaning}.
  5. "axioms": 2 logical principles {label, expression} in LaTeX $$.
  6. "mindmap": Mermaid mindmap syntax.
  7. "flashcards": EXACTLY 5 {question, answer}.
  8. "questions": EXACTLY 5 MCQs {question, options, correctIndex, explanation}.
  9. "difficulty": "Beginner" | "Intermediate" | "Advanced".
  10. "resources": EXACTLY 5 authoritative search links {title, url, reason, platform, type}.
  
  Schema:
  {
    "detailedSummary": string,
    "content": string,
    "definitions": [],
    "lexicon": [],
    "axioms": [],
    "mindmap": string,
    "flashcards": [],
    "questions": [],
    "difficulty": string,
    "resources": []
  }`;

  const data = await engine.generate({ 
    prompt, 
    attachment, 
    useSearch: true,
    maxTokens: 4000 
  });

  if (!data) throw new Error("Synthesis malformed");

  return {
    detailedSummary: data.detailedSummary || '',
    content: data.content || '',
    keyTerms: data.definitions || [],
    lexicon: data.lexicon || [],
    formulas: data.axioms || [],
    mindmap: data.mindmap || '',
    flashcards: (data.flashcards || []).slice(0, 5).map((f: any) => ({
      id: crypto.randomUUID(),
      ...f,
      masteryStatus: 'learning',
      failureCount: 0,
      difficulty: 'medium'
    })),
    practiceQuestions: (data.questions || []).slice(0, 5).map((q: any) => ({
      id: crypto.randomUUID(),
      ...q,
      hasBeenAnswered: false,
      difficultyLevel: 3
    })),
    difficultyLevel: data.difficulty || 'Intermediate',
    resources: data.resources || [],
    isSynthesized: true
  };
};

export const evaluateMcqResponse = async (question: PracticeQuestion, selectedIndex: number, section: CourseSection, attachment: FileAttachment): Promise<McqReview> => {
  const prompt = `DIAGNOSTIC EXAM REVIEW for: ${section.title}.
  Analyze why user picked ${question.options[selectedIndex]} vs correct ${question.options[question.correctIndex]}.
  
  JSON:
  {
    "isCorrect": boolean,
    "verdict": "Correct" | "Incorrect",
    "whyUserChoiceIsCorrectOrWrong": string,
    "correctAnswerExplanation": string,
    "misconceptionDetected": string,
    "conceptsToReview": string[],
    "examTip": string,
    "addToReviewQueue": boolean
  }`;

  const result = await engine.generate({ prompt, attachment, maxTokens: 1200 });
  return result || {
    isCorrect: selectedIndex === question.correctIndex,
    verdict: selectedIndex === question.correctIndex ? "Correct" : "Incorrect",
    whyUserChoiceIsCorrectOrWrong: "Result based on archive grounding.",
    correctAnswerExplanation: question.explanation,
    misconceptionDetected: "None detected.",
    conceptsToReview: [],
    examTip: "Refer back to theory segment.",
    addToReviewQueue: true
  };
};

export const chatWithTutor = async (history: Message[], currentSection: CourseSection, userInput: string) => {
  const prompt = `Tutoring on: ${currentSection.title}. User: "${userInput}". Be a Socratic tutor. 
  JSON: { "text": "...", "groundingScore": number }`;
  return await engine.generate({ prompt, history, maxTokens: 1000 });
};

export const generateStudySchedule = async (subject: string, concepts: CourseSection[]) => {
  const prompt = `Detailed itinerary for: ${subject}.\nJSON Array: [{title, durationMinutes, focus}]`;
  const result = await engine.generate({ prompt, maxTokens: 800 });
  return result || [];
};

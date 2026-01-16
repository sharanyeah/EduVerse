
export interface KeyTerm {
  term: string;
  definition: string;
}

export interface LexiconItem {
  word: string;
  meaning: string;
}

export interface Formula {
  expression: string;
  label: string;
}

export interface LearningResource {
  title: string;
  type: "video" | "article" | "course" | "documentation";
  platform: string;
  url: string;
  reason: string;
  score?: number;
}

export interface CourseSection {
  id: string;
  title: string;
  summary: string;
  detailedSummary: string;
  content: string; 
  keyTerms: KeyTerm[];
  lexicon: LexiconItem[];
  formulas: Formula[];
  mindmap: string; 
  sourceReference: string;
  status: 'locked' | 'in-progress' | 'completed';
  mastery: number; 
  chatHistory: Message[];
  flashcards: Flashcard[];
  practiceQuestions: PracticeQuestion[];
  resources?: LearningResource[];
  dependencies: string[];
  difficultyLevel?: string;
  isSynthesized?: boolean;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  isAiSuggested?: boolean;
  masteryStatus?: 'learning' | 'mastered';
  failureCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hasBeenAnswered?: boolean;
  wasCorrect?: boolean;
  difficultyLevel: number; // 1-5
  deepInsight?: McqReview;
}

export interface McqReview {
  isCorrect: boolean;
  verdict: "Correct" | "Incorrect";
  whyUserChoiceIsCorrectOrWrong: string;
  correctAnswerExplanation: string;
  misconceptionDetected: string;
  conceptsToReview: string[];
  examTip: string;
  addToReviewQueue: boolean;
}

export interface Concept extends CourseSection {}

export interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingScore?: number;
  isExternal?: boolean;
  citations?: { unit: string; source: string }[];
}

export interface Workspace {
  fileInfo: FileMetadata;
  subject: string;
  sections: CourseSection[];
  activeSectionIndex: number;
  attachment?: FileAttachment | null;
  coverageStats: {
    ingested: number;
    retained: number;
    validated: number;
  };
}

export interface FileMetadata {
  id: string;
  name: string;
  type: 'pdf' | 'ppt' | 'txt';
  uploadDate: string;
}

export interface FileAttachment {
  data: string; 
  mimeType: string;
  name: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  durationMinutes: number;
  focus: string;
}

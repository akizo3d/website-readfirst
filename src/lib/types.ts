export type Theme = 'dark' | 'light' | 'sepia';
export type UiLanguage = 'en' | 'pt-BR';

export interface ReaderSettings {
  theme: Theme;
  fontSize: number;
  lineHeight: number;
  maxWidthCh: number;
  paragraphSpacing: number;
  horizontalPadding: number;
  verticalPadding: number;
  letterSpacing: number;
  distractionFree: boolean;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export interface ParsedDocument {
  id: string;
  title: string;
  sourceLanguage: 'original' | 'pt-BR';
  html: string;
  headings: HeadingItem[];
  textChunks: string[];
}

export interface TranslationProviderConfig {
  provider: 'openai' | 'deepl';
  apiKey: string;
  model?: string;
}

export interface VisionCaptionConfig {
  apiKey: string;
  model: string;
}

export interface StudyFlashcard {
  front: string;
  back: string;
}

export interface StudyQuizItem {
  question: string;
  options?: string[];
  answer: string;
}

export interface SavedReading {
  id: string;
  userId: string;
  title: string;
  filename: string;
  createdAt: number;
  lastOpenedAt: number;
  tags: string[];
  originalHtml: string;
  translatedHtml?: string;
  enhancedHtml?: string;
  headings: HeadingItem[];
  enhancedHeadings?: HeadingItem[];
  textChunks: string[];
  progress: number;
  flashcards?: StudyFlashcard[];
  quiz?: StudyQuizItem[];
}

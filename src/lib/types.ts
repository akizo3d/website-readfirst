export type Theme = 'dark' | 'light' | 'sepia';

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

export interface TranslationChunk {
  index: number;
  original: string;
  translated: string;
}

export interface TranslationState {
  loading: boolean;
  progress: number;
  error?: string;
}

export interface TranslationProviderConfig {
  provider: 'openai' | 'deepl';
  apiKey: string;
  model?: string;
}


export interface InventoryItem {
  name: string;
  imageUrl: string;
}

export interface GeminiResponse {
  title: string;
  story: string;
  choices: string[];
  inventory: Array<{ name: string; imagePrompt: string }>;
  currentQuest: string;
  imagePrompt: string;
}

export interface StoryStep {
  id: string;
  story: string;
  imageUrl: string;
  choices: string[];
  inventory: InventoryItem[];
  currentQuest: string;
  choiceMade?: string;
}

export interface GameSession {
  id: string;
  title: string;
  prompt: string;
  bannerUrl: string;
  language: 'en' | 'es' | 'pt';
  history: StoryStep[];
  createdAt: number;
}

export type GameState = 'SESSION_SELECT' | 'PLAYING' | 'LOADING' | 'ERROR';

export enum Category {
  PLAYERS = 'PLAYERS',
  STADIUMS = 'STADIUMS',
  CLUBS = 'CLUBS',
  NATIONAL_TEAMS = 'NATIONAL_TEAMS',
  COACHES = 'COACHES',
  ALL = 'ALL'
}

export type Language = 'Bosanski' | 'English' | 'Deutsch';

export interface Question {
  id: string;
  category: Category;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty: number;
  explanation?: string;
}

export interface GameState {
  nickname: string;
  currentLevel: number;
  selectedCategory: Category;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  mistakes: number;
  isGameOver: boolean;
  language: Language;
  history: {
    questionId: string;
    isCorrect: boolean;
    timeTaken?: number;
  }[];
}

export interface LevelConfig {
  id: number;
  name: Record<Language, string>;
  minDifficulty: number;
  maxDifficulty: number;
  questionsPerLevel: number;
  unlocked: boolean;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  country: string;
  timestamp: number;
  isUser?: boolean;
}

export interface Achievement {
  id: string;
  icon: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  requirement: number;
  type: 'total_correct' | 'streak' | 'perfect_game' | 'level_completed' | 'category_mastery' | 'high_score';
  category?: Category;
}

export interface UserStats {
  totalPoints: number;
  totalCorrect: number;
  totalAnswered: number;
  maxStreak: number;
  levelsCompleted: number[];
  unlockedAchievements: string[];
  categoryCorrect: Record<string, number>;
  completedLevelCategories: Record<number, Category[]>;
}

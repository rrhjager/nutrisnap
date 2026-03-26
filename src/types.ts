import { NutritionInfo } from "./services/nutritionService";

export interface UserProfile {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  isGuest?: boolean;
  isPremium?: boolean;
  scansToday?: number;
  lastScanDate?: string;
  createdAt: number;
  dailyCalorieGoal?: number;
  dailyProteinGoal?: number;
  dailyCarbsGoal?: number;
  dailyFatGoal?: number;
  waterAmount?: number;
  hasCompletedOnboarding?: boolean;
  totalScans?: number;
  currentStreak?: number;
  longestStreak?: number;
  unlockedBadges?: string[];
}

export interface LogEntry extends NutritionInfo {
  id: string;
  userId: string;
  timestamp: number;
  isSynced?: boolean;
}

export interface ScanEntry extends NutritionInfo {
  id: string;
  userId: string;
  timestamp: number;
}

export interface SavedMeal extends NutritionInfo {
  id: string;
  userId: string;
  customName: string;
  createdAt: number;
}

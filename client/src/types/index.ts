// Centralized TypeScript Interfaces for Kaizen Tracker

export interface WaterLog {
    _id: string;
    amount: number; // in ml
    time: string;   // e.g. "08:30 AM"
    date: string;   // format "YYYY-MM-DD"
    createdAt?: string;
    updatedAt?: string;
}

export interface WeightLog {
    _id: string;
    weight: number; // in kg
    date: string;   // format "YYYY-MM-DD"
    createdAt?: string;
    updatedAt?: string;
}

export interface MealLog {
    _id: string;
    name: string;
    calories: number;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time: string;   // e.g. "12:45 PM"
    date: string;   // format "YYYY-MM-DD"
    createdAt?: string;
    updatedAt?: string;
}

export interface DailySummary {
    date: string;
    waterIntake: number;
    caloriesConsumed: number;
    weight: number | null;
    waterLogs: WaterLog[];
    meals: MealLog[];
}

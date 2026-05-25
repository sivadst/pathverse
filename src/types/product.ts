export type CareerTrackId = "ai-product-architect" | "full-stack-ai" | "growth-systems" | "creative-technologist";

export interface SkillSignal {
  readonly name: string;
  readonly current: number;
  readonly target: number;
  readonly velocity: number;
  readonly category: "AI" | "Product" | "Engineering" | "Design" | "Growth";
}

export interface RoadmapMilestone {
  readonly id: string;
  readonly week: number;
  readonly title: string;
  readonly outcome: string;
  readonly focus: readonly string[];
  readonly intensity: "foundation" | "ship" | "scale" | "mastery";
}

export interface AchievementBadge {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly unlocked: boolean;
}

export interface PlatformInsight {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly priority: "low" | "medium" | "high";
}

export interface UserGrowthProfile {
  readonly name: string;
  readonly headline: string;
  readonly targetTrack: CareerTrackId;
  readonly level: number;
  readonly xp: number;
  readonly streakDays: number;
  readonly weeklyFocusHours: number;
  readonly skills: readonly SkillSignal[];
  readonly milestones: readonly RoadmapMilestone[];
  readonly achievements: readonly AchievementBadge[];
  readonly insights: readonly PlatformInsight[];
}

export interface MentorMessage {
  readonly id: string;
  readonly role: "user" | "mentor";
  readonly content: string;
  readonly timestamp: number;
}

export interface ResumeAnalysis {
  readonly atsScore: number;
  readonly strengths: readonly string[];
  readonly risks: readonly string[];
  readonly rewritePlan: readonly string[];
}

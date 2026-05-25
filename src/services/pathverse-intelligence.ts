import type {
  CareerTrackId,
  PlatformInsight,
  ResumeAnalysis,
  RoadmapMilestone,
  SkillSignal,
  UserGrowthProfile
} from "@/src/types/product";

const trackLabels: Record<CareerTrackId, string> = {
  "ai-product-architect": "AI Product Architect",
  "full-stack-ai": "Full-stack AI Engineer",
  "growth-systems": "Growth Systems Strategist",
  "creative-technologist": "Creative Technologist"
};

const skillCatalog: readonly SkillSignal[] = [
  { name: "LLM Systems", current: 72, target: 94, velocity: 8, category: "AI" },
  { name: "Product Strategy", current: 81, target: 92, velocity: 5, category: "Product" },
  { name: "Frontend Craft", current: 78, target: 96, velocity: 7, category: "Design" },
  { name: "Backend Architecture", current: 68, target: 88, velocity: 6, category: "Engineering" },
  { name: "Growth Loops", current: 54, target: 82, velocity: 9, category: "Growth" },
  { name: "Data Storytelling", current: 63, target: 86, velocity: 6, category: "Product" }
];

export const defaultGrowthProfile: UserGrowthProfile = {
  name: "Alex Morgan",
  headline: "Building toward AI Product Architect",
  targetTrack: "ai-product-architect",
  level: 18,
  xp: 7420,
  streakDays: 23,
  weeklyFocusHours: 14,
  skills: skillCatalog,
  milestones: generateRoadmap("ai-product-architect", skillCatalog),
  achievements: [
    {
      id: "ship-week",
      title: "Shipping Rhythm",
      description: "Published three meaningful portfolio updates in one week.",
      unlocked: true
    },
    {
      id: "mentor-loop",
      title: "Mentor Loop",
      description: "Closed feedback cycles on roadmap, resume, and positioning.",
      unlocked: true
    },
    {
      id: "market-signal",
      title: "Market Signal",
      description: "Validated a project with measurable user demand.",
      unlocked: false
    }
  ],
  insights: buildInsights(skillCatalog, "ai-product-architect")
};

export function generateRoadmap(track: CareerTrackId, skills: readonly SkillSignal[]): readonly RoadmapMilestone[] {
  const largestGaps = [...skills]
    .sort((a, b) => b.target - b.current - (a.target - a.current))
    .slice(0, 4);

  return largestGaps.map((skill, index) => ({
    id: `${track}-${skill.name.toLowerCase().replaceAll(" ", "-")}`,
    week: index * 2 + 1,
    title: `${trackLabels[track]} sprint: ${skill.name}`,
    outcome: `Move ${skill.name} from ${skill.current}% to ${Math.min(skill.target, skill.current + skill.velocity * 2)}% with a public artifact.`,
    focus: [skill.category, "portfolio proof", "mentor review"],
    intensity: (["foundation", "ship", "scale", "mastery"] as const)[index] ?? "foundation"
  }));
}

export function analyzeSkillGap(skills: readonly SkillSignal[]) {
  const gaps = skills.map((skill) => ({
    ...skill,
    gap: Math.max(0, skill.target - skill.current),
    weeksToTarget: Math.ceil(Math.max(0, skill.target - skill.current) / Math.max(1, skill.velocity))
  }));

  const readiness = Math.round(
    gaps.reduce((sum, skill) => sum + skill.current / Math.max(skill.target, 1), 0) / gaps.length * 100
  );

  return {
    readiness,
    gaps: gaps.sort((a, b) => b.gap - a.gap),
    focusSkill: gaps.reduce((best, skill) => (skill.gap > best.gap ? skill : best), gaps[0]!)
  };
}

export function buildInsights(skills: readonly SkillSignal[], track: CareerTrackId): readonly PlatformInsight[] {
  const gap = analyzeSkillGap(skills);
  return [
    {
      id: "focus",
      title: "Highest leverage move",
      body: `${gap.focusSkill.name} is the fastest compounding gap for the ${trackLabels[track]} track. Pair it with a shipped proof artifact this week.`,
      priority: "high"
    },
    {
      id: "momentum",
      title: "Momentum signal",
      body: `At current velocity you can reach ${gap.readiness + 7}% track readiness within two focused weeks.`,
      priority: "medium"
    },
    {
      id: "positioning",
      title: "Narrative upgrade",
      body: "Reframe projects around business outcomes, learning systems, and measurable product taste instead of feature lists.",
      priority: "medium"
    }
  ];
}

export function answerMentorPrompt(prompt: string, profile = defaultGrowthProfile): string {
  const gap = analyzeSkillGap(profile.skills);
  const normalized = prompt.toLowerCase();

  if (normalized.includes("resume")) {
    return "Lead with measurable AI product outcomes, then compress tools into proof. Use one line per project: problem, system built, metric moved, and what you learned.";
  }

  if (normalized.includes("roadmap") || normalized.includes("learn")) {
    return `Your next roadmap should focus on ${gap.focusSkill.name}. Ship a small public artifact in 7 days, get feedback from one expert, then turn the feedback into a stronger v2.`;
  }

  if (normalized.includes("motivat") || normalized.includes("stuck")) {
    return `You already have a ${profile.streakDays}-day streak. Make today tiny but undeniable: one focused 45-minute session, one artifact improvement, one note about what changed.`;
  }

  return `You are ${gap.readiness}% ready for ${trackLabels[profile.targetTrack]}. The next high-leverage move is ${gap.focusSkill.name}: build proof, measure it, and turn the result into a story.`;
}

export function analyzeResumeText(text: string): ResumeAnalysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const hasMetrics = /\d+%|\$\d+|\b\d+x\b|\b\d+\s*(users|customers|ms|sec|hours)\b/i.test(text);
  const hasLeadership = /(led|owned|architected|launched|mentored|drove)/i.test(text);
  const hasAiSignals = /(ai|llm|model|agent|prompt|rag|ml|machine learning)/i.test(text);
  const atsScore = Math.max(42, Math.min(96, 48 + (hasMetrics ? 18 : 0) + (hasLeadership ? 14 : 0) + (hasAiSignals ? 12 : 0) + Math.min(12, Math.floor(words.length / 35))));

  return {
    atsScore,
    strengths: [
      hasLeadership ? "Strong ownership verbs are present." : "Readable baseline structure is present.",
      hasAiSignals ? "AI relevance is visible to recruiters." : "Experience can be adapted toward AI/product roles."
    ],
    risks: [
      hasMetrics ? "Metrics exist, but each bullet should tie them to user or business impact." : "Add concrete metrics to improve ATS and recruiter clarity.",
      words.length < 140 ? "Resume sample is short; add more outcome-rich evidence." : "Watch for dense bullets that hide the strongest outcomes."
    ],
    rewritePlan: [
      "Rewrite the top summary around target role, product taste, AI systems, and measured outcomes.",
      "Convert every project bullet into action, system, metric, and learning.",
      "Cluster skills by role relevance: AI systems, product engineering, analytics, and design craft."
    ]
  };
}

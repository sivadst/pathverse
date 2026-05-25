"use client";

import { create } from "zustand";
import {
  analyzeResumeText,
  analyzeSkillGap,
  answerMentorPrompt,
  buildInsights,
  defaultGrowthProfile,
  generateRoadmap
} from "@/src/services/pathverse-intelligence";
import type { CareerTrackId, MentorMessage, ResumeAnalysis, UserGrowthProfile } from "@/src/types/product";

interface PathVersePlatformState {
  readonly profile: UserGrowthProfile;
  readonly activeTrack: CareerTrackId;
  readonly mentorMessages: readonly MentorMessage[];
  readonly resumeAnalysis: ResumeAnalysis | undefined;
  readonly theme: "dark" | "light";
  readonly voiceEnabled: boolean;
  setTrack: (track: CareerTrackId) => void;
  askMentor: (prompt: string) => void;
  analyzeResume: (resumeText: string) => void;
  toggleTheme: () => void;
  toggleVoice: () => void;
}

const mentorGreeting: MentorMessage = {
  id: "mentor-greeting",
  role: "mentor",
  content: "I mapped your current trajectory. Ask for a roadmap, resume pass, motivation reset, or skill-gap plan.",
  timestamp: Date.now()
};

export const usePathVersePlatformStore = create<PathVersePlatformState>((set, get) => ({
  profile: defaultGrowthProfile,
  activeTrack: defaultGrowthProfile.targetTrack,
  mentorMessages: [mentorGreeting],
  resumeAnalysis: undefined,
  theme: "dark",
  voiceEnabled: false,
  setTrack: (track) => {
    const current = get().profile;
    const milestones = generateRoadmap(track, current.skills);
    const insights = buildInsights(current.skills, track);
    set({
      activeTrack: track,
      profile: {
        ...current,
        targetTrack: track,
        headline: `Building toward ${track.replaceAll("-", " ")}`,
        milestones,
        insights
      }
    });
  },
  askMentor: (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const response = answerMentorPrompt(trimmed, get().profile);
    const now = Date.now();
    set((state) => ({
      mentorMessages: [
        ...state.mentorMessages.slice(-7),
        { id: `user-${now}`, role: "user", content: trimmed, timestamp: now },
        { id: `mentor-${now}`, role: "mentor", content: response, timestamp: now + 1 }
      ]
    }));
  },
  analyzeResume: (resumeText) => {
    set({ resumeAnalysis: analyzeResumeText(resumeText) });
  },
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled }))
}));

export const selectSkillGap = (profile: UserGrowthProfile) => analyzeSkillGap(profile.skills);

"use client";

import * as THREE from "three";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bell,
  Brain,
  CheckCircle2,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Gauge,
  Globe2,
  LayoutDashboard,
  LineChart,
  Mic,
  Moon,
  Orbit,
  Play,
  Rocket,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Upload,
  Users,
  Zap
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectSkillGap, usePathVersePlatformStore } from "@/src/store/use-pathverse-platform-store";
import type { CareerTrackId, SkillSignal } from "@/src/types/product";
import { cn } from "@/src/lib/utils";

const tracks: readonly { id: CareerTrackId; label: string; copy: string }[] = [
  { id: "ai-product-architect", label: "AI Product", copy: "Strategy, systems, taste" },
  { id: "full-stack-ai", label: "Full-stack AI", copy: "Agents, apps, infra" },
  { id: "growth-systems", label: "Growth Systems", copy: "Loops, data, monetization" },
  { id: "creative-technologist", label: "Creative Tech", copy: "Motion, tools, invention" }
];

const velocityData = [
  { day: "Mon", xp: 420, focus: 2.5 },
  { day: "Tue", xp: 620, focus: 3.2 },
  { day: "Wed", xp: 540, focus: 2.8 },
  { day: "Thu", xp: 880, focus: 4.4 },
  { day: "Fri", xp: 760, focus: 3.6 },
  { day: "Sat", xp: 1040, focus: 5.1 },
  { day: "Sun", xp: 930, focus: 4.7 }
];

const leaderboard = [
  { name: "Maya Chen", role: "AI PM", xp: 9120 },
  { name: "Jon Bell", role: "Design Eng", xp: 8840 },
  { name: "Alex Morgan", role: "AI Product", xp: 7420 },
  { name: "Sam Rivers", role: "Growth", xp: 7190 }
];

const activityTimeline = [
  "Roadmap sprint recalibrated around LLM Systems.",
  "Resume signal improved with quantified product outcomes.",
  "Mentor recommended one public artifact this week.",
  "Community critique unlocked sharper positioning."
];

type IconComponent = React.ComponentType<{ readonly size?: number; readonly className?: string }>;

export function PathVersePlatform() {
  const {
    profile,
    activeTrack,
    mentorMessages,
    resumeAnalysis,
    theme,
    voiceEnabled,
    setTrack,
    askMentor,
    analyzeResume,
    toggleTheme,
    toggleVoice
  } = usePathVersePlatformStore();
  const [mentorPrompt, setMentorPrompt] = useState("");
  const [resumeText, setResumeText] = useState(
    "Architected an AI roadmap dashboard, launched a learning analytics workflow, and improved onboarding completion by 28% for early users."
  );
  const skillGap = useMemo(() => selectSkillGap(profile), [profile]);
  const radarData = useMemo(
    () =>
      profile.skills.map((skill) => ({
        skill: skill.name.replace(" ", "\n"),
        current: skill.current,
        target: skill.target
      })),
    [profile.skills]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050608] text-slate-100 selection:bg-plasma/30 selection:text-white">
      <CustomCursor />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(24,245,210,0.14),transparent_42%),linear-gradient(140deg,rgba(5,6,8,0)_0%,rgba(255,206,58,0.07)_48%,rgba(255,77,109,0.06)_100%)]" />
      <Header theme={theme} voiceEnabled={voiceEnabled} onTheme={toggleTheme} onVoice={toggleVoice} />

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-[1500px] gap-4 px-4 pb-6 pt-24 md:px-6 xl:grid-cols-[330px_1fr_360px]">
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid content-start gap-4"
        >
          <ProfilePanel profileName={profile.name} headline={profile.headline} level={profile.level} xp={profile.xp} streak={profile.streakDays} />
          <TrackSwitcher activeTrack={activeTrack} onTrack={setTrack} />
          <InsightStack insights={profile.insights} />
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.72, delay: 0.08 }}
          className="grid min-h-[680px] content-start gap-4"
        >
          <HeroCommandCenter readiness={skillGap.readiness} focusSkill={skillGap.focusSkill} />
          <DashboardGrid radarData={radarData} skills={profile.skills} focusHours={profile.weeklyFocusHours} />
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="grid content-start gap-4"
        >
          <MentorConsole
            messages={mentorMessages}
            prompt={mentorPrompt}
            onPrompt={setMentorPrompt}
            onSend={() => {
              askMentor(mentorPrompt);
              setMentorPrompt("");
            }}
          />
          <ResumeAnalyzer
            text={resumeText}
            onText={setResumeText}
            analysis={resumeAnalysis}
            onAnalyze={() => analyzeResume(resumeText)}
          />
        </motion.aside>
      </section>

      <section className="relative z-10 mx-auto grid w-full max-w-[1500px] gap-4 px-4 pb-12 md:px-6 xl:grid-cols-[1.25fr_0.75fr]">
        <RoadmapPanel milestones={profile.milestones} />
        <CommunityPanel />
      </section>
    </main>
  );
}

function Header({
  theme,
  voiceEnabled,
  onTheme,
  onVoice
}: {
  readonly theme: "dark" | "light";
  readonly voiceEnabled: boolean;
  readonly onTheme: () => void;
  readonly onVoice: () => void;
}) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#050608]/76 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-plasma/30 bg-plasma/10 shadow-[0_0_26px_rgba(24,245,210,0.2)]">
            <Orbit size={20} className="text-plasma" />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.26em] text-white">PathVerse</span>
            <span className="block text-xs text-slate-400">AI growth operating system</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {["Dashboard", "Mentor", "Roadmap", "Community"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onVoice} aria-label="Toggle voice assistant">
            <Mic size={16} className={voiceEnabled ? "text-plasma" : "text-slate-300"} />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops">
              <LayoutDashboard size={15} />
              Ops
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function ProfilePanel({
  profileName,
  headline,
  level,
  xp,
  streak
}: {
  readonly profileName: string;
  readonly headline: string;
  readonly level: number;
  readonly xp: number;
  readonly streak: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div>
          <Badge className="border-reactor/30 bg-reactor/10 text-reactor">Onboarding live</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-white md:text-4xl">Your AI-powered growth cockpit</h1>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/25 p-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-plasma via-cobalt to-reactor text-base font-bold text-void">
            AM
          </div>
          <div>
            <div className="font-semibold text-white">{profileName}</div>
            <div className="text-sm capitalize text-slate-400">{headline}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric icon={Crown} label="Level" value={level.toString()} />
          <Metric icon={Zap} label="XP" value={xp.toLocaleString()} />
          <Metric icon={Flame} label="Streak" value={`${streak}d`} />
        </div>
      </CardContent>
    </Card>
  );
}

function TrackSwitcher({
  activeTrack,
  onTrack
}: {
  readonly activeTrack: CareerTrackId;
  readonly onTrack: (track: CareerTrackId) => void;
}) {
  return (
    <Card id="dashboard">
      <CardHeader>
        <CardTitle>Career Path Matrix</CardTitle>
        <Compass size={17} className="text-plasma" />
      </CardHeader>
      <CardContent className="grid gap-2">
        {tracks.map((track) => (
          <button
            type="button"
            key={track.id}
            onClick={() => onTrack(track.id)}
            className={cn(
              "group flex items-center justify-between rounded-lg border p-3 text-left transition",
              activeTrack === track.id
                ? "border-plasma/45 bg-plasma/10 text-white shadow-[0_0_28px_rgba(24,245,210,0.12)]"
                : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/20 hover:bg-white/[0.07]"
            )}
          >
            <span>
              <span className="block text-sm font-semibold">{track.label}</span>
              <span className="block text-xs text-slate-400">{track.copy}</span>
            </span>
            <ChevronRight size={16} className="transition group-hover:translate-x-1" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightStack({ insights }: { readonly insights: readonly { readonly id: string; readonly title: string; readonly body: string; readonly priority: string }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Insights</CardTitle>
        <Sparkles size={17} className="text-reactor" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {insights.map((insight) => (
          <div key={insight.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{insight.title}</div>
              <Badge className={insight.priority === "high" ? "border-alarm/30 bg-alarm/10 text-alarm" : ""}>{insight.priority}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{insight.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HeroCommandCenter({
  readiness,
  focusSkill
}: {
  readonly readiness: number;
  readonly focusSkill: SkillSignal & { readonly gap: number; readonly weeksToTarget: number };
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-[#07090d]/88 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.36)] backdrop-blur-2xl md:p-6">
      <ThreeGrowthScene />
      <div className="relative grid min-h-[430px] gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col justify-between gap-8">
          <div>
            <Badge className="border-plasma/30 bg-plasma/10 text-plasma">AI mentor online</Badge>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-normal text-white md:text-6xl">
              Discover, build, and compound your career trajectory.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
              PathVerse turns goals, skills, resumes, and momentum into a living roadmap with AI recommendations, achievements, and cinematic progress visualization.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="magnetic-button">
              <Play size={17} />
              Start next sprint
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/ops">
                <Globe2 size={17} />
                Open GPU ops
              </Link>
            </Button>
          </div>
        </div>
        <div className="grid content-end gap-3">
          <GlassStat icon={Gauge} label="Track readiness" value={`${readiness}%`} accent="plasma" />
          <GlassStat icon={Target} label="Priority gap" value={focusSkill.name} accent="reactor" detail={`${focusSkill.weeksToTarget} week sprint`} />
          <GlassStat icon={ShieldCheck} label="ATS forecast" value="86%" accent="alarm" detail="Resume pass recommended" />
        </div>
      </div>
    </section>
  );
}

function DashboardGrid({
  radarData,
  skills,
  focusHours
}: {
  readonly radarData: readonly { readonly skill: string; readonly current: number; readonly target: number }[];
  readonly skills: readonly SkillSignal[];
  readonly focusHours: number;
}) {
  const mounted = useHasMounted();
  const radarSize = useElementSize<HTMLDivElement>();
  const momentumSize = useElementSize<HTMLDivElement>();

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Skill Geometry</CardTitle>
            <p className="mt-1 text-sm text-slate-400">Current capability against target role.</p>
          </div>
          <LineChart size={18} className="text-plasma" />
        </CardHeader>
        <CardContent>
          <div ref={radarSize.ref} className="h-72 min-w-0">
            {mounted && radarSize.width > 0 && radarSize.height > 0 ? (
              <RadarChart width={radarSize.width} height={radarSize.height} data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: "#b8c0cc", fontSize: 11 }} />
                <Radar dataKey="target" stroke="#ffce3a" fill="#ffce3a" fillOpacity={0.1} />
                <Radar dataKey="current" stroke="#18f5d2" fill="#18f5d2" fillOpacity={0.26} />
              </RadarChart>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Momentum Analytics</CardTitle>
            <p className="mt-1 text-sm text-slate-400">{focusHours} focused hours scheduled this week.</p>
          </div>
          <Activity size={18} className="text-reactor" />
        </CardHeader>
        <CardContent>
          <div ref={momentumSize.ref} className="h-72 min-w-0">
            {mounted && momentumSize.width > 0 && momentumSize.height > 0 ? (
              <AreaChart width={momentumSize.width} height={momentumSize.height} data={velocityData}>
                <defs>
                  <linearGradient id="xpGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#18f5d2" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#18f5d2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#9aa4b2", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9aa4b2", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#080b10", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="xp" stroke="#18f5d2" fill="url(#xpGradient)" strokeWidth={2} />
                <Bar dataKey="focus" fill="#ffce3a" radius={[6, 6, 0, 0]} />
              </AreaChart>
            ) : (
              <ChartSkeleton />
            )}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2 lg:col-span-2 lg:grid-cols-3">
        {skills.slice(0, 3).map((skill) => (
          <SkillProgress key={skill.name} skill={skill} />
        ))}
      </div>
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="grid h-full animate-pulse grid-cols-6 items-end gap-2">
      {[42, 64, 48, 82, 68, 76].map((height) => (
        <div key={height} className="rounded-t-md bg-white/[0.08]" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

function MentorConsole({
  messages,
  prompt,
  onPrompt,
  onSend
}: {
  readonly messages: readonly { readonly id: string; readonly role: "user" | "mentor"; readonly content: string }[];
  readonly prompt: string;
  readonly onPrompt: (value: string) => void;
  readonly onSend: () => void;
}) {
  return (
    <Card id="mentor">
      <CardHeader>
        <CardTitle>AI Career Mentor</CardTitle>
        <Brain size={18} className="text-plasma" />
      </CardHeader>
      <CardContent>
        <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-lg border p-3 text-sm leading-6",
                message.role === "mentor"
                  ? "border-plasma/20 bg-plasma/10 text-slate-100"
                  : "border-white/10 bg-white/[0.06] text-slate-200"
              )}
            >
              {message.content}
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <input
            value={prompt}
            onChange={(event) => onPrompt(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-plasma/50"
            placeholder="Ask for roadmap, resume, or motivation"
          />
          <Button type="submit" size="sm" aria-label="Send mentor prompt">
            <Send size={15} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ResumeAnalyzer({
  text,
  onText,
  analysis,
  onAnalyze
}: {
  readonly text: string;
  readonly onText: (text: string) => void;
  readonly analysis: { readonly atsScore: number; readonly strengths: readonly string[]; readonly risks: readonly string[]; readonly rewritePlan: readonly string[] } | undefined;
  readonly onAnalyze: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Resume Analyzer</CardTitle>
        <Upload size={18} className="text-reactor" />
      </CardHeader>
      <CardContent>
        <textarea
          value={text}
          onChange={(event) => onText(event.target.value)}
          className="min-h-28 w-full resize-none rounded-lg border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-reactor/50"
        />
        <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onAnalyze}>
          Analyze resume signal
          <ArrowRight size={15} />
        </Button>
        {analysis && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">ATS prediction</span>
              <span className="font-mono text-2xl text-plasma">{analysis.atsScore}</span>
            </div>
            <ul className="mt-3 grid gap-2 text-sm text-slate-300">
              {[...analysis.strengths, ...analysis.risks.slice(0, 1)].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 size={15} className="mt-1 shrink-0 text-plasma" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoadmapPanel({
  milestones
}: {
  readonly milestones: readonly { readonly id: string; readonly week: number; readonly title: string; readonly outcome: string; readonly focus: readonly string[]; readonly intensity: string }[];
}) {
  return (
    <Card id="roadmap">
      <CardHeader>
        <div>
          <CardTitle>Adaptive Roadmap Generator</CardTitle>
          <p className="mt-1 text-sm text-slate-400">AI-generated sprints with proof artifacts and mentor loops.</p>
        </div>
        <Rocket size={18} className="text-plasma" />
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <Badge>Week {milestone.week}</Badge>
              <Badge className="border-reactor/25 bg-reactor/10 text-reactor">{milestone.intensity}</Badge>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">{milestone.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{milestone.outcome}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {milestone.focus.map((item) => (
                <span key={item} className="rounded-full bg-white/[0.07] px-2 py-1 text-xs text-slate-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CommunityPanel() {
  return (
    <div id="community" className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <Trophy size={18} className="text-reactor" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {leaderboard.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-white/[0.08] font-mono text-sm text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{entry.name}</div>
                <div className="text-xs text-slate-400">{entry.role}</div>
              </div>
              <span className="font-mono text-sm text-plasma">{entry.xp}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <Bell size={18} className="text-plasma" />
        </CardHeader>
        <CardContent className="grid gap-3">
          {activityTimeline.map((item) => (
            <div key={item} className="flex gap-3 text-sm leading-6 text-slate-300">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-plasma shadow-[0_0_16px_rgba(24,245,210,0.7)]" />
              <span>{item}</span>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" size="sm">
              <Users size={15} />
              Community
            </Button>
            <Button type="button" variant="secondary" size="sm">
              <Share2 size={15} />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SkillProgress({ skill }: { readonly skill: SkillSignal }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{skill.name}</div>
          <div className="text-xs text-slate-400">{skill.category} velocity +{skill.velocity}</div>
        </div>
        <span className="font-mono text-xl text-plasma">{skill.current}%</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.current}%` }}
          viewport={{ once: true }}
          className="h-full rounded-full bg-gradient-to-r from-plasma via-cobalt to-reactor"
        />
      </div>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }: { readonly icon: IconComponent; readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
      <Icon size={15} className="text-plasma" />
      <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-lg text-white">{value}</div>
    </div>
  );
}

function GlassStat({
  icon: Icon,
  label,
  value,
  detail,
  accent
}: {
  readonly icon: IconComponent;
  readonly label: string;
  readonly value: string;
  readonly detail?: string;
  readonly accent: "plasma" | "reactor" | "alarm";
}) {
  const accentClass = {
    plasma: "text-plasma border-plasma/25 bg-plasma/10",
    reactor: "text-reactor border-reactor/25 bg-reactor/10",
    alarm: "text-alarm border-alarm/25 bg-alarm/10"
  }[accent];

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
        <span className={cn("grid h-8 w-8 place-items-center rounded-md border", accentClass)}>
          <Icon size={16} />
        </span>
        {label}
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
      {detail && <div className="mt-1 text-sm text-slate-400">{detail}</div>}
    </div>
  );
}

function ThreeGrowthScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 8;

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(360 * 3);
    for (let index = 0; index < 360; index += 1) {
      const radius = 1.7 + Math.sin(index * 0.13) * 0.34;
      const angle = index * 0.37;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius;
      positions[index * 3 + 2] = Math.sin(index * 0.17) * 1.6;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({ color: 0x18f5d2, size: 0.035, transparent: true, opacity: 0.86 });
    const points = new THREE.Points(geometry, material);
    group.add(points);

    const ringGeometry = new THREE.TorusGeometry(2.8, 0.006, 8, 180);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffce3a, transparent: true, opacity: 0.42 });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2.6;
    group.add(ring);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    resize();

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    let frame = 0;
    let animationFrame = 0;
    const animate = () => {
      frame += 1;
      if (!prefersReducedMotion) {
        group.rotation.y += 0.003;
        points.rotation.z += 0.0014;
        ring.rotation.z = Math.sin(frame * 0.01) * 0.18;
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-80" />;
}

function CustomCursor() {
  const [point, setPoint] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const onMove = (event: PointerEvent) => setPoint({ x: event.clientX, y: event.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-50 hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-plasma/35 mix-blend-screen transition-transform duration-75 lg:block"
      style={{ left: point.x, top: point.y }}
    />
  );
}

function useHasMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height))
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, ...size };
}

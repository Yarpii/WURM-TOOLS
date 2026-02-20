"use client";

import { useState, useMemo } from "react";
import { SliderInput, StatBox } from "@/components/crafting/shared";
import {
  calculateSuccessChance,
  calculateEffectiveSkill,
  calculateSweetSpotQL,
  predictSkillGain,
  generateSkillPath,
  getSuccessCategory,
  type SkillPathStep,
} from "@/lib/wurm-formulas";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "simulator" | "path";
type ServerRate = 1 | 2 | 5;

const SKILL_OPTIONS = [
  "Blacksmithing",
  "Weapon Smithing",
  "Armour Smithing",
  "Jewelry Smithing",
  "Locksmithing",
  "Carpentry",
  "Fine Carpentry",
  "Ship Building",
  "Bowyery",
  "Fletching",
  "Masonry",
  "Stone Cutting",
  "Tailoring",
  "Cloth Tailoring",
  "Leatherworking",
  "Cooking",
  "Hot Food Cooking",
  "Baking",
  "Dairy Food Making",
  "Beverages",
  "Nature",
  "Farming",
  "Animal Taming",
  "Foraging",
  "Botanizing",
  "Fishing",
  "Milking",
  "Animal Husbandry",
  "Digging",
  "Mining",
  "Woodcutting",
  "Prospecting",
  "Ropemaking",
  "Pottery",
  "Firemaking",
  "Healing",
  "First Aid",
  "Archery",
  "Melee Fighting",
  "Shield Bashing",
  "Channeling",
  "Prayer",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format seconds into a human-readable string */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Gaussian slide value (measures how far you are from the difficulty) */
function computeSlide(effectiveSkill: number, difficulty: number): number {
  return (
    (Math.pow(effectiveSkill, 3) - Math.pow(difficulty, 3)) / 50000 +
    (effectiveSkill - difficulty)
  );
}

/** Color class based on slide value (optimal ~20) */
function slideColor(slide: number): string {
  const abs = Math.abs(slide);
  if (abs <= 5) return "text-success";
  if (abs <= 15) return "text-warning";
  return "text-danger";
}

// ─── Per-Action Simulator ─────────────────────────────────────────────────────

function Simulator() {
  const [skill, setSkill] = useState(30);
  const [difficulty, setDifficulty] = useState(30);
  const [toolQL, setToolQL] = useState(50);
  const [actionTime, setActionTime] = useState(10);
  const [sleepBonus, setSleepBonus] = useState(false);
  const [serverRate, setServerRate] = useState<ServerRate>(1);
  const [numActions, setNumActions] = useState(100);

  const results = useMemo(() => {
    const effectiveSkill = calculateEffectiveSkill(skill);
    const successChance = calculateSuccessChance({
      skill,
      difficulty,
      toolQL,
      materialQL: 50,
    });
    const successCategory = getSuccessCategory(successChance);
    const slide = computeSlide(effectiveSkill, difficulty);
    const sweetSpot = calculateSweetSpotQL(skill);
    const inSweetSpot = difficulty >= sweetSpot && difficulty <= sweetSpot + 10;

    const gainPrediction = predictSkillGain(
      skill,
      difficulty,
      actionTime,
      numActions,
      sleepBonus
    );

    // Apply server rate multiplier
    const gainPerAction = gainPrediction.gainPerAction * serverRate;
    const totalGain = gainPrediction.totalGain * serverRate;
    const actionsToNext = gainPerAction > 0
      ? Math.ceil((Math.floor(skill) + 1 - skill) / gainPerAction)
      : Infinity;

    // Time for the simulated session
    const sessionSeconds = actionTime * numActions;

    return {
      effectiveSkill,
      successChance,
      successCategory,
      slide,
      inSweetSpot,
      sweetSpot,
      gainPerAction,
      totalGain,
      newSkill: Math.min(100, skill + totalGain),
      actionsToNext,
      sessionSeconds,
    };
  }, [skill, difficulty, toolQL, actionTime, sleepBonus, serverRate, numActions]);

  const slideVal = Math.round(results.slide * 100) / 100;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* ── Inputs ── */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6 space-y-5">
        <h2 className="text-base font-semibold text-text-primary">Parameters</h2>

        {/* Skill dropdown */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">Skill</label>
          <select
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            defaultValue="Blacksmithing"
          >
            {SKILL_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <SliderInput label="Current Skill" value={skill} onChange={setSkill} min={1} max={99} />
        <SliderInput label="Item Difficulty / Target QL" value={difficulty} onChange={setDifficulty} min={1} max={100} />
        <SliderInput label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} />
        <SliderInput label="Action Time (seconds)" value={actionTime} onChange={setActionTime} min={3} max={60} />
        <SliderInput label="Actions to Simulate" value={numActions} onChange={setNumActions} min={10} max={2000} />

        <div className="flex flex-wrap gap-4 pt-1">
          {/* Sleep Bonus */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sleepBonus}
              onChange={(e) => setSleepBonus(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">Sleep Bonus (2×)</span>
          </label>

          {/* Server Rate */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Server Rate:</span>
            {([1, 2, 5] as ServerRate[]).map((r) => (
              <button
                key={r}
                onClick={() => setServerRate(r)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  serverRate === r
                    ? "bg-accent text-white"
                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="space-y-4">
        {/* Gaussian Slide */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-primary">Gaussian Mean (Slide)</span>
            <span className={`text-2xl font-bold ${slideColor(slideVal)}`}>{slideVal}</span>
          </div>
          <p className="text-xs text-text-muted mb-2">
            The Gaussian slide is the center of the skill-check bell curve.
            Values near <strong className="text-success">+20</strong> are optimal — high enough for good success rate without reducing skill gain.
            {slideVal < -5 && (
              <span className="text-danger"> Too far negative: difficulty is too hard for your skill.</span>
            )}
            {slideVal > 30 && (
              <span className="text-warning"> Very high: consider increasing difficulty for faster gains.</span>
            )}
          </p>
          {/* Visual bar */}
          <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="absolute top-0 h-full bg-success rounded-full"
              style={{ left: "35%", width: "15%" }}
              title="Optimal zone (~slide 15–25)"
            />
            <div
              className="absolute top-0 h-2 w-1 bg-accent rounded-full transition-all"
              style={{ left: `${Math.min(95, Math.max(5, (slideVal + 50) / 100 * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>−50</span>
            <span className="text-success">optimal ~20</span>
            <span>+50</span>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Success Rate"
            value={`${Math.round(results.successChance)}%`}
            sub={results.successCategory.label}
            color={
              results.successChance >= 75 ? "success" :
              results.successChance >= 50 ? "warning" :
              results.successChance >= 25 ? "warning" : "danger"
            }
          />
          <StatBox
            label="Effective Skill"
            value={Math.round(results.effectiveSkill * 10) / 10}
            sub="after The Curve"
            color="accent"
          />
          <StatBox
            label="Gain / Action"
            value={results.gainPerAction.toFixed(4)}
            sub={sleepBonus ? "with sleep bonus" : serverRate > 1 ? `${serverRate}× server` : "base rate"}
            color="info"
          />
          <StatBox
            label="Actions to Next Level"
            value={results.actionsToNext === Infinity ? "∞" : results.actionsToNext.toLocaleString()}
            sub={`from skill ${skill}`}
            color="accent"
          />
        </div>

        {/* Session summary */}
        <div className="bg-bg-secondary rounded-xl border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Session Summary — {numActions.toLocaleString()} actions
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <StatBox
              label="Total Gain"
              value={`+${results.totalGain.toFixed(3)}`}
              color="success"
            />
            <StatBox
              label="Skill After"
              value={results.newSkill.toFixed(2)}
              color="accent"
            />
            <StatBox
              label="Session Time"
              value={formatTime(results.sessionSeconds)}
              color="info"
            />
          </div>

          {/* Sweet spot indicator */}
          <div className={`rounded-lg px-4 py-3 text-sm ${results.inSweetSpot ? "bg-success/10 border border-success/30 text-success" : "bg-bg-tertiary border border-border text-text-muted"}`}>
            {results.inSweetSpot ? (
              <>
                <strong>Sweet Spot Active!</strong> Difficulty {difficulty} is within your sweet spot range (QL {Math.round(results.sweetSpot)}–{Math.round(results.sweetSpot + 10)}). You are getting <strong>2× skill gain</strong>.
              </>
            ) : (
              <>
                Sweet spot range for skill {skill}: QL <strong className="text-text-secondary">{Math.round(results.sweetSpot)}–{Math.round(results.sweetSpot + 10)}</strong>. Items in this range grant 2× skill gain.
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Skill Path Planner ───────────────────────────────────────────────────────

function SkillPathPlanner() {
  const [fromSkill, setFromSkill] = useState(1);
  const [toSkill, setToSkill] = useState(70);
  const [toolQL, setToolQL] = useState(50);
  const [sleepBonus, setSleepBonus] = useState(false);
  const [serverRate, setServerRate] = useState<ServerRate>(1);

  const path: SkillPathStep[] = useMemo(() => {
    if (fromSkill >= toSkill) return [];
    return generateSkillPath(fromSkill, toSkill, toolQL);
  }, [fromSkill, toSkill, toolQL]);

  // Apply multipliers to each step
  const adjustedPath = useMemo(() => {
    const multiplier = serverRate * (sleepBonus ? 2 : 1);
    return path.map((step) => ({
      ...step,
      actionsNeeded: Math.ceil(step.actionsNeeded / multiplier),
      estimatedTimeSeconds: Math.ceil(step.estimatedTimeSeconds / multiplier),
    }));
  }, [path, serverRate, sleepBonus]);

  const totals = useMemo(() => {
    return adjustedPath.reduce(
      (acc, step) => ({
        actions: acc.actions + step.actionsNeeded,
        seconds: acc.seconds + step.estimatedTimeSeconds,
      }),
      { actions: 0, seconds: 0 }
    );
  }, [adjustedPath]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">Grind Settings</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SliderInput label="From Skill" value={fromSkill} onChange={setFromSkill} min={1} max={98} color="accent" />
          <SliderInput label="To Skill" value={toSkill} onChange={(v) => setToSkill(Math.max(fromSkill + 1, v))} min={2} max={99} color="success" />
          <SliderInput label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} />
        </div>

        <div className="flex flex-wrap gap-4 mt-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sleepBonus}
              onChange={(e) => setSleepBonus(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-sm text-text-secondary">Sleep Bonus (2×)</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Server Rate:</span>
            {([1, 2, 5] as ServerRate[]).map((r) => (
              <button
                key={r}
                onClick={() => setServerRate(r)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  serverRate === r
                    ? "bg-accent text-white"
                    : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {adjustedPath.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <StatBox
              label="Total Actions"
              value={totals.actions.toLocaleString()}
              sub={`skill ${fromSkill} → ${toSkill}`}
              color="accent"
            />
            <StatBox
              label="Total Time"
              value={formatTime(totals.seconds)}
              sub={[sleepBonus && "sleep bonus", serverRate > 1 && `${serverRate}× rate`].filter(Boolean).join(", ") || "base rate"}
              color="info"
            />
            <StatBox
              label="Skill Gain"
              value={`+${toSkill - fromSkill}`}
              sub={`${fromSkill} → ${toSkill}`}
              color="success"
            />
          </div>

          {/* Progression table */}
          <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Progression Breakdown</h3>
              <p className="text-xs text-text-muted mt-0.5">Each row shows an optimal grinding segment</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted text-xs">
                    <th className="text-left px-5 py-3 font-medium">Skill Range</th>
                    <th className="text-right px-4 py-3 font-medium">Target QL</th>
                    <th className="text-right px-4 py-3 font-medium">Success</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                    <th className="text-right px-4 py-3 font-medium">Cumulative</th>
                    <th className="text-right px-5 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustedPath.map((step, idx) => {
                    const cumActions = adjustedPath
                      .slice(0, idx + 1)
                      .reduce((a, s) => a + s.actionsNeeded, 0);
                    const successCat = getSuccessCategory(step.successRate);
                    const successColor =
                      step.successRate >= 75 ? "text-success" :
                      step.successRate >= 50 ? "text-warning" :
                      step.successRate >= 25 ? "text-warning" : "text-danger";

                    return (
                      <tr
                        key={idx}
                        className="border-b border-border/50 hover:bg-bg-hover transition-colors"
                      >
                        <td className="px-5 py-3 font-medium text-text-primary">
                          {step.skillRange.from} → {step.skillRange.to}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          QL {step.targetQL}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${successColor}`}>
                          {step.successRate}%
                          <span className="text-text-muted text-xs ml-1">({successCat.label})</span>
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary">
                          {step.actionsNeeded.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-text-muted">
                          {cumActions.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-text-secondary">
                          {formatTime(step.estimatedTimeSeconds)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-bg-tertiary font-medium">
                    <td className="px-5 py-3 text-text-primary">Total</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-accent">{totals.actions.toLocaleString()}</td>
                    <td className="px-4 py-3" />
                    <td className="px-5 py-3 text-right text-accent">{formatTime(totals.seconds)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-bg-secondary rounded-xl border border-border p-4 text-xs text-text-muted space-y-1">
            <p>
              <strong className="text-text-secondary">How it works:</strong> Each row is a 5-level segment where you grind at the listed Target QL.
              The simulator uses the actual Wurm skill check formulas (decompiled from Wurm Unlimited source), including the stat divider jump at skill 31 and the Gaussian bell-curve model.
            </p>
            <p>
              Actions are estimates assuming you craft/improve at the optimal QL for each segment.
              Enable <strong className="text-text-secondary">Sleep Bonus</strong> or set a higher <strong className="text-text-secondary">Server Rate</strong> to see adjusted totals.
            </p>
          </div>
        </>
      )}

      {fromSkill >= toSkill && (
        <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
          <div className="text-5xl mb-4 opacity-20">⚔</div>
          <p className="text-text-muted text-sm">Set &quot;From Skill&quot; lower than &quot;To Skill&quot; to see the path.</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GrinderPage() {
  const [activeTab, setActiveTab] = useState<Tab>("simulator");

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Skill Grinder</h1>
          <p className="text-text-secondary">
            Simulate skill gain, find your optimal difficulty, and plan the full path to your target skill.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-bg-secondary p-1 rounded-lg border border-border w-fit">
          {[
            { id: "simulator" as Tab, label: "Per-Action Simulator" },
            { id: "path" as Tab, label: "Skill Path Planner" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "simulator" ? <Simulator /> : <SkillPathPlanner />}

        {/* Mechanics info */}
        <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            {
              icon: "📈",
              title: "The Curve",
              body: "Skills use a Gaussian model. Effective skill = 2x − (x/10)². A skill of 70 gives effective 91. Higher effective skill shifts the bell-curve toward success.",
            },
            {
              icon: "🎯",
              title: "Sweet Spot",
              body: "Items at QL ≈ skill×0.77+23 grant double skill gain. Stay in the sweet spot range for 2× efficiency — the grinder highlights when you're there.",
            },
            {
              icon: "🧱",
              title: "Skill Wall at 31",
              body: "Wurm's stat divider jumps from 5.0 to 45.0 at skill 31 — a 9× slowdown. Plan extra actions for the 25–40 range; it's the steepest climb in any grind.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="bg-bg-secondary rounded-xl border border-border p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
              <p className="text-text-muted text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

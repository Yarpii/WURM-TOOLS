"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

// ─── Table of contents structure ─────────────────────────────────────────────

const TOC = [
  {
    label: "Overview",
    id: "overview",
    children: [],
  },
  {
    label: "Crafting Calculator",
    id: "crafting",
    children: [
      { label: "Basic Calculator", id: "crafting-basic" },
      { label: "Advanced Calculator", id: "crafting-advanced" },
      { label: "Skill Optimizer", id: "crafting-optimizer" },
      { label: "Session Planner", id: "crafting-session" },
    ],
  },
  {
    label: "Skill Grinder",
    id: "grinder",
    children: [
      { label: "Per-Action Simulator", id: "grinder-simulator" },
      { label: "Skill Path Planner", id: "grinder-path" },
    ],
  },
  {
    label: "Cooking & Affinity",
    id: "cooking",
    children: [
      { label: "Affinity Calculator", id: "cooking-affinity" },
      { label: "CCFP Calculator", id: "cooking-ccfp" },
    ],
  },
  {
    label: "Skills Tracker",
    id: "skills",
    children: [],
  },
  {
    label: "Formula Reference",
    id: "formulas",
    children: [
      { label: "The Curve", id: "formula-curve" },
      { label: "Gaussian Skill Check", id: "formula-gaussian" },
      { label: "Success Probability", id: "formula-success" },
      { label: "Skill Gain", id: "formula-skillgain" },
      { label: "Sweet Spot QL", id: "formula-sweetspot" },
      { label: "Max Creation QL", id: "formula-maxql" },
      { label: "Action Time", id: "formula-actiontime" },
      { label: "Tool Wear", id: "formula-toolwear" },
    ],
  },
  {
    label: "Reporting Issues",
    id: "reporting",
    children: [],
  },
];

// ─── Small reusable doc components ───────────────────────────────────────────

function Callout({
  type,
  children,
}: {
  type: "tip" | "warning" | "info" | "formula";
  children: React.ReactNode;
}) {
  const styles = {
    tip: "border-success/40 bg-success/5 text-success",
    warning: "border-warning/40 bg-warning/5 text-warning",
    info: "border-accent/40 bg-accent/5 text-accent",
    formula: "border-border bg-bg-tertiary text-text-secondary",
  };
  const icons = { tip: "✓", warning: "⚠", info: "ℹ", formula: "∑" };

  return (
    <div className={`border rounded-lg px-4 py-3 text-sm my-4 ${styles[type]}`}>
      <span className="font-bold mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-sm bg-bg-tertiary border border-border rounded px-1.5 py-0.5 text-accent">
      {children}
    </code>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between bg-bg-tertiary border-b border-border px-4 py-1.5">
        <span className="text-xs text-text-muted font-mono">{label ?? ""}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-bg-secondary px-4 py-3 text-sm font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function ParamTable({
  rows,
}: {
  rows: { name: string; type: string; desc: string }[];
}) {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-tertiary border-b border-border text-text-muted text-xs">
            <th className="text-left px-4 py-2 font-medium">Parameter</th>
            <th className="text-left px-4 py-2 font-medium">Range</th>
            <th className="text-left px-4 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2 font-mono text-accent text-xs">{r.name}</td>
              <td className="px-4 py-2 text-text-muted text-xs whitespace-nowrap">{r.type}</td>
              <td className="px-4 py-2 text-text-secondary">{r.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="group flex items-center gap-2 text-2xl font-bold text-text-primary mt-12 mb-4 pb-2 border-b border-border scroll-mt-24"
    >
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent"
        aria-label={`Link to ${String(children)}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </a>
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="group flex items-center gap-2 text-lg font-semibold text-text-primary mt-8 mb-3 scroll-mt-24"
    >
      {children}
      <a
        href={`#${id}`}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent"
        aria-label={`Link to ${String(children)}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </a>
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-text-secondary text-sm leading-relaxed mb-3">{children}</p>;
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ activeId, onLinkClick }: { activeId: string; onLinkClick?: () => void }) {
  return (
    <nav className="space-y-1">
      {TOC.map((section) => (
        <div key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onLinkClick}
            className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeId === section.id
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {section.label}
          </a>
          {section.children.map((child) => (
            <a
              key={child.id}
              href={`#${child.id}`}
              onClick={onLinkClick}
              className={`block pl-6 pr-3 py-1 rounded-md text-xs transition-colors ${
                activeId === child.id
                  ? "text-accent"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {child.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings } = useSiteSettings();

  // Highlight the active section as the user scrolls
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    const ids = TOC.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]);
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Documentation</h1>
          <p className="text-text-secondary text-sm">
            How to use each tool — plus the underlying Wurm Online formulas so you can verify every result.
          </p>
        </div>

        {/* Mobile ToC toggle */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary"
          >
            <span>Jump to section</span>
            <span className="text-text-muted">{mobileOpen ? "▲" : "▼"}</span>
          </button>
          {mobileOpen && (
            <div className="mt-2 bg-bg-secondary border border-border rounded-lg p-3">
              <Sidebar activeId={activeId} onLinkClick={() => setMobileOpen(false)} />
            </div>
          )}
        </div>

        {/* Two-column layout */}
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 px-3">
                Contents
              </p>
              <Sidebar activeId={activeId} />
            </div>
          </aside>

          {/* Content */}
          <article className="min-w-0">

            {/* ── Overview ── */}
            <SectionHeading id="overview">Overview</SectionHeading>
            <P>
              Wurm Tools is a community toolkit for{" "}
              <strong className="text-text-primary">Wurm Online</strong>. Every calculator on
              this site is built from formulas decompiled from the Wurm Unlimited Java source or
              verified against Wurmpedia — so results should match what happens in-game.
            </P>
            <P>
              This page explains how to use each tool and, importantly, shows the exact formulas
              behind the numbers. If a result looks wrong, the formula section at the bottom is
              your first stop for spotting a bug.
            </P>

            <div className="grid sm:grid-cols-2 gap-3 my-6">
              {[
                { href: "/crafting", icon: "⚒", label: "Crafting Calculator", desc: "Materials, success rates, quality predictions" },
                { href: "/grinder", icon: "📈", label: "Skill Grinder", desc: "Actions needed, optimal difficulty, full path" },
                { href: "/cooking", icon: "🍲", label: "Cooking & Affinity", desc: "Affinity hashing, CCFP values" },
                { href: "/skills", icon: "📊", label: "Skills Tracker", desc: "Upload your skill dump, track targets" },
              ].map(({ href, icon, label, desc }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-start gap-3 bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent/40 transition-colors"
                >
                  <span className="text-2xl leading-none mt-0.5">{icon}</span>
                  <div>
                    <div className="font-medium text-text-primary text-sm">{label}</div>
                    <div className="text-text-muted text-xs mt-0.5">{desc}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* ── Crafting Calculator ── */}
            <SectionHeading id="crafting">Crafting Calculator</SectionHeading>
            <P>
              The crafting page (<Link href="/crafting" className="text-accent hover:underline">/crafting</Link>){" "}
              has five tabs: <strong className="text-text-primary">Calculator</strong>,{" "}
              <strong className="text-text-primary">Advanced</strong>,{" "}
              <strong className="text-text-primary">Optimizer</strong>,{" "}
              <strong className="text-text-primary">Visual Tree</strong>, and{" "}
              <strong className="text-text-primary">Session Planner</strong>.
            </P>

            <SubHeading id="crafting-basic">Basic Calculator</SubHeading>
            <P>
              Search for any craftable item, enter a quantity, and get the full list of materials
              required. Two material modes are available:
            </P>
            <ParamTable
              rows={[
                { name: "Recipe materials", type: "default", desc: "Shows only the direct ingredients listed in the recipe — one step deep." },
                { name: "All base materials", type: "toggle", desc: "Recursively expands every sub-recipe down to raw resources (ore, wood, etc.)." },
              ]}
            />
            <P>
              Use <strong className="text-text-primary">Reverse</strong> mode to find every item
              that uses a specific material as an ingredient — useful when you have surplus
              resources and want ideas for what to make.
            </P>
            <Callout type="tip">
              The visual crafting tree lets you click individual nodes to include or exclude
              sub-components — handy when you already have some materials stockpiled.
            </Callout>

            <SubHeading id="crafting-advanced">Advanced Calculator</SubHeading>
            <P>
              Models what actually happens when you craft: your skill, tool quality, and material
              quality are fed into the Gaussian skill-check model to predict success rate, output
              quality, and the realistic amount of materials you will consume.
            </P>
            <ParamTable
              rows={[
                { name: "Skill", type: "1 – 100", desc: "Your character's skill level in the relevant crafting skill." },
                { name: "Tool QL", type: "1 – 100", desc: "Quality of the primary tool used. Below your skill it averages down; above it grants diminishing-return bonuses." },
                { name: "Material QL", type: "1 – 100", desc: "Quality of the materials. Does NOT affect success chance — it caps result quality." },
                { name: "Item difficulty", type: "1 – 100", desc: "The item's built-in difficulty rating. Lower = easier to succeed." },
                { name: "Parent skill", type: "0 – 100", desc: "The parent skill (e.g. Smithing for Blacksmithing) contributes a small bonus via the Gaussian model." },
                { name: "Sleep bonus", type: "toggle", desc: "Doubles skill gain per action. Does not change success rate." },
              ]}
            />
            <P>
              The <strong className="text-text-primary">Expected materials</strong> figure
              accounts for failures — it shows how many materials you need on average, not just if
              every attempt succeeds. The <strong className="text-text-primary">Worst-case</strong>{" "}
              figure is the 95th-percentile scenario.
            </P>
            <Callout type="formula">
              Material waste uses the negative binomial distribution:{" "}
              <Code>E[attempts] = target / successRate</Code>. Worst case adds{" "}
              <Code>1.645 × stdDev</Code> extra attempts (95th percentile normal approximation).
            </Callout>

            <SubHeading id="crafting-optimizer">Skill Optimizer</SubHeading>
            <P>
              Scans the item database and ranks items by skill-gain efficiency for your current
              skill range. It scores items using the sweet-spot QL formula and the Gaussian
              model — items that land in your sweet-spot range and have a moderate success rate
              score highest.
            </P>
            <Callout type="tip">
              Filter by skill category (Blacksmithing, Carpentry, etc.) to see only items relevant
              to the skill you want to train.
            </Callout>

            <SubHeading id="crafting-session">Session Planner</SubHeading>
            <P>
              Plan an entire crafting session: choose an item, set a target quantity, and the
              planner builds a shopping list that accounts for expected failures and sub-recipe
              materials. It also shows the estimated session time using the decompiled action-timer
              formula.
            </P>

            {/* ── Skill Grinder ── */}
            <SectionHeading id="grinder">Skill Grinder</SectionHeading>
            <P>
              The grinder (<Link href="/grinder" className="text-accent hover:underline">/grinder</Link>){" "}
              is inspired by the classic dreamsleeve.org simulator. It answers two questions: how
              efficient is my current setup, and how many actions will it take to reach my target?
            </P>

            <SubHeading id="grinder-simulator">Per-Action Simulator</SubHeading>
            <P>Set your skill, the difficulty of the item you are working on, and your tool QL.
              The simulator instantly shows:</P>
            <ParamTable
              rows={[
                { name: "Gaussian Slide (Mean)", type: "number", desc: "The centre of the Gaussian bell-curve for your skill check. Values near +20 are optimal — enough success chance without killing skill gain. Negative = too hard; very high positive = too easy." },
                { name: "Success Rate", type: "1 – 99 %", desc: "Probability of a successful action. Clamped to 1–99 so there is always a chance of failure or success." },
                { name: "Effective Skill", type: "0 – 100", desc: "Your raw skill after The Curve is applied. This is what the game actually uses in calculations." },
                { name: "Gain / Action", type: "decimal", desc: "Expected skill gain per action, accounting for the stat divider (5.0 below skill 31, 45.0 above), action time, and any multipliers." },
                { name: "Actions to Next Level", type: "integer", desc: "How many actions at the current gain rate to reach the next whole skill level." },
              ]}
            />
            <Callout type="warning">
              The <strong>skill wall at 31</strong> is real: the stat divider jumps from 5.0 to 45.0,
              making gain roughly 9× slower overnight. The simulator reflects this — expect the
              &quot;Actions to Next Level&quot; number to spike sharply around skill 28–32.
            </Callout>
            <P>
              The <strong className="text-text-primary">Sweet Spot</strong> indicator turns green
              when your target difficulty falls within the sweet-spot QL range. Items in this range
              grant <strong className="text-text-primary">2× skill gain</strong> — the single
              biggest efficiency lever available.
            </P>

            <SubHeading id="grinder-path">Skill Path Planner</SubHeading>
            <P>
              Enter a start and target skill, and the planner generates a milestone-by-milestone
              progression table in 5-level segments. Each row shows the recommended target QL for
              that segment, the success rate at that stage, the actions needed, and cumulative
              totals. The <strong className="text-text-primary">Sleep Bonus</strong> and{" "}
              <strong className="text-text-primary">Server Rate</strong> multipliers scale all
              action counts and times proportionally.
            </P>
            <Callout type="tip">
              Enable Sleep Bonus before a long grind session and compare the &quot;Total Actions&quot;
              card — on 1× servers it halves the grind. On a 5× server with sleep bonus you can
              divide the vanilla estimate by 10.
            </Callout>

            {/* ── Cooking ── */}
            <SectionHeading id="cooking">Cooking &amp; Affinity</SectionHeading>
            <P>
              The cooking page (<Link href="/cooking" className="text-accent hover:underline">/cooking</Link>){" "}
              covers two distinct mechanics: <strong className="text-text-primary">Affinity</strong>{" "}
              (which skill a meal boosts) and{" "}
              <strong className="text-text-primary">CCFP</strong> (Calories, Carbs, Fat, Protein —
              the nutrition values that determine how long the meal&apos;s buff lasts).
            </P>

            <SubHeading id="cooking-affinity">Affinity Calculator</SubHeading>
            <P>
              Affinity is determined by a hash of: your player number (visible in the game
              character window), the cooker type, the container, and the combination of
              ingredients including their preparation methods. Changing any single ingredient or
              preparation shifts the result to a completely different skill.
            </P>
            <ParamTable
              rows={[
                { name: "Player Number", type: "integer", desc: "Your unique in-game character ID. Found in the game client character window. Every player has a different number so the same recipe gives different affinities to different players." },
                { name: "Cooker", type: "select", desc: "The cooking device used (campfire, forge, oven, etc.). Affects the affinity hash." },
                { name: "Container", type: "select", desc: "The cooking container (pottery bowl, frying pan, etc.). Also affects the hash." },
                { name: "Ingredients", type: "list", desc: "Each ingredient, its preparation (raw, chopped, diced…), and quantity. Order does not matter — the hash is commutative." },
              ]}
            />
            <Callout type="tip">
              Use the <strong>Discover</strong> tab to reverse-lookup: given an ingredient and preparation,
              find which player numbers it would produce an affinity for. Useful when you want a specific
              skill and are working backwards.
            </Callout>

            <SubHeading id="cooking-ccfp">CCFP Calculator</SubHeading>
            <P>
              CCFP values control the hunger timer and the magnitude of the affinity bonus. The
              calculator sums the nutritional values of your ingredients (adjusted by preparation
              and quantity) and shows the final C/C/F/P breakdown alongside the expected affinities
              active duration.
            </P>

            {/* ── Skills Tracker ── */}
            <SectionHeading id="skills">Skills Tracker</SectionHeading>
            <P>
              The skills page (<Link href="/skills" className="text-accent hover:underline">/skills</Link>){" "}
              lets you upload your Wurm skill dump (the{" "}
              <Code>skills.txt</Code> file exported from the game client) and track progress
              toward target skill levels.
            </P>
            <P>
              For each skill you can set a target level. The tracker uses the same
              stat-divider formula as the grinder to estimate how many actions and how much
              time remain. Results assume average conditions (mid sweet-spot difficulty, QL 50
              tool, no sleep bonus) — use the grinder for a more precise estimate with your
              actual setup.
            </P>
            <Callout type="info">
              Skills are stored per character on your account. You can track multiple
              characters and switch between them from the character selector.
            </Callout>

            {/* ── Formula Reference ── */}
            <SectionHeading id="formulas">Formula Reference</SectionHeading>
            <P>
              All formulas below come from two sources:{" "}
              <strong className="text-text-primary">decompiled Wurm Unlimited Java bytecode</strong>{" "}
              (via projects such as tehasdf/grinder, Luceat/skillmod, bdew-wurm/timerfix) and{" "}
              <strong className="text-text-primary">Wurmpedia</strong>. If you spot a discrepancy
              between these formulas and the live game, please{" "}
              <a href="#reporting" className="text-accent hover:underline">open an issue</a> with
              the skill/item/server details.
            </P>

            <SubHeading id="formula-curve">The Curve (Epic / Effective Skill)</SubHeading>
            <P>
              Converts your raw skill to the effective skill that is actually used in all game
              calculations. The curve is flatter at low levels (little penalty) and compresses
              at high levels (skill 100 raw = skill 100 effective; skill 70 raw ≈ 91 effective).
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateEffectiveSkill()">
              {`effectiveSkill = 2x − (x / 10)²

Examples:
  raw 20  → effective 36
  raw 50  → effective 75
  raw 70  → effective 91
  raw 100 → effective 100

Source: Wurmpedia "The Curve"`}
            </CodeBlock>
            <Callout type="info">
              This formula is only applied on Epic servers. On Freedom/Defiance the raw skill IS
              the effective skill. The calculators let you toggle this — check the &quot;Epic
              server&quot; option if you play on Epic.
            </Callout>

            <SubHeading id="formula-gaussian">Gaussian Skill Check Parameters</SubHeading>
            <P>
              Every skill check in Wurm Online uses a Gaussian (normal) distribution. The
              distribution is parameterised by a <strong className="text-text-primary">slide</strong>{" "}
              (the mean — how biased toward success or failure) and a{" "}
              <strong className="text-text-primary">sigma</strong> (the spread — how consistent
              the results are).
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — getGaussianParams() (decompiled WU)">
              {`// 1. Effective skill accounting for tool QL
//    toolQL < skill  → bonusSkill = (skill + toolQL) / 2
//    toolQL ≥ skill  → bonusSkill = skill + skill × (toolQL − skill) / 100
effectiveWithItem(skill, toolQL, parentBonus)

// 2. Slide — shifts the bell-curve left/right
slide = (effective³ − difficulty³) / 50000
      + (effective − difficulty)

// 3. Width / sigma — spread of the distribution
w     = 30 − |effective − difficulty| / 4
sigma = max(0.1,  w + |slide| / 6)

// 4. Actual roll (in-game):  roll = N(0,1) × sigma + slide
//    Positive roll  → success, roll magnitude = item QL
//    Negative roll  → failure

Source: decompiled WU rollGaussian / skillCheck (via tehasdf/grinder)`}
            </CodeBlock>
            <Callout type="tip">
              The <strong>optimal slide is approximately +20</strong>. At slide 20 the centre of
              the bell-curve is well past zero (good success rate) but the distribution still
              overlaps zero enough to produce meaningful skill ticks. Too high a slide (very easy
              difficulty) gives near-100 % success but tiny gains; too low (too hard) gives many
              failures that waste materials.
            </Callout>

            <SubHeading id="formula-success">Success Probability</SubHeading>
            <P>
              The probability of a successful action is the area of the Gaussian distribution that
              falls above zero — the standard normal CDF evaluated at{" "}
              <Code>slide / sigma</Code>.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateSuccessChance()">
              {`successChance = Φ(slide / sigma) × 100

where Φ is the standard normal CDF (area to the left).

Result is clamped to [1, 99] — the game never gives 0 % or 100 %.

Note: materialQL does NOT affect success chance.
      It only caps the maximum result quality.

Source: decompiled WU skillCheck`}
            </CodeBlock>

            <SubHeading id="formula-skillgain">Skill Gain (stat dividers)</SubHeading>
            <P>
              Skill gain per action is controlled by the{" "}
              <strong className="text-text-primary">stat divider</strong> — the single most
              important number in any grinding plan. It was extracted from the decompiled{" "}
              <Code>checkAdvance</Code> method.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — predictSkillGain() (decompiled WU)">
              {`statDivider = skill < 31 ? 5.0 : 45.0   ← the "skill wall"

skillFactor   = 1 / (statDivider + currentSkill)
difficultyMod = based on |difficulty − skill|:
  ≤ 10 → 1.0   (optimal range)
  ≤ 20 → 0.8
  ≤ 30 → 0.5
  > 30 → 0.3
timeMod       = sqrt(max(3, actionTime) / 10)

gainPerAction = skillFactor × difficultyMod × timeMod
              × (sleepBonus ? 2 : 1)
              × (inSweetSpot ? 2 : 1)

Source: decompiled WU checkAdvance (via Luceat/skillmod)`}
            </CodeBlock>
            <Callout type="warning">
              The jump from divider 5 to divider 45 at skill 31 is a 9× slowdown. No bug — it is
              intentional game design. Budget roughly 9× more actions for the 31–50 range
              compared to 1–30.
            </Callout>

            <SubHeading id="formula-sweetspot">Sweet Spot QL</SubHeading>
            <P>
              Items whose QL falls within the sweet-spot range award{" "}
              <strong className="text-text-primary">double skill gain</strong>. The sweet spot
              moves upward as your skill increases, meaning you need to keep upgrading the quality
              of what you work on.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateSweetSpotQL()">
              {`sweetSpotQL    = skill × 0.77 + 23
sweetSpotRange = [sweetSpotQL, sweetSpotQL + 10]

Examples:
  skill 20  → sweet spot QL 38.4 – 48.4
  skill 50  → sweet spot QL 61.5 – 71.5
  skill 70  → sweet spot QL 76.9 – 86.9
  skill 90  → sweet spot QL 92.3 – 100

Source: Wurmpedia "Creation quality"`}
            </CodeBlock>

            <SubHeading id="formula-maxql">Max Creation QL</SubHeading>
            <P>
              You cannot create or improve an item beyond the quality ceiling set by your skill.
              The sweet spot formula and max QL formula are actually the same — the upper limit of
              what you can create IS the sweet-spot centre.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateMaxCreationQL()">
              {`maxQL = min(100,  skill × 0.77 + 23)

Additionally capped by materialQL — you cannot produce
an item higher than the quality of the materials used.

finalCap = min(maxQL, materialQL)

Source: Wurmpedia "Creation quality"`}
            </CodeBlock>

            <SubHeading id="formula-actiontime">Action Time</SubHeading>
            <P>
              Action time controls how long each crafting action takes. Longer actions give more
              skill gain (via the <Code>timeMod</Code> factor). The formula was extracted from
              the decompiled <Code>getStandardActionTime</Code> method.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateCraftingTime() (decompiled WU)">
              {`skillMod = 1 − (skill / 200)           // up to 50 % faster at skill 100
toolMod  = 1 − (toolQL / 333)          // up to 30 % faster at QL 100
qlMod    = 1 + (targetQL / 100)        // up to 2× slower at QL 100
woaMod   = 1 − (woaPower × 0.003)      // Wind of Ages, up to 30 % faster

rawTime  = baseTime × skillMod × toolMod × qlMod × woaMod

// Fixed +3 s floor added AFTER all modifiers (decompiled WU)
finalTime = rawTime + 3.0

Source: decompiled WU getStandardActionTime (via bdew-wurm/timerfix)`}
            </CodeBlock>

            <SubHeading id="formula-toolwear">Tool Wear</SubHeading>
            <P>
              Tools take damage each action. Higher-QL tools wear more slowly; the{" "}
              <strong className="text-text-primary">Circle of Cunning (CoC)</strong> enchantment
              reduces wear directly.
            </P>
            <CodeBlock label="src/lib/wurm-formulas.ts — calculateToolWear()">
              {`baseDamage = 0.003 + (difficulty / 5000)
baseDamage × = (100 − toolQL × 0.3) / 100      // higher QL = less damage
baseDamage × = (100 − cocPower × 0.3) / 100    // CoC reduces wear

totalDamage = baseDamage × actions
repairsNeeded = floor(totalDamage / 10)        // tool breaks at 10 damage`}
            </CodeBlock>

            {/* ── Reporting Issues ── */}
            <SectionHeading id="reporting">Reporting Issues</SectionHeading>
            <P>
              If a calculator gives a result that does not match what you see in-game, please open
              an issue on GitHub. The most useful bug reports include:
            </P>
            <ul className="list-disc list-inside text-text-secondary text-sm space-y-1.5 mb-4 ml-2">
              <li>Which calculator and which tab (e.g. &quot;Crafting → Advanced&quot;)</li>
              <li>The exact input values (skill, difficulty, tool QL, etc.)</li>
              <li>What the calculator showed vs. what actually happened in-game</li>
              <li>Your server type (Freedom, Epic, Wurm Unlimited, and if WU — the server skill-gain rate)</li>
              <li>Whether you had sleep bonus or any enchantments active</li>
            </ul>
            <Callout type="info">
              The formulas are well-sourced but Wurm Online is updated frequently and some
              server configs differ from the vanilla values. A wrong result is usually one of:
              (a) a changed game formula, (b) a server-specific multiplier, or (c) an edge case
              not covered by the decompiled code.
            </Callout>
            <div className="mt-6">
              <a
                href={settings.social_discord || "/contact"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Report in our Discord
              </a>
            </div>

            {/* Bottom padding */}
            <div className="h-16" />
          </article>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MainLayout, Card, StatCard, Slider, Select, Button, ProgressBar } from "@/components";

interface SkillMetrics {
  effectiveSkill: number;
  maxCreationQL: number;
  sweetSpotQL: number;
  sweetSpotRange: { min: number; max: number };
}

interface OptimalItem {
  id: number;
  name: string;
  category: string;
  difficulty: number;
  successChance: number;
  isInSweetSpot: boolean;
}

interface SkillPathStep {
  from: number;
  to: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
}

interface OptimizerResult {
  currentSkill: number;
  targetSkill: number;
  metrics: SkillMetrics;
  optimalItems: OptimalItem[];
  skillPath: SkillPathStep[];
  summary: {
    totalActions: number;
    totalTime: string;
    skillGain: number;
  };
}

interface ComparisonMethod {
  method: string;
  multiplier: number;
  estimatedActions: number;
  estimatedHours: number;
  recommendation: string;
}

export default function SkillOptimizer() {
  const [currentSkill, setCurrentSkill] = useState(50);
  const [targetSkill, setTargetSkill] = useState(70);
  const [toolQL, setToolQL] = useState(50);
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);

  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{ comparison: ComparisonMethod[] } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetch("/api/items?categories=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      });
  }, []);

  const optimize = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skill: currentSkill.toString(),
        targetSkill: targetSkill.toString(),
        toolQL: toolQL.toString(),
      });
      if (category) params.set("category", category);

      const response = await fetch(`/api/skill-optimizer?${params}`);
      const data = await response.json();
      if (!data.error) setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const compareTrainingMethods = async () => {
    try {
      const response = await fetch("/api/skill-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "compare-methods", currentSkill, targetSkill }),
      });
      const data = await response.json();
      setComparisonResult(data);
      setShowComparison(true);
    } catch (error) {
      console.error("Comparison failed:", error);
    }
  };

  useEffect(() => {
    if (currentSkill < targetSkill) {
      const timer = setTimeout(optimize, 300);
      return () => clearTimeout(timer);
    }
  }, [currentSkill, targetSkill, toolQL, category]);

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  ];

  return (
    <MainLayout
      title="Skill Optimizer"
      subtitle="Maximize your training efficiency with smart recommendations"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Training Settings */}
          <Card title="Training Settings" icon="🎯">
            <div className="space-y-5">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Current Skill</span>
                  <span className="text-accent font-bold text-lg">{currentSkill}</span>
                </div>
                <input
                  type="range" min="1" max="99" value={currentSkill}
                  onChange={(e) => setCurrentSkill(parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Target Skill</span>
                  <span className="text-emerald-400 font-bold text-lg">{targetSkill}</span>
                </div>
                <input
                  type="range" min={currentSkill + 1} max="100" value={targetSkill}
                  onChange={(e) => setTargetSkill(parseInt(e.target.value))}
                  className="w-full h-2 bg-dark-input rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <Slider label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} color="info" />

              <Select
                label="Category Filter"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />

              <Button onClick={compareTrainingMethods} variant="secondary" fullWidth>
                📊 Compare Training Methods
              </Button>
            </div>
          </Card>

          {/* Skill Metrics */}
          {result && (
            <Card title="Your Skill Metrics" icon="📈">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-dark-input rounded-lg">
                  <span className="text-gray-400">Effective Skill</span>
                  <span className="text-white font-semibold">{result.metrics.effectiveSkill}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-dark-input rounded-lg">
                  <span className="text-gray-400">Max Creation QL</span>
                  <span className="text-blue-400 font-semibold">{result.metrics.maxCreationQL}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-dark-input rounded-lg">
                  <span className="text-gray-400">Sweet Spot QL</span>
                  <span className="text-emerald-400 font-semibold">
                    {result.metrics.sweetSpotRange.min} - {result.metrics.sweetSpotRange.max}
                  </span>
                </div>

                <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
                  <p className="text-emerald-300 text-sm">
                    <strong>Tip:</strong> Improve items in QL range {result.metrics.sweetSpotRange.min}-{result.metrics.sweetSpotRange.max} for double skill gain!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">📈</div>
              </div>
            </Card>
          )}

          {!loading && result && (
            <>
              {/* Summary */}
              <Card title={`Training Plan: ${currentSkill} → ${targetSkill}`} icon="🎯">
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <StatCard
                    label="Total Actions"
                    value={result.summary.totalActions.toLocaleString()}
                    icon="⚒"
                    color="accent"
                  />
                  <StatCard
                    label="Est. Time"
                    value={result.summary.totalTime}
                    icon="⏱"
                    color="info"
                  />
                  <StatCard
                    label="Skill Gain"
                    value={`+${result.summary.skillGain}`}
                    icon="📈"
                    color="success"
                  />
                </div>

                {/* Progress visualization */}
                <div className="mt-4 pt-4 border-t border-gold/10">
                  <ProgressBar
                    value={currentSkill}
                    max={100}
                    label={`Current: ${currentSkill} → Target: ${targetSkill}`}
                    color="bg-gradient-to-r from-accent to-emerald-500"
                    size="lg"
                  />
                </div>
              </Card>

              {/* Optimal Items */}
              <Card title="Best Items to Craft" icon="⭐">
                <div className="space-y-2">
                  {result.optimalItems.slice(0, 5).map((item, index) => (
                    <Link
                      key={item.id}
                      href={`/calculator?item=${item.id}`}
                      className={`
                        flex items-center justify-between rounded-lg p-3 sm:p-4 transition-all
                        ${item.isInSweetSpot
                          ? "bg-emerald-900/20 border border-emerald-700/30 hover:border-emerald-600/50"
                          : "bg-dark-input border border-gold/5 hover:border-gold/20"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                        <div className="min-w-0">
                          <span className="text-white font-semibold block truncate">{item.name}</span>
                          <span className="text-xs text-gray-500 capitalize">{item.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0 ml-2">
                        <div className="text-center hidden sm:block">
                          <div className="text-lg font-semibold text-accent">{item.difficulty}</div>
                          <div className="text-xs text-gray-500">Difficulty</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-semibold ${
                            item.successChance >= 45 && item.successChance <= 55 ? "text-emerald-400" : "text-amber-400"
                          }`}>
                            {item.successChance}%
                          </div>
                          <div className="text-xs text-gray-500">Success</div>
                        </div>
                        {item.isInSweetSpot && (
                          <span className="px-2 py-1 bg-emerald-600 text-white text-xs rounded font-bold">2×</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Skill Path */}
              <Card title="Progression Path" icon="🛤">
                <div className="space-y-3">
                  {result.skillPath.map((step, index) => (
                    <div key={index} className="relative">
                      {/* Progress indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold/10 rounded">
                        <div
                          className="absolute top-0 w-full bg-accent rounded"
                          style={{ height: `${((step.to - currentSkill) / (targetSkill - currentSkill)) * 100}%` }}
                        />
                      </div>

                      <div className="ml-4 bg-dark-input rounded-lg p-3 sm:p-4 border border-gold/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <span className="text-white font-semibold">Level {step.from} → {step.to}</span>
                          <span className="text-accent text-sm">{step.actionsNeeded.toLocaleString()} actions</span>
                        </div>
                        <p className="text-sm text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Training Comparison */}
              {showComparison && comparisonResult?.comparison && (
                <Card title="Training Methods Comparison" icon="📊">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {comparisonResult.comparison.map((method, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-4 ${
                          method.recommendation === "Recommended"
                            ? "bg-purple-900/20 border border-purple-700/30"
                            : "bg-dark-input border border-gold/5"
                        }`}
                      >
                        <div className="font-semibold text-white mb-2">{method.method}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Actions:</span>{" "}
                            <span className="text-accent">{method.estimatedActions.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Time:</span>{" "}
                            <span className="text-purple-400">{method.estimatedHours}h</span>
                          </div>
                        </div>
                        {method.multiplier > 1 && (
                          <div className="mt-2 text-xs text-emerald-400">
                            {method.multiplier}× faster than base
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {!loading && !result && (
            <Card>
              <div className="text-center py-12 sm:py-16">
                <div className="text-6xl sm:text-7xl mb-4 opacity-20">📈</div>
                <h3 className="text-lg sm:text-xl text-gray-400 mb-2">Ready to Optimize</h3>
                <p className="text-gray-500 text-sm">Adjust skill levels to see training recommendations</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

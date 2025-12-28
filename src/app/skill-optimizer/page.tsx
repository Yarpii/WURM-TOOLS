"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

export default function SkillOptimizer() {
  const [currentSkill, setCurrentSkill] = useState(50);
  const [targetSkill, setTargetSkill] = useState(70);
  const [toolQL, setToolQL] = useState(50);
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);

  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Training comparison
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/items?categories=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      });
  }, []);

  // Fetch optimization data
  const optimize = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skill: currentSkill.toString(),
        targetSkill: targetSkill.toString(),
        toolQL: toolQL.toString(),
      });
      if (category) {
        params.set("category", category);
      }

      const response = await fetch(`/api/skill-optimizer?${params}`);
      const data = await response.json();

      if (!data.error) {
        setResult(data);
      }
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Compare training methods
  const compareTrainingMethods = async () => {
    try {
      const response = await fetch("/api/skill-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compare-methods",
          currentSkill,
          targetSkill,
        }),
      });
      const data = await response.json();
      setComparisonResult(data);
    } catch (error) {
      console.error("Comparison failed:", error);
    }
  };

  // Calculate on skill change
  useEffect(() => {
    if (currentSkill < targetSkill) {
      const timer = setTimeout(optimize, 300);
      return () => clearTimeout(timer);
    }
  }, [currentSkill, targetSkill, toolQL, category]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">&#128200;</span>
              <div>
                <h1 className="text-xl font-bold text-amber-500">Skill Optimizer</h1>
                <p className="text-xs text-gray-400">Maximize your training efficiency</p>
              </div>
            </Link>
            <nav className="flex gap-4">
              <Link href="/" className="text-gray-400 hover:text-amber-500 transition-colors text-sm">
                Basic Calculator
              </Link>
              <Link href="/calculator" className="text-gray-400 hover:text-amber-500 transition-colors text-sm">
                Advanced Calculator
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-amber-500 mb-4">Training Settings</h2>

              {/* Current Skill */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Current Skill: <span className="text-amber-500 text-lg">{currentSkill}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="99"
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Target Skill */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Target Skill: <span className="text-green-500 text-lg">{targetSkill}</span>
                </label>
                <input
                  type="range"
                  min={currentSkill + 1}
                  max="100"
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(parseInt(e.target.value))}
                  className="w-full accent-green-500"
                />
              </div>

              {/* Tool QL */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">
                  Tool QL: <span className="text-amber-500">{toolQL}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={toolQL}
                  onChange={(e) => setToolQL(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Category Filter</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compare Button */}
              <button
                onClick={compareTrainingMethods}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Compare Training Methods
              </button>
            </div>

            {/* Skill Metrics */}
            {result && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-amber-500 mb-4">Your Skill Metrics</h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Effective Skill</span>
                    <span className="text-white text-lg font-semibold">
                      {result.metrics.effectiveSkill}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max Creation QL</span>
                    <span className="text-blue-400 text-lg font-semibold">
                      {result.metrics.maxCreationQL}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sweet Spot QL</span>
                    <span className="text-green-400 text-lg font-semibold">
                      {result.metrics.sweetSpotRange.min} - {result.metrics.sweetSpotRange.max}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                    <p className="text-green-300 text-sm">
                      <strong>Tip:</strong> Improve items in the QL range{" "}
                      {result.metrics.sweetSpotRange.min}-{result.metrics.sweetSpotRange.max} for
                      double skill gain!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {loading && (
              <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
                <div className="animate-spin text-4xl mb-4">&#128200;</div>
                <p className="text-gray-400">Optimizing...</p>
              </div>
            )}

            {!loading && result && (
              <>
                {/* Summary */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold text-amber-500 mb-4">
                    Training Plan: {currentSkill} → {targetSkill}
                  </h2>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-amber-400 mb-1">
                        {result.summary.totalActions.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">Total Actions</div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-purple-400 mb-1">
                        {result.summary.totalTime}
                      </div>
                      <div className="text-sm text-gray-400">Estimated Time</div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-400 mb-1">
                        +{result.summary.skillGain}
                      </div>
                      <div className="text-sm text-gray-400">Skill Gain</div>
                    </div>
                  </div>
                </div>

                {/* Optimal Items */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold text-amber-500 mb-4">
                    Best Items to Craft
                  </h2>

                  <div className="space-y-2">
                    {result.optimalItems.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-lg p-4 ${
                          item.isInSweetSpot
                            ? "bg-green-900/30 border border-green-700/50"
                            : "bg-gray-700/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold text-gray-600">#{index + 1}</span>
                          <div>
                            <Link
                              href={`/calculator?item=${item.id}`}
                              className="text-white hover:text-amber-500 transition-colors font-semibold"
                            >
                              {item.name}
                            </Link>
                            <div className="text-xs text-gray-500">{item.category}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-amber-400">
                              {item.difficulty}
                            </div>
                            <div className="text-xs text-gray-500">Difficulty</div>
                          </div>

                          <div className="text-center">
                            <div
                              className={`text-lg font-semibold ${
                                item.successChance >= 45 && item.successChance <= 55
                                  ? "text-green-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {item.successChance}%
                            </div>
                            <div className="text-xs text-gray-500">Success</div>
                          </div>

                          {item.isInSweetSpot && (
                            <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">
                              2x Gain
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Path */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold text-amber-500 mb-4">
                    Progression Path
                  </h2>

                  <div className="space-y-3">
                    {result.skillPath.map((step, index) => (
                      <div key={index} className="relative">
                        {/* Progress Bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700 rounded">
                          <div
                            className="absolute top-0 w-full bg-amber-500 rounded"
                            style={{
                              height: `${((step.to - currentSkill) / (targetSkill - currentSkill)) * 100}%`,
                            }}
                          />
                        </div>

                        <div className="ml-4 bg-gray-700/30 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-semibold">
                              Level {step.from} → {step.to}
                            </span>
                            <span className="text-amber-400">{step.actionsNeeded} actions</span>
                          </div>
                          <p className="text-sm text-gray-400">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Comparison */}
                {comparisonResult && (
                  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-purple-400 mb-4">
                      Training Methods Comparison
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                      {comparisonResult.comparison?.map((method: any, index: number) => (
                        <div
                          key={index}
                          className={`rounded-lg p-4 ${
                            method.recommendation === "Recommended"
                              ? "bg-purple-900/30 border border-purple-700/50"
                              : "bg-gray-700/30"
                          }`}
                        >
                          <div className="font-semibold text-white mb-2">{method.method}</div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Actions:</span>{" "}
                              <span className="text-amber-400">
                                {method.estimatedActions.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Time:</span>{" "}
                              <span className="text-purple-400">{method.estimatedHours}h</span>
                            </div>
                          </div>
                          {method.multiplier > 1 && (
                            <div className="mt-2 text-xs text-green-400">
                              {method.multiplier}x faster than base
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !result && (
              <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4 opacity-20">&#128200;</div>
                <h3 className="text-xl text-gray-400 mb-2">Ready to Optimize</h3>
                <p className="text-gray-500">
                  Adjust your skill levels to see optimal training recommendations
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

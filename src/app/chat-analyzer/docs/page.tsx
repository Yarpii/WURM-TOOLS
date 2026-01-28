"use client";

import Link from "next/link";

export default function ChatAnalyzerDocsPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/chat-analyzer"
            className="text-accent hover:underline text-sm mb-4 inline-block"
          >
            &larr; Back to Chat Analyzer
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Chat Forensics Analyzer - Documentation
          </h1>
          <p className="text-text-secondary">
            Technical overview of the algorithms and detection methods used in v4.1
          </p>
        </div>

        {/* Introduction */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Overview</h2>
          <p className="text-text-secondary mb-4">
            The Chat Forensics Analyzer uses multiple forensic linguistics techniques to detect
            alternative accounts (alts) and analyze social relationships between players. The system
            combines temporal analysis, stylometry, behavioral patterns, and network analysis to
            provide comprehensive insights.
          </p>
          <div className="bg-info/10 border border-info/30 rounded-lg p-4 text-sm">
            <strong className="text-info">Open Source:</strong>
            <span className="text-text-secondary ml-2">
              This project is open source. If you have ideas to improve the algorithms or spot
              issues, feel free to contribute on{" "}
              <a
                href="https://github.com/Yarpii/WURM-TOOLS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub
              </a>
              .
            </span>
          </div>
        </section>

        {/* Temporal Analysis */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-error mb-4">1. Temporal Analysis</h2>
          <p className="text-text-secondary mb-4">
            Analyzes when players are online to detect accounts that are never active at the same time.
          </p>

          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Never Online Together</h3>
              <p className="text-text-secondary text-sm mb-2">
                If two accounts are never online at the same time (0 overlapping minutes) despite
                both being highly active, this is a strong indicator they may be controlled by the
                same person.
              </p>
              <div className="text-xs text-text-muted">
                Score: <span className="text-error font-mono">+45 points</span> (weighted)
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Handoff Pattern Detection</h3>
              <p className="text-text-secondary text-sm mb-2">
                Detects when one player stops talking and another starts within 5 minutes. This
                &quot;handoff&quot; pattern suggests someone switching between accounts.
              </p>
              <ul className="text-xs text-text-muted list-disc list-inside space-y-1">
                <li>Session gap: 10 minutes (considered &quot;stopped talking&quot;)</li>
                <li>Handoff window: 5 minutes</li>
                <li>Score: up to <span className="text-error font-mono">+40 points</span> if 50%+ transitions are handoffs</li>
              </ul>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Complementary Schedules</h3>
              <p className="text-text-secondary text-sm mb-2">
                Analyzes time-of-day activity patterns. If two accounts are never online together
                AND have different activity patterns (one plays mornings, another evenings), this
                adds extra suspicion.
              </p>
            </div>
          </div>
        </section>

        {/* Linguistic Analysis */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-warning mb-4">2. Linguistic Analysis</h2>
          <p className="text-text-secondary mb-4">
            The most reliable detection method. Analyzes writing style which is very difficult to fake.
          </p>

          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Function Word Analysis</h3>
              <p className="text-text-secondary text-sm mb-2">
                <strong>Most reliable feature!</strong> Function words (the, a, an, I, you, but, and, etc.)
                are used unconsciously and are nearly impossible to fake. We analyze:
              </p>
              <ul className="text-xs text-text-muted list-disc list-inside space-y-1">
                <li>Articles (the, a, an)</li>
                <li>Pronouns (I, you, he, she, we, they)</li>
                <li>Prepositions (in, on, at, to, for)</li>
                <li>Conjunctions (and, but, or, so, because)</li>
                <li>Auxiliaries (is, are, was, have, will, can)</li>
                <li>I vs We ratio (personal vs collective language)</li>
              </ul>
              <div className="text-xs text-text-muted mt-2">
                Score: up to <span className="text-warning font-mono">+35 points</span> for 92%+ similarity
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Character N-grams</h3>
              <p className="text-text-secondary text-sm mb-2">
                Analyzes 3-character sequences in text. This captures typing patterns, common
                letter combinations, and subconscious writing habits.
              </p>
              <div className="text-xs text-text-muted">
                Threshold: 97%+ = high match, 94%+ = medium match
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Vocabulary Complexity</h3>
              <p className="text-text-secondary text-sm mb-2">
                Statistical measures of writing complexity:
              </p>
              <ul className="text-xs text-text-muted list-disc list-inside space-y-1">
                <li><strong>Yule&apos;s K:</strong> Vocabulary richness measure</li>
                <li><strong>Simpson&apos;s D:</strong> Diversity index</li>
                <li><strong>Brunet&apos;s W:</strong> Vocabulary size statistic</li>
              </ul>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Typo Patterns</h3>
              <p className="text-text-secondary text-sm mb-2">
                People make consistent typos. Shared distinctive typos (teh, alot, jsut) are
                strong evidence of the same person.
              </p>
              <div className="text-xs text-text-muted">
                Score: <span className="text-warning font-mono">+25 points</span> for 3+ shared typos
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Micro-patterns</h3>
              <p className="text-text-secondary text-sm mb-2">
                Small typing habits that are hard to change:
              </p>
              <ul className="text-xs text-text-muted list-disc list-inside space-y-1">
                <li>Lowercase &quot;i&quot; instead of &quot;I&quot;</li>
                <li>No capital letters at start of sentences</li>
                <li>EXCESSIVE CAPS usage</li>
                <li>Number substitutions (2 for &quot;to&quot;, 4 for &quot;for&quot;)</li>
                <li>Double spaces between words</li>
                <li>No space after punctuation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Behavioral Analysis */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-accent mb-4">3. Behavioral Analysis</h2>
          <p className="text-text-secondary mb-4">
            How players interact with the chat and what they talk about.
          </p>

          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Message Length Distribution</h3>
              <p className="text-text-secondary text-sm">
                People have consistent message lengths. If two accounts have very similar message
                length distributions, they may be the same person.
              </p>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Greeting/Farewell Style</h3>
              <p className="text-text-secondary text-sm">
                How someone greets (hi, hey, hello, yo) and says goodbye (cya, bye, later, bb)
                is a consistent personal habit.
              </p>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Common Phrases</h3>
              <p className="text-text-secondary text-sm">
                Unique phrases and expressions that both accounts use. 3+ shared unique phrases
                is significant.
              </p>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4">
              <h3 className="font-semibold text-text-primary mb-2">Rare Word Fingerprint</h3>
              <p className="text-text-secondary text-sm">
                Words 5+ characters long that only 1-2 players use. Shared rare vocabulary is
                a strong indicator of the same author.
              </p>
            </div>
          </div>
        </section>

        {/* Social Analysis (v4.1) */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-success mb-4">4. Social Analysis (v4.1)</h2>
          <p className="text-text-secondary mb-4">
            New in v4.1: Analyzes social relationships and detects suspicious interaction patterns.
          </p>

          <div className="space-y-4">
            <div className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-error">
              <h3 className="font-semibold text-text-primary mb-2">Self-Talk Detection</h3>
              <p className="text-text-secondary text-sm mb-2">
                <strong>Key insight:</strong> If two accounts TALK to each other but have the SAME
                writing style, this is very suspicious. Real friends have different writing styles.
              </p>
              <p className="text-text-secondary text-sm mb-2">
                This detects people who create alt accounts and talk to themselves to make them
                seem like real separate people.
              </p>
              <div className="text-xs text-text-muted">
                Score: up to <span className="text-error font-mono">+45 points</span> (heavily weighted)
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-warning">
              <h3 className="font-semibold text-text-primary mb-2">Conflict Detection</h3>
              <p className="text-text-secondary text-sm mb-2">
                <strong>Anti-alt evidence:</strong> If two players are online together but never
                interact with each other (while both chatting with others), they&apos;re probably
                different people who don&apos;t like each other.
              </p>
              <p className="text-text-secondary text-sm mb-2">
                This REDUCES alt suspicion because alts controlled by the same person wouldn&apos;t
                be online at the same time.
              </p>
              <div className="text-xs text-text-muted">
                Score: <span className="text-success font-mono">-15 points</span> (reduces suspicion)
              </div>
            </div>

            <div className="bg-bg-tertiary rounded-lg p-4 border-l-4 border-info">
              <h3 className="font-semibold text-text-primary mb-2">Slip Detection</h3>
              <p className="text-text-secondary text-sm mb-2">
                Detects inconsistencies in typing style within a single account. Someone trying
                to type differently may &quot;slip&quot; back to their natural style.
              </p>
              <ul className="text-xs text-text-muted list-disc list-inside space-y-1">
                <li>Capitalization style changes during session</li>
                <li>Typo patterns appear/disappear</li>
                <li>Vocabulary shifts</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Algorithm Modes */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">5. Algorithm Modes</h2>
          <p className="text-text-secondary mb-4">
            Different presets for different use cases.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-text-primary">Mode</th>
                  <th className="text-left py-2 text-text-primary">Min Score</th>
                  <th className="text-left py-2 text-text-primary">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                <tr className="border-b border-border">
                  <td className="py-2 font-mono">balanced</td>
                  <td className="py-2">70</td>
                  <td className="py-2">Good balance between accuracy and sensitivity (default)</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono">strict</td>
                  <td className="py-2">100</td>
                  <td className="py-2">Fewer false positives, only high-confidence matches</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono">sensitive</td>
                  <td className="py-2">50</td>
                  <td className="py-2">Catches more potential alts, may have more false positives</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono">temporal</td>
                  <td className="py-2">60</td>
                  <td className="py-2">Emphasis on timing patterns and handoffs</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 font-mono">linguistic</td>
                  <td className="py-2">60</td>
                  <td className="py-2">Emphasis on writing style analysis</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono">wurm</td>
                  <td className="py-2">65</td>
                  <td className="py-2">Tuned for Wurm Online specific patterns</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Confidence Scoring */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">6. Confidence Categories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-error/10 border border-error rounded-lg p-4">
              <h3 className="font-semibold text-error mb-2">Critical</h3>
              <p className="text-text-secondary text-sm">
                Never online together + 3+ very strong reasons + 82%+ confidence.
                Very likely the same person.
              </p>
            </div>

            <div className="bg-warning/10 border border-warning rounded-lg p-4">
              <h3 className="font-semibold text-warning mb-2">High</h3>
              <p className="text-text-secondary text-sm">
                72%+ confidence + 2+ very strong reasons.
                Strong evidence of alt account.
              </p>
            </div>

            <div className="bg-info/10 border border-info rounded-lg p-4">
              <h3 className="font-semibold text-info mb-2">Medium</h3>
              <p className="text-text-secondary text-sm">
                55%+ confidence. Suspicious but needs more evidence.
              </p>
            </div>

            <div className="bg-bg-tertiary border border-border rounded-lg p-4">
              <h3 className="font-semibold text-text-secondary mb-2">Low</h3>
              <p className="text-text-secondary text-sm">
                Some similarities but not enough to be confident.
              </p>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-text-primary mb-4">7. Limitations</h2>

          <ul className="space-y-3 text-text-secondary">
            <li className="flex gap-2">
              <span className="text-warning">&#9888;</span>
              <span>
                <strong>Not 100% accurate:</strong> This is probabilistic analysis, not proof.
                Always use human judgment.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">&#9888;</span>
              <span>
                <strong>Needs enough data:</strong> Works best with 30+ messages per player.
                Small samples may give unreliable results.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">&#9888;</span>
              <span>
                <strong>Similar writing styles:</strong> Some people naturally write similarly.
                Shared communities may develop similar language.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">&#9888;</span>
              <span>
                <strong>Shared devices:</strong> Family members using the same computer may
                show temporal patterns that look like alt switching.
              </span>
            </li>
          </ul>
        </section>

        {/* Contributing */}
        <section className="bg-accent/10 border border-accent/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-accent mb-4">Contribute</h2>
          <p className="text-text-secondary mb-4">
            Have ideas to improve the algorithms? Found a bug? Want to add new detection methods?
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/Yarpii/WURM-TOOLS/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors inline-flex items-center gap-2"
            >
              Open an Issue
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://github.com/Yarpii/WURM-TOOLS/pulls"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-bg-tertiary/80 transition-colors inline-flex items-center gap-2"
            >
              Submit a PR
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-text-muted">
          <p>Chat Forensics Analyzer v4.1 - Made for the Wurm Online community</p>
        </div>
      </div>
    </div>
  );
}

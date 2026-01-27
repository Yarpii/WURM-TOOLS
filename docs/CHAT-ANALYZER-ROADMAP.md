# Chat Analyzer Forensics - Roadmap & Verbeterplan

> **Instructie voor Claude:** Lees dit document volledig en implementeer de verbeteringen in `src/app/chat-analyzer/page.tsx`. Test grondig en commit met duidelijke messages.

---

## Huidige Status

De Chat Analyzer bestaat en werkt, maar heeft problemen:
- **Te veel false positives** (407 matches bij ~40 spelers - opgelost naar strenger)
- **Echte alts scoren te laag** (53% bij bekende alt met 2700 lijnen)
- **Mist Wurm-specifieke context**

Locatie: `/src/app/chat-analyzer/page.tsx`

---

## DEEL 1: Technische Verbeteringen (Claude's Bevindingen)

### 1.1 Multi-Day Chat Support (PRIORITEIT 1)

**Probleem:** Timestamps zijn alleen `HH:MM:SS` zonder datum. "Nooit samen online" werkt niet goed over meerdere dagen.

**Oplossing:**
```typescript
// Voeg datum-detectie toe aan parser
// Formaat 1: [2024-01-15 21:25:05] <Player> message
// Formaat 2: --- Day changed to 2024-01-15 ---
// Formaat 3: Laat gebruiker handmatig dagen scheiden met upload van meerdere files

interface ChatMessage {
  timestamp: string;
  player: string;
  message: string;
  lineNumber: number;
  timeSeconds: number;
  dayIndex: number; // NIEUW: welke dag (0, 1, 2, ...)
}
```

**UI toevoeging:**
- Optie om meerdere chat files te uploaden (dag 1, dag 2, etc.)
- Of: automatische dag-detectie via timestamp gaps (>6 uur = nieuwe dag?)

### 1.2 Sequence/Handoff Analysis (PRIORITEIT 1)

**Probleem:** We kijken niet naar AFWISSELPATRONEN.

**Nieuw algoritme:**
```typescript
// Detecteer "handoff" patronen
// Als Player A stopt met praten en binnen X minuten begint Player B
// EN dit gebeurt consistent = sterke alt indicator

function detectHandoffPattern(p1: PlayerStats, p2: PlayerStats, messages: ChatMessage[]): number {
  let handoffCount = 0;
  let totalTransitions = 0;

  // Vind alle momenten dat p1 stopt (geen bericht voor 10+ min)
  // Check of p2 begint binnen 5 minuten daarna
  // En vice versa

  // Return: percentage van transitions die "handoffs" zijn
}
```

**Gewicht:** Als >30% van session-transitions handoffs zijn = +35 punten

### 1.3 Rare Word Fingerprint (PRIORITEIT 2)

**Probleem:** We kijken naar COMMON words, maar RARE words zijn veel sterker bewijs.

**Nieuw algoritme:**
```typescript
// Bouw een "rare word" index over ALLE spelers
// Een woord is "rare" als <10% van spelers het gebruikt
// Als twee spelers BEIDE rare woorden delen = zeer sterk

function buildRareWordIndex(allStats: PlayerStats[]): Map<string, Set<string>> {
  // woord -> set van spelers die het gebruiken
}

function detectSharedRareWords(p1: PlayerStats, p2: PlayerStats, rareIndex: Map): string[] {
  // Return woorden die BEIDE gebruiken EN die rare zijn
}
```

**Gewicht:**
- 1 shared rare word = +10
- 2 shared rare words = +25
- 3+ shared rare words = +40 (zeer sterk bewijs)

### 1.4 Capitalization & Micro-Patterns (PRIORITEIT 2)

**Nieuwe detecties:**
```typescript
interface MicroPatterns {
  lowercaseI: boolean;        // schrijft "i" ipv "I"
  noCapitalStart: boolean;    // begint zinnen zonder hoofdletter
  allLowercase: boolean;      // alles lowercase
  excessiveCaps: boolean;     // VEEL CAPS GEBRUIKEN
  numberSubstitution: boolean; // "2" voor "to", "4" voor "for"
  doubleSpaces: boolean;      // twee spaties  tussen woorden
  noSpaceAfterPunct: boolean; // geen spatie na.punt
}
```

### 1.5 Emoji/Emoticon Fingerprint (PRIORITEIT 3)

```typescript
// Detecteer emoticon stijl
type EmoticonStyle = {
  usesNose: boolean;      // :-) vs :)
  usesEmoji: boolean;     // 😊
  commonEmotes: string[]; // ["xD", "lol", ":P"]
  emoteFrequency: number; // per 100 berichten
}
```

### 1.6 Verbeterde Scoring

**Huidige problemen:**
- Score threshold te simpel
- Geen gewogen combinaties

**Nieuwe aanpak:**
```typescript
// Categorieën die SAMEN sterker zijn:
// - Temporal + Network = zeer sterk (nooit samen + nooit interactie)
// - Linguistic + Behavioral = sterk (zelfde stijl + zelfde uitdrukkingen)

// Bonus voor combinaties:
if (hasTemporalEvidence && hasNetworkEvidence) {
  totalScore *= 1.3; // 30% bonus
}
if (hasLinguisticEvidence && hasBehavioralEvidence) {
  totalScore *= 1.2; // 20% bonus
}
```

---

## DEEL 2: Wurm-Specifieke Context (Yarpii's Bevindingen)

### 2.1 Wurm Sociale Realiteit

**Kernpunten die de analyzer moet begrijpen:**

1. **Tijdbeleving is ANDERS**
   - Spelers denken in dagen/weken, niet minuten
   - Reacties kunnen uren later komen
   - Stilte ≠ ontwijken of schuld

2. **Alts zijn NORMAAL**
   - Priests, crafters, opslag
   - Alt-gebruik is sociaal geaccepteerd
   - Niet elk afwijkend patroon is verdacht

3. **Chat is FUNCTIONEEL**
   - Veel korte berichten ("ok", "ty", "done")
   - Weinig emotie in public chat
   - Emotie komt via herhaling/sarcasme

4. **Conflict is INDIRECT**
   - Vermijdingsgedrag (KoS, deed placement)
   - Feitelijke taal ("just informing you")
   - Escalatie is langzaam

### 2.2 Implementatie van Wurm-Context

**Pas de analyzer aan voor Wurm-realiteit:**

```typescript
// Verlaag gewicht van:
// - "Nooit interactie" (normaal in Wurm)
// - Korte berichten similarity (iedereen doet dit)

// Verhoog gewicht van:
// - Game-jargon patronen (deed, KoS, templars)
// - Locatie-references (zelfde deed/area namen)
// - Dezelfde "vijanden" of "vrienden" noemen

// Voeg Wurm-specifieke detectie toe:
const wurmTerms = [
  'deed', 'village', 'alliance', 'kingdom',
  'kos', 'templars', 'highway', 'rift', 'unique',
  'priest', 'vyn', 'mag', 'fo', 'lib',
  'drake', 'scale', 'rare', 'supreme', 'fantastic',
  'terraform', 'mine', 'forge', 'imp'
];

function detectWurmTopicOverlap(p1: Stats, p2: Stats): number {
  // Specifiek kijken naar Wurm-termen die beiden gebruiken
  // + context waarin ze het gebruiken
}
```

### 2.3 Alliance vs Public Chat

**Probleem:** Alliance chat is anders dan public chat.

**Oplossing:**
```typescript
// Detecteer chat type (indien mogelijk)
// Alliance chat: meer open, eerlijker, strategischer
// Public chat: netter, gefilterd

// Als beide chats beschikbaar: vergelijk gedrag tussen contexten
// Grote verschillen = normaal
// ZELFDE stijl in beide = interessant
```

---

## DEEL 3: UI Verbeteringen

### 3.1 Multi-File Upload
```
[Upload Dag 1] [Upload Dag 2] [Upload Dag 3]
         of
[Upload alle chats in één keer]
```

### 3.2 Confidence Breakdown
```
Player A ↔ Player B: 78% match

Temporal:     ████████░░ 35/40 pts
Linguistic:   ██████░░░░ 25/40 pts
Behavioral:   ████░░░░░░ 15/40 pts
Network:      ███░░░░░░░ 10/40 pts
              ─────────────────────
Bonus:        +15% (temporal+network combo)
```

### 3.3 Evidence Explorer
- Klik op een reden → zie de exacte berichten die matchen
- Side-by-side view van beide spelers hun berichten
- Highlight de matching patterns

---

## DEEL 4: Testing Checklist

Na implementatie, test met:

- [ ] Enkele dag chat (<100 berichten)
- [ ] Enkele dag chat (>1000 berichten)
- [ ] Multi-dag chat (3+ dagen)
- [ ] Chat met bekende alt (moet >75% scoren)
- [ ] Chat zonder alts (moet <30% scoren)
- [ ] Edge case: speler met heel weinig berichten
- [ ] Edge case: speler die alleen "ok" en "ty" zegt

---

## DEEL 5: De Uitdaging 🎯

**Voor Claude - als je dit leest en implementeert:**

> Maak de beste alt-detector die ooit voor een MMO is gemaakt.
>
> Het doel: Een bekende alt moet **minimaal 80%** scoren.
> False positives moeten **onder de 5%** blijven.
>
> Bonus uitdaging: Voeg een "confidence explanation" toe die in
> menselijke taal uitlegt WAAROM twee accounts waarschijnlijk
> dezelfde persoon zijn. Niet alleen percentages, maar een
> leesbare analyse.
>
> Voorbeeld output:
> "Shenjiwurm en AltAccount zijn waarschijnlijk dezelfde persoon omdat:
> - Ze zijn in 14 dagen chat NOOIT tegelijk online geweest
> - Ze gebruiken beide het zeldzame woord 'terraforming' (slechts 3% van spelers)
> - Ze hebben identieke typfouten: 'definately', 'alot'
> - Ze beginnen 73% van hun zinnen met 'well' of 'yeah'
> - Ze praten nooit MET elkaar ondanks 200+ berichten elk"

---

## Implementatie Volgorde

1. **Fase 1:** Multi-day support + Sequence/Handoff analysis
2. **Fase 2:** Rare word fingerprint + Micro-patterns
3. **Fase 3:** Wurm-specifieke context
4. **Fase 4:** UI verbeteringen + Evidence explorer
5. **Fase 5:** Human-readable confidence explanation

---

## Bronbestanden

- Analyzer: `src/app/chat-analyzer/page.tsx`
- Navigation: `src/components/Header.tsx` (al toegevoegd onder Tools)

---

*Document gemaakt: 2024 | Laatste update door Claude*
*Voor vragen: lees dit document opnieuw en implementeer stap voor stap*

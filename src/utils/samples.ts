import { DocumentItem } from '../types';

export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'sample-essay',
    title: 'The Architecture of Human Attention',
    updatedAt: Date.now() - 1000 * 60 * 30,
    tags: ['Essay', 'Typography', 'Philosophy'],
    content: `# The Architecture of Human Attention

> [!NOTE] Editorial Reflection
> "Typography is to the reader what cadence is to the speaker: it carries the emotional weight of silence and emphasis."

Typography is not merely the mechanical arrangement of letterforms upon a surface; it is the physical architecture through which thought becomes communion[^1]. When we write, we create a spatial environment for another consciousness to inhabit.

In an age dominated by chaotic digital feeds and relentless cognitive fragmentation, the quiet discipline of distraction-free reading acts as a sanctuary. The eye seeks rhythm: the comfortable measure of sixty-eight characters, the gentle breathing room of balanced leading, and the quiet dignity of a well-cut serif.

## The Triad of Reading Comfort

Every sublime typographic composition rests upon three harmonious pillars:

1. **The Measure (Column Width)**: The optimal line length should span between 55 and 75 characters. Too narrow, and the eye tires from constant line breaks; too wide, and finding the next line becomes an exhausting expedition.
2. **The Leading (Line Height)**: Vertical space must reflect the typeface's x-height and weight. A generous $1.6 \\times$ line spacing allows words to breathe without drifting apart.
3. **The Contrast & Surface**: Glare fatigues the retina. Warm paper tones like linen and sepia soften the stark intensity of backlight screens.

### Typographic Principles Matrix

| Principle | Optimal Setting | Perceptual Benefit | Priority |
| :--- | :--- | :--- | :--- |
| **Line Measure** | $65 - 72\\text{ch}$ | Prevents eye travel strain | High |
| **Body Size** | $18 - 20\\text{px}$ | Instant legibility on modern retina displays | Critical |
| **Heading Ratio** | $1.333$ (Perfect 4th) | Logical visual hierarchy without aggression | Medium |
| **Parchment Tint** | $\\Delta E < 5\\%$ warm shift | Calms photopic optical tension | High |

---

## On Form and Intention

> [!TIP] Deep Work Practice
> When drafting long-form essays, enjoy comfortable reading with generous vertical leading and soft paper contrast.

Consider the timeless mathematics of page geometry:

$$
\\text{Optimal Measure } (W) \\approx 2.5 \\times \\text{Point Size } (pt) \\times \\sqrt{\\text{Cap Height}}
$$

As Jan Tschichold famously observed in *The New Typography*, genuine simplicity is neither barren nor careless. It is the result of relentless subtraction until nothing superfluous remains to obstruct understanding.

### Writing Rituals Checklist

- [x] Select a typeface whose cadence matches your theme
- [x] Tune vertical leading to ensure effortless scanning
- [ ] Eliminate peripheral browser tabs and notifications
- [ ] Read the final draft aloud to test cadence and breath

[^1]: Tschichold, Jan. *The Form of the Book: Essays on the Morality of Good Design*. Hartley & Marks, 1991.
`
  },
  {
    id: 'sample-math-stats',
    title: 'Regression Analysis & Statistical Metrics',
    updatedAt: Date.now() - 1000 * 60 * 45,
    tags: ['Statistics', 'Formulas', 'Data'],
    content: `# Statistical Regression & Error Analysis

This note tests high-precision tabular rendering, inline mathematical notation, and formula display blocks.

### Regression error summary table

| Metric | Formula | Value |
| :--- | :--- | :--- |
| Sum of squared errors (SSE) | $\\sum (p_i - \\hat{p}_i)^2$ | 0.01208558 |
| Mean squared error (MSE) | $\\frac{1}{n} \\text{SSE}$ | 0.00302140 |
| Root-mean-square error (RMSE) | $\\sqrt{\\text{MSE}}$ | 0.05496726 |

---

## Coefficient of Determination ($R^2$)

The coefficient of determination measures how well observed outcomes are replicated by the model based on total variance:

$$
R^2 = 1 - \\frac{\\text{SS}_{\\text{res}}}{\\text{SS}_{\\text{tot}}} = 1 - \\frac{\\sum_i (y_i - f_i)^2}{\\sum_i (y_i - \\bar{y})^2}
$$

> [!NOTE] Interpretation
> A high $R^2$ indicates that the regression predictions closely fit the observed sample data points.
`
  },
  {
    id: 'sample-tech-spec',
    title: 'Distributed Event Broker Engine Spec',
    updatedAt: Date.now() - 1000 * 60 * 60 * 4,
    tags: ['Architecture', 'Engineering', 'API'],
    content: `# Distributed Event Broker Engine (Lumina-v2)

> [!IMPORTANT] Production Readiness
> This specification outlines the zero-allocation consensus engine, partition rebalancing protocol, and client SDK contracts.

## 1. System Overview

The **Lumina Event Broker** is a high-throughput, low-latency streaming platform designed for immutable event sourcing and real-time ledger synchronization.

\`\`\`typescript
import { EventStream, ConsumerGroup, PartitionRouter } from '@lumina/core';

interface StreamConfig {
  topic: string;
  partitions: number;
  replicationFactor: number;
  retentionHours: number;
}

export async function initializeStream(config: StreamConfig): Promise<EventStream> {
  const router = new PartitionRouter({
    strategy: 'consistent-hashing',
    virtualNodes: 256,
  });

  const stream = await EventStream.create({
    ...config,
    router,
    enableZeroCopy: true,
  });

  return stream;
}
\`\`\`

### 1.1 Throughput & Latency Formula

The theoretical partition saturation limit follows the $M/M/1$ queue latency curve:

$$
T_{response} = \\frac{1}{\\mu - \\lambda} + \\delta_{network}
$$

Where $\\mu$ represents partition throughput capacity, $\\lambda$ denotes arrival frequency, and $\\delta_{network}$ is the TCP kernel overhead.

---

## 2. API Endpoints & Payload Contracts

| Endpoint | Method | Payload | Target Latency |
| :--- | :--- | :--- | :--- |
| \`/v2/events/publish\` | \`POST\` | Binary Protobuf stream | $< 1.2\\text{ms}$ |
| \`/v2/events/subscribe\` | \`WS\` | JSON / Arrow IPC | $< 0.4\\text{ms}$ |
| \`/v2/cluster/health\` | \`GET\` | Gossip Vector Clock | $< 0.1\\text{ms}$ |

> [!WARNING] Rate Limiting Notice
> Burst traffic exceeding 50,000 events/sec per node must implement exponential backoff with jitter to prevent cascading consumer starvation.

\`\`\`rust
// Zero-allocation packet deserializer
pub fn process_event_batch(buffer: &[u8]) -> Result<Vec<EventEnvelope>, ParseError> {
    let mut cursor = 0;
    let mut events = Vec::with_capacity(32);
    
    while cursor < buffer.len() {
        let (envelope, bytes_read) = EventEnvelope::decode_zero_copy(&buffer[cursor..])?;
        cursor += bytes_read;
        events.push(envelope);
    }
    
    Ok(events)
}
\`\`\`

## 3. Deployment Checklist

- [x] Configure multi-zone raft consensus nodes
- [x] Verify TLS 1.3 mutual handshake
- [ ] Bench test fallback during leader partition failure
- [ ] Connect OpenTelemetry trace exporter
`
  },
  {
    id: 'sample-slides',
    title: 'Design Philosophy Presentation',
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    tags: ['Slides', 'Design', 'Manifesto'],
    content: `# The Quiet Web
### Designing for Human Sanity in a Noisy Era

*Press the Present button or arrow keys to navigate slides*

---

# The Problem: The Slot Machine Web

Modern digital surfaces are engineered to extract, not to nourish:
- Infinite scroll loops
- Popups, banners, and modal hijackers
- Visual saturation over semantic clarity

> "When everything screams for attention, nothing is heard."

---

# The Remedy: Radical Restraint

### 1. Typography as First Principle
Letters must carry the story. Color and decoration exist only to support.

### 2. Physicality & Calm Palettes
Linen, parchment, charcoal, and warm ink ground the eye.

### 3. Respect for the Reader
No uninvited movement. No deceptive patterns.

---

# The Golden Proportions of Typography

$$
\\text{Leading} = \\phi \\times \\text{Font Size} \\approx 1.618 \\times 18\\text{px} = 29.1\\text{px}
$$

When math and optics align, reading feels weightless.

---

# Build with Intention

- Craft things that endure
- Protect the reader's solitude
- Celebrate the timeless beauty of the written word
`
  }
];

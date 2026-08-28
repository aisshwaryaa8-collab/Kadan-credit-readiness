# Kadan — Credit-Readiness Score

## The Problem

Millions of gig workers and street vendors are financially active but excluded from formal credit due to lack of traditional credit history. Banks and NBFCs have no way to assess their reliability, so they're locked out of loans despite having real, provable income patterns.

## The Idea

**Kadan** replaces paperwork with real reliability signals. Instead of a bank statement or credit bureau file, it looks at what a gig worker or vendor already generates every day:

- 📱 **UPI Transaction Regularity** — how consistently they use digital payments
- 💼 **Work Tenure** — how long they've been active on a platform or in their trade
- ⭐ **App / Customer Ratings** — service quality signals from platforms they work on
- 🧾 **Utility Bill Payment History** — on-time payment behavior for electricity, mobile, rent

These are combined into a single, transparent **Credit-Readiness Score (300–850)** — plus a full point-by-point breakdown showing *exactly* why someone scored the way they did.

## Why It's Different

Most alternative-credit tools are black-box ML models. Kadan is intentionally **rule-based and fully auditable**:

- No opaque model — every point on the score can be traced to a specific input
- No bias or "trust the algorithm" problem — the formula is visible and explainable
- Built to be shared directly with lenders/NBFCs as a ready-made report, not just a number

## This Prototype

This is a **frontend-only, client-side prototype** — no backend or database required to demo it.

| File | Purpose |
|---|---|
| `index.html` | Page structure — landing, input form, results/report |
| `style.css` | Visual design (Playful Geometric design system) |
| `script.js` | Scoring engine, UI logic, PDF export |

### How the score is calculated

| Signal | Weight |
|---|---|
| UPI Transaction Regularity | 30% |
| Work Tenure | 25% |
| App / Customer Ratings | 20% |
| Utility Bill Payment History | 25% |

Each signal is converted to a 0–100 sub-score, weighted, summed, and mapped onto a 300–850 scale (familiar "credit score" range). The full formula is in `calculateScore()` inside `script.js`.

### Try it live

1. Open `index.html` in any browser — no install needed
2. Use the sliders to enter a profile, or click a preset (Ramesh / Lakshmi / Arjun) for an instant demo
3. Click **Calculate Credit-Readiness Score** to see the score, tier, and explainable breakdown
4. Click **Export Lender-Ready Report (PDF)** to download a shareable report

## Planned Architecture (Beyond This Prototype)

| Layer | Tech |
|---|---|
| Frontend | React.js / mobile-first form |
| Backend | Node.js or Python Flask — hosts scoring API |
| Scoring Engine | Rule-based weighted formula (no ML) |
| Database | Firebase / PostgreSQL — stores scores |
| Hosting | Vercel / Render |
| Future Scope | Real UPI API integration, gig-platform data, live utility bill data |

## Team

- HackInTym'26 2.0 · Dev Dynasty / Advyant / AI Club

## Note

Built and submitted as part of a 30-hour intra-college hackathon. This is a shortlisting-round prototype — data shown is illustrative/self-reported, not connected to live UPI, gig-platform, or utility bill APIs.

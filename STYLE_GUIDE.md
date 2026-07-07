# Visual Style Guide
## Renovation Decision Support Tool
**Source:** Wahi (2025), *Preparing Dutch Homes for Energy Transition*, TU Delft A+BE series  
**For:** Codex / Claude Code implementation

---

## 01 — Colour Palette

Extracted directly from the thesis cover (deep cobalt + warm amber) and interior typography (terracotta section numbers, pillar colour coding).

### Primary Colours

| Token | Hex | Role |
|---|---|---|
| `--color-cobalt` | `#1B3A6B` | Primary heading colour, hero backgrounds, cover |
| `--color-cobalt-light` | `#E8F0FB` | Cobalt tint for background washes |
| `--color-amber` | `#C17B3C` | Accent colour — section numbers, links, active nav, dividers |
| `--color-amber-bright` | `#E8840A` | CTA buttons, primary action, highlighted state |
| `--color-amber-light` | `#FAEEDA` | Amber tint background (also Economic pillar bg) |

### Neutral Colours

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#1A1A1A` | Primary body text |
| `--color-slate` | `#555555` | Secondary text, descriptions |
| `--color-mist` | `#999999` | Labels, captions, placeholders, metadata |
| `--color-linen` | `#F5F3EF` | Card and surface background |
| `--color-border` | `#E0DDD6` | Default border (use at 0.5px) |
| `--color-white` | `#FFFFFF` | Page background |

### Pillar Colours — NEVER SWAP THESE

| Pillar | Background | Text | Usage |
|---|---|---|---|
| Environmental | `#EAF3DE` | `#3B6D11` | Tags, table rows, chart segments for C1–C5 |
| Economic | `#FAEEDA` | `#854F0B` | Tags, table rows, chart segments for C6–C9 |
| Social | `#E6F1FB` | `#185FA5` | Tags, table rows, chart segments for C10–C13 |

### Status Colours (for CR, pass/fail, validation)

| Status | Background | Text |
|---|---|---|
| Pass / consistent | `#EAF3DE` | `#3B6D11` |
| Warning / review | `#FAEEDA` | `#854F0B` |
| Fail / error | `#FCEBEB` | `#A32D2D` |

---

## 02 — Typography

### Font Stack

```css
--font-ui:   "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

**Rationale:** Inter closely matches the humanist sans used throughout the A+BE thesis series (resembling Frutiger/Meta). No serif is needed in the web tool context.

### Type Scale

| Role | Size | Weight | Colour | Notes |
|---|---|---|---|---|
| Display / hero | 48px | 700 | `#1B3A6B` or `#FFFFFF` on dark | Cover-style headings only |
| Page heading | 22px | 600 | `#1A1A1A` | Followed by amber underline rule |
| Section label | 11px | 600 | `#C17B3C` | UPPERCASE · letter-spacing: 0.1em |
| Card title | 15px | 500 | `#1A1A1A` | — |
| Body | 14px | 400 | `#1A1A1A` | line-height: 1.75 |
| Caption / metadata | 12px | 400 | `#999999` | Used for units, IDs, footnotes |
| Monospace values | 12px | 400 | `#555555` | Criterion IDs (C1, C2…), numeric scores |

### Section Heading Pattern (matches thesis structure)

```html
<!-- Always: amber numbered label → thin border → heading -->
<div class="section-header">
  <p class="section-label">03 — Pairwise comparison</p>
  <h2 class="section-title">Criteria weights</h2>
</div>
```

```css
.section-header { border-top: 0.5px solid #E0DDD6; padding-top: 1rem; margin-bottom: 1rem; }
.section-label  { font-size: 11px; font-weight: 600; color: #C17B3C; letter-spacing: 0.1em; text-transform: uppercase; }
.section-title  { font-size: 18px; font-weight: 600; color: #1A1A1A; margin-top: 4px; }
```

---

## 03 — Spacing & Layout

| Property | Value |
|---|---|
| Page max-width | 720px, centred, 24px side padding |
| Section gap | 40px between major sections |
| Card padding | 16px (compact) / `1rem 1.25rem` (wider) |
| Card gap in grids | 10px |
| Border radius sm | 6px |
| Border radius md | 8px |
| Border radius lg | 12px (cards, modals) |
| Border weight | 0.5px (standard), 2px (featured card highlight), 3px (left accent) |
| Body line-height | 1.75 |
| Label letter-spacing | 0.1em |

---

## 04 — CSS Custom Properties (copy into `:root`)

```css
:root {
  /* Primary palette */
  --color-cobalt:        #1B3A6B;
  --color-cobalt-light:  #E8F0FB;
  --color-amber:         #C17B3C;
  --color-amber-bright:  #E8840A;
  --color-amber-light:   #FAEEDA;

  /* Neutrals */
  --color-ink:           #1A1A1A;
  --color-slate:         #555555;
  --color-mist:          #999999;
  --color-linen:         #F5F3EF;
  --color-border:        #E0DDD6;
  --color-white:         #FFFFFF;

  /* Pillar colours */
  --pillar-env-bg:       #EAF3DE;
  --pillar-env-text:     #3B6D11;
  --pillar-eco-bg:       #FAEEDA;
  --pillar-eco-text:     #854F0B;
  --pillar-soc-bg:       #E6F1FB;
  --pillar-soc-text:     #185FA5;

  /* Status */
  --status-pass-bg:      #EAF3DE;
  --status-pass-text:    #3B6D11;
  --status-warn-bg:      #FAEEDA;
  --status-warn-text:    #854F0B;
  --status-fail-bg:      #FCEBEB;
  --status-fail-text:    #A32D2D;

  /* Typography */
  --font-ui:             "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono:           "JetBrains Mono", "Fira Code", monospace;

  /* Spacing / radius */
  --radius-sm:           6px;
  --radius-md:           8px;
  --radius-lg:           12px;
  --border-std:          0.5px solid var(--color-border);
  --border-accent-left:  3px solid var(--color-amber);
}
```

---

## 05 — Key Components

### Navigation Tabs

```css
.nav-tabs    { display: flex; gap: 2px; padding: 3px; background: #F5F3EF; border-radius: 8px; }
.nav-tab     { padding: 6px 16px; font-size: 13px; border-radius: 6px; color: #555555; cursor: pointer; }
.nav-tab.active {
  background: #FFFFFF;
  color: #1B3A6B;
  font-weight: 500;
  border: 0.5px solid #E0DDD6;
}
```

### Criteria Card (the checkbox rows)

```css
.criteria-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 0.5px solid #E0DDD6;
  border-left: 3px solid #C17B3C;   /* amber accent when active */
  border-radius: 8px;
  background: #FFFFFF;
}
.criteria-card.inactive {
  opacity: 0.45;
  border-left-color: #E0DDD6;
}
.criteria-id   { font-size: 11px; color: #999999; min-width: 24px; font-family: var(--font-mono); }
.criteria-name { font-size: 13px; color: #1A1A1A; flex: 1; }
```

### Pillar Tag

```css
.pillar-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}
.pillar-dot { width: 6px; height: 6px; border-radius: 50%; }
```

### Buttons

```css
/* Primary CTA — amber */
.btn-primary {
  background: #E8840A;
  color: #FFFFFF;
  border: none;
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Secondary — amber outline */
.btn-secondary {
  background: transparent;
  color: #C17B3C;
  border: 0.5px solid #C17B3C;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

/* Ghost — neutral */
.btn-ghost {
  background: transparent;
  color: #555555;
  border: 0.5px solid #E0DDD6;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
```

### TOPSIS Result Bars

```css
.result-item { margin-bottom: 12px; }
.result-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}
.result-rank  { color: #999999; font-size: 11px; margin-right: 8px; }
.result-name  { color: #1A1A1A; font-weight: 500; flex: 1; }
.result-score { color: #1B3A6B; font-weight: 600; }
.result-bar-track { height: 6px; background: #F5F3EF; border-radius: 3px; overflow: hidden; }
.result-bar-fill  { height: 6px; border-radius: 3px; }

/* Fill colours by rank */
.rank-1 { background: #1B3A6B; }
.rank-2 { background: #C17B3C; }
.rank-3 { background: #CCCCCC; }
```

### Consistency Ratio Badge

```css
.cr-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 6px;
}
.cr-pass { background: #EAF3DE; color: #3B6D11; }
.cr-warn { background: #FAEEDA; color: #854F0B; }
.cr-fail { background: #FCEBEB; color: #A32D2D; }
```

---

## 06 — Design Principles

1. **Academic precision, tool clarity.** Every element is labelled with its ID (C1, A3), unit (kWh/m²/yr), and direction (↓ min / ↑ max). Never leave the user guessing.

2. **Amber guides attention.** Amber (`#C17B3C` / `#E8840A`) is the only interactive colour. It marks what you can do and what is currently selected. Do not use it decoratively.

3. **Pillar colours have semantic ownership.** Green = Environmental, Amber/Tan = Economic, Blue = Social. These are consistent across tags, chart segments, table headers, and weight bars without exception.

4. **White space is structural.** The thesis breathes. So should the tool. Use `1.75` line-height, `40px` section gaps, and generous card padding. Never cram.

5. **Cobalt is for depth and authority.** Use `#1B3A6B` for headings, the primary ranking bar, and any element that signals a decision or conclusion. It references the thesis cover's authoritative midnight blue.

6. **The amber–cobalt contrast is the brand.** It maps directly to the thesis cover art: glowing orange pipes (heat, energy, action) against deep blue Dutch night sky (rigour, structure, analysis). Keep this visual metaphor alive.

---

## 07 — What NOT to do

- Do not use gradients or shadows — the thesis is flat, clean, academic
- Do not add decorative icons or illustrations unrelated to the domain
- Do not use red as a general accent — red is reserved for error / fail states only
- Do not use more than 2 fonts: Inter (UI) and JetBrains Mono (values/IDs)
- Do not swap pillar colours across components
- Do not use font weights above 600 — the thesis uses moderate weights throughout

---

*Style guide extracted by Claude from Wahi, P. (2025). Preparing Dutch Homes for Energy Transition. TU Delft.*

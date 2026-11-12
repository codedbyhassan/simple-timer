# Ascend HMS: Design System Specification v1.0

**Status:** Proposed. Review, then freeze.
**Location:** `docs/product/DESIGN_SYSTEM.md`
**Depends on:** Dashboard and Screen Specification v1.0, Architecture v1.0 and v1.1.
**Code location:** `src/shared/design-system/`, imported everywhere as `@ui`.

---

## 0. How to read this document

- **[DECISION]**: a decision made here.
- **[VERIFY]**: not confirmable from the material supplied. Confirm before the related component is accepted.
- Colour values and sizes in this document are **starting values**. They are not accepted until the automated contrast and visual tests in Section 11 pass.

---

## 1. The requirement and the rule that delivers it

**Requirement:** every UI element (buttons, cards, pills, charts, everything) is defined **once**. Changing the design in one place changes every dashboard.

That only works if dashboards are **unable** to define their own look. Good intentions are not enough, so the system rests on five rules that are enforced by tooling (Section 11), not by review.

| # | Rule | Enforced by |
|---|------|-------------|
| R1 | Modules and pages import UI **only** from `@ui`. | Lint: restricted imports |
| R2 | Modules contain **no colours, radii, shadows, font sizes or spacing values** of their own. They choose **variants** (`intent="primary"`, `tone="success"`, `gap="md"`), never styles. | Lint: no colour classes, no arbitrary values, no inline colour styles |
| R3 | Every visual value comes from a **token**. Components read tokens. Themes change tokens. | Token tests, CI |
| R4 | If a page needs something that does not exist, **the design system gains it first**, then the page uses it. | Code review rule, lint |
| R5 | Every status, in every module, is rendered through **one registry** (Section 7). | Types: status must be a registry key |

The result: changing the look of every button in the hospital is a change to one or two token values. Changing the layout of every KPI tile is a change to one component file.

### 1.1 What the previous claims build shows

The old claims screen is the pattern to eliminate:
- It defined its own `TextField` and `NumberField` inside the page file.
- It repeated long class strings such as `rounded-xl border border-border bg-muted/30 p-4` and `grid gap-4 md:grid-cols-2 xl:grid-cols-3` throughout.
- It relied on a `surface-panel` class and hand-built buttons with long inline handlers.

Every one of those becomes a design-system component (`FormField`, `Card`, `FormGrid`, `ActionBar`). A page then contains no styling at all.

---

## 2. What the references tell us

You supplied 14 references. Each contains ideas we need. This table records what is taken, what is deliberately not taken, and why. Numbering is the order of the images supplied.

| # | Reference | Taken into the system | Not taken, and why |
|---|-----------|----------------------|--------------------|
| 1 | **Dark finance dashboard (Ethereal)**: dark theme, gradient hero card, income/expense tiles with delta pills, bar chart with tooltip, donut with legend, list with status pill, segmented top navigation, circular icon buttons | Dark theme; `KpiTile` with `DeltaPill`; `BarChart` with highlighted bar and tooltip; `DonutChart` with legend and centre total; `ListRow`; `SegmentedControl`; circular `IconButton` | Glass on content cards (clinical data stays solid, Dashboard Spec §1.2). Stacked bank cards (no equivalent). Several grey-on-dark labels look low contrast and must pass our measured contrast tests |
| 2 | **Hospital dashboard (Holistic)**: labelled left nav with filled active item, stat cards with delta, week/month/year toggles, line and bar charts, calendar, appointment list with status pills, alerts list, occupancy rows, green schedule cards with confirm/cancel, outline and filled header buttons | **Closest match to our domain.** `SideRail` (labelled), `StatCard`, `RangeToggle`, `LineAreaChart`, `BarChart`, `Calendar`, `ListRow` with `StatusPill`, `AlertList`, `ScheduleCard` with actions, header `Button` pair (secondary + primary) | Raw "Revenue" line chart with two near-identical greens (poor distinction); our series colours are distinct and colour-blind safe |
| 3 | **Light finance dashboard (Fenco)**: slim dark icon rail, greeting, avatar row, balance with mini bars, radial gauge, split bar (60/40), dark CTA card | `SideRail` icon-only variant; `Sparkline`; `GaugeChart`; `StatBar` (two-part split); `HeroBanner` | The premium upsell card (no equivalent). Avatar story-row (not needed) |
| 4 | **Course dashboard (Eduka)**: coloured gradient KPI cards, tabbed table with status text, line chart with crosshair tooltip, donut, ranked list, sidebar badge count | Tabbed `Worklist` with stage tabs; `LineAreaChart` crosshair tooltip; `NavItem` count badge; `RankedList` | **Multi-colour gradient KPI cards.** In a hospital, colour carries meaning (status). Decorative rainbow tiles would blur that. White text on bright orange or green gradients is also likely to fail contrast |
| 5 | **Purple healthcare dashboard**: sidebar, welcome banner, three-metric strip, doctor cards, week strip with schedule list, selected appointment card raised | `MetricStrip`; `PersonCard` (photo, name, role, time window); `WeekStrip`; selected-item `ListRow` state; `HeroBanner` | Star ratings on doctors (not a clinical or operational need) |
| 6 | **Controls: segmented tabs, pagination, checkbox, list/grid toggle** (black selected state with soft shadow, light inactive) | `SegmentedControl`, `Pagination`, `Checkbox` (rounded square), `ViewToggle`. **The black "selected" look becomes the `selected` token, separate from the brand action colour** | Heavy drop shadows on every control (reduced to token `--shadow-selected` on selected only) |
| 7 | **Status pills (dark)**: Pending, In progress, Submitted, In review, Success, Failed, Expired, each tinted with an icon | **This is the `StatusPill` and tone vocabulary.** Icon + tint + text is exactly our "never colour alone" rule | None |
| 8 | **Receipt ticket**: header, itemised list, total, perforation, barcode | `Receipt` (cashier), `LabelSheet` (specimen and medicine labels), `Barcode` | The mock's total does not equal its line items. The real `Receipt` only renders **server-supplied totals** and never sums in the browser |
| 9 | **Segmented progress card**: "68% completed", segmented bar, "32 of 47", weekly change | `SegmentedProgress`, which becomes `ClaimReadinessMeter`, month claim progress, discharge checklist progress | None |
| 10 | **HR bento**: KPI tiles with icon, gauge, stacked bar, heatmap, leaderboard, highlighted bar tooltip | **Bento grid layout** (`BentoGrid`/`BentoTile`); `Heatmap` (peak hours, absenteeism); `GaugeChart` (bed occupancy); `StackedBar` | Employee satisfaction ratings (out of scope) |
| 11 | **Toasts**: information, error, success, each with icon, title, message and action | `Toast` with action button, in three tones plus warning | None |
| 12 | **Profile cards: solid and glass variants** | `PersonCard`/`PatientCard` with verified badge. **We adopt the solid variant only** | The glass variant, because translucent surfaces on identity data reduce legibility |
| 13 | **File manager (Kintsugi)**: collapsible tree, breadcrumbs, search and filter, folder tiles, selected tile, right info panel with properties, tags, usage bars, activity | `TreeNav`, `Breadcrumbs`, `SearchField`, `FilterButton`, `DocumentTile`, `InfoPanel` + `PropertyList`, `Tag`, `UsageBar`, `ActivityList`. Directly powers patient documents (D0), reference mapping browser (D14), and the context rail | None |
| 14 | **Folder tile with gradient header** | `DepartmentTile` (department summary with counts). Gradient only in a non-clinical "category" header and always optional | Gradient on clinical status tiles |

### 2.1 Overall visual direction [DECISION]

Blend of references 2, 6, 7, 9, 10 and 13, with reference 1's dark theme for night shifts:

- Calm light default, teal-green brand (reference 2), with a full dark theme.
- Soft rounded cards on a quiet background, bento layout for summary screens.
- **Black pill = "selected"** (segmented tabs, pagination, active filters). **Brand colour = "action"** (primary buttons, links). These are two different tokens so selection and action never look alike.
- Tinted pills with icon and text for every status.
- Hero gradient allowed **only** in `HeroBanner` (greeting, management summary), never on a tile that holds clinical or financial data.
- Dense variants for worklists (Dashboard Spec §1.5). The references are airy and marketing-like. Our density tokens close that gap.

[VERIFY] brand colour and logo. Teal-green is assumed from reference 2 and is a one-token change.

---

## 3. Architecture of the design system

### 3.1 Layers

```
Layer 0  TOKENS        raw palette, semantic tokens, component tokens
Layer 1  THEMES        light, dark, high-contrast, modifiers (density, reduced effects, print)
Layer 2  PRIMITIVES    Button, Input, Checkbox, Pill, Avatar, Tooltip, Skeleton …
Layer 3  PATTERNS      Card, KpiTile, Worklist, Toast, Calendar, Timeline, Charts …
Layer 4  TEMPLATES     DashboardPage, WorklistPage, WorkspacePage, WizardPage …
Layer 5  CLINICAL      PatientBanner, QueueCard, BedTile, ClaimReadinessMeter …
                       (built only from layers 2 to 4)
────────────────────────────────────────────────────────────────────────────
MODULES (patients, pharmacy, laboratory …) compose templates + patterns.
They add data and behaviour, never styling.
```

A layer may use only layers beneath it.

### 3.2 Folder structure

```
src/shared/design-system/
├── tokens/
│   ├── primitive.css        raw palette and scales
│   ├── semantic.css         meaning: action, surface, text, tones
│   ├── component.css        per-component tokens (button, card, pill …)
│   ├── density.css          comfortable and compact
│   ├── motion.css
│   └── tokens.ts            typed token names for use in charts and tests
├── themes/
│   ├── light.css
│   ├── dark.css
│   ├── high-contrast.css
│   ├── reduced-effects.css  solid replacements for glass
│   └── print.css            A4, labels, receipts
├── foundations/             Stack, Cluster, Grid, BentoGrid, Page, Section, Icon, Text
├── primitives/              Button, IconButton, TextField, Select, Checkbox …
├── patterns/                Card, KpiTile, Worklist, Toast, Calendar, Timeline …
├── charts/                  one wrapper family over one chart library
├── status/                  registry.ts, tones.ts  (the only source of status meaning)
├── templates/               page templates
├── clinical/                PatientBanner, QueueCard, BedTile, ClaimReadinessMeter …
├── icons/                   one icon set, one wrapper
├── stories/                 living catalogue
└── index.ts                 THE ONLY PUBLIC ENTRY POINT (alias @ui)
```

Modules never import from sub-paths such as `@ui/primitives/button`. They import from `@ui` only.

### 3.3 Technology [DECISION]

| Concern | Choice | Reason |
|---------|--------|--------|
| Styling | Tailwind utilities mapped to **CSS variables** | Existing stack, tokens flow through |
| Variants | `class-variance-authority` (CVA) | Variants as typed props |
| Behaviour and accessibility | Radix primitives (the shadcn pattern), but **owned** and restyled via tokens | Accessibility for free, no look coming from a third party |
| Icons | One set through one `Icon` wrapper [VERIFY set; the old build used Lucide] | Swap icons everywhere in one file |
| Catalogue | Storybook | Every component, every variant, every theme |
| Charts | One library behind our own chart wrappers [VERIFY library after a spike on low-end hardware] | Swap or restyle in one place |

---

## 4. Token system

Three tiers. Components read the **component** tier. Component tokens read the **semantic** tier. Semantic tokens read the **primitive** tier. Themes override the semantic and component tiers.

```
primitive  --teal-600
   ↓
semantic   --color-action: var(--teal-600)
   ↓
component  --button-primary-bg: var(--color-action)
```

### 4.1 Primitive tier (raw scales, never used by components)

Neutral 0 to 950, brand (teal) 50 to 900, and one scale each for green, red, amber, orange, blue, violet and grey.

### 4.2 Semantic tier (starting values)

```css
/* tokens/semantic.css  (light) */
:root {
  /* surfaces */
  --color-bg-app:            var(--neutral-50);
  --color-bg-surface:        var(--neutral-0);
  --color-bg-surface-raised: var(--neutral-0);
  --color-bg-sunken:         var(--neutral-100);
  --color-border-subtle:     var(--neutral-200);
  --color-border-strong:     var(--neutral-400);

  /* text */
  --color-text-primary:   var(--neutral-900);
  --color-text-secondary: var(--neutral-600);
  --color-text-tertiary:  var(--neutral-500);
  --color-text-inverse:   var(--neutral-0);

  /* action vs selected: two different meanings */
  --color-action:         var(--teal-600);
  --color-action-hover:   var(--teal-700);
  --color-on-action:      var(--neutral-0);
  --color-selected:       var(--neutral-900);   /* the black pill */
  --color-on-selected:    var(--neutral-0);

  --color-focus-ring:     var(--blue-600);

  /* tones: bg, foreground, border, solid; one set per tone (Section 7) */
  --tone-neutral-bg: var(--neutral-100);  --tone-neutral-fg: var(--neutral-700);
  --tone-info-bg:    var(--blue-50);      --tone-info-fg:    var(--blue-700);
  --tone-progress-bg:var(--blue-50);      --tone-progress-fg:var(--blue-700);
  --tone-pending-bg: var(--orange-50);    --tone-pending-fg: var(--orange-800);
  --tone-review-bg:  var(--amber-50);     --tone-review-fg:  var(--amber-800);
  --tone-submitted-bg:var(--violet-50);   --tone-submitted-fg:var(--violet-700);
  --tone-success-bg: var(--green-50);     --tone-success-fg: var(--green-800);
  --tone-danger-bg:  var(--red-50);       --tone-danger-fg:  var(--red-700);
  --tone-expired-bg: var(--neutral-100);  --tone-expired-fg: var(--neutral-600);
  --tone-critical-bg:var(--red-600);      --tone-critical-fg:var(--neutral-0);   /* solid, safety only */

  /* charts */
  --chart-1: var(--teal-600);  --chart-2: var(--blue-500);   --chart-3: var(--amber-500);
  --chart-4: var(--violet-500);--chart-5: var(--orange-500); --chart-6: var(--green-500);
  --chart-7: var(--red-500);   --chart-8: var(--neutral-500);
  --chart-grid: var(--neutral-200);  --chart-axis: var(--neutral-500);
  --chart-highlight: var(--color-selected);
}
```

The dark theme redefines only the semantic tier:

```css
/* themes/dark.css */
[data-theme="dark"] {
  --color-bg-app:     var(--neutral-950);
  --color-bg-surface: var(--neutral-900);
  --color-bg-sunken:  var(--neutral-925);
  --color-text-primary:   var(--neutral-50);
  --color-text-secondary: var(--neutral-300);
  --color-selected:       var(--neutral-50);   /* white pill on dark */
  --color-on-selected:    var(--neutral-900);
  --color-action:         var(--teal-400);
  --tone-success-bg: color-mix(in srgb, var(--green-500) 18%, transparent);
  --tone-success-fg: var(--green-300);
  /* …one block per tone … */
}
```

No component contains a theme check. Components use semantic and component tokens only, so every component works in every theme automatically.

### 4.3 Component tier (the "knobs")

This is what makes a global design change a one-line edit.

```css
/* tokens/component.css */
:root {
  /* shape */
  --radius-control: 12px;     /* buttons, inputs */
  --radius-card:    16px;
  --radius-pill:    9999px;
  --radius-sheet:   24px;
  --radius-chip:    8px;

  /* controls */
  --button-radius:     var(--radius-pill);     /* references show pill buttons */
  --input-radius:      var(--radius-control);
  --card-radius:       var(--radius-card);
  --card-bg:           var(--color-bg-surface);
  --card-border:       1px solid var(--color-border-subtle);
  --card-shadow:       0 1px 2px rgb(0 0 0 / .04);
  --card-padding:      var(--space-5);
  --pill-radius:       var(--radius-pill);
  --shadow-selected:   0 4px 10px rgb(0 0 0 / .18);

  /* type */
  --font-sans: "Segoe UI", system-ui, -apple-system, "SF Pro Text", sans-serif;
  --font-mono: ui-monospace, "SF Mono", Consolas, monospace;
  --text-kpi:   600 2.25rem/2.75rem var(--font-sans);   /* tabular numerals */
  --text-title: 600 1.5rem/2rem var(--font-sans);
  --text-body:  400 0.9375rem/1.5rem var(--font-sans);
  --text-label: 500 0.8125rem/1.25rem var(--font-sans);
  --text-caption: 400 0.75rem/1rem var(--font-sans);    /* never below 12px */

  /* space */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 40px;

  /* motion */
  --motion-fast: 120ms ease-out;
  --motion-standard: 200ms ease-out;
  --motion-exit: 120ms ease-in;

  /* layers */
  --z-nav: 40; --z-drawer: 50; --z-modal: 60; --z-toast: 70;
}

/* density: set once on the root, read by every component */
[data-density="comfortable"] { --control-h: 44px; --row-h: 52px; --card-padding: var(--space-5); }
[data-density="compact"]     { --control-h: 36px; --row-h: 40px; --card-padding: var(--space-4); }
```

### 4.4 "Change it once" demonstration

| Change wanted | Edit | Files | Affects |
|---------------|------|-------|---------|
| Rectangular buttons instead of pills | `--button-radius: 8px` | 1 | Every button in every dashboard |
| New brand colour | Brand scale in `primitive.css` | 1 | Actions, links, focus, active nav, charts series 1 |
| Flat cards without shadow | `--card-shadow: none` and keep border | 1 | Every card, KPI tile and panel |
| Larger text for the whole hospital | `--text-body` and related | 1 | All screens |
| New look for the status pills | `pill` variants in `status-pill` | 1 | Every status pill everywhere |
| Replace the icon set | `icons/Icon.tsx` mapping | 1 | Every icon |
| Add a high-contrast theme | New `themes/high-contrast.css` | 1 | All screens, instantly selectable |
| Tighter layout for worklists | `[data-density="compact"]` values | 1 | Every row, control and card in compact mode |

If a requested change would touch more than one file, the design system is wrong and must be fixed.

---

## 5. How every component is built (component contract)

1. **Variants, not styles.** Each component exposes typed props (`intent`, `size`, `tone`, `density`). `className` and `style` are **not** accepted on public components.
2. **Layout is separate from look.** Spacing between elements is done with layout components (`Stack`, `Cluster`, `Grid`), never margins on content components.
3. **Tokens only.** No hex, no pixel colours, no one-off radii.
4. **All states built in:** default, hover, focus-visible, active, selected, disabled, loading, error, read-only.
5. **Accessibility built in:** roles, labels, keyboard operation, focus ring, 44 px target on touch density, `aria-live` for live content, reduced-motion respected.
6. **Presenter only.** Components receive data as props. They never fetch.
7. **Documented in Storybook** with every variant, every theme and both densities.
8. **Tested:** visual snapshot per theme, axe accessibility check, keyboard test, token contrast check.

### 5.1 Example: Button

```tsx
// primitives/Button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { Icon, type IconName } from "../icons/Icon";
import { Spinner } from "./Spinner";

const button = cva(
  [
    "inline-flex items-center justify-center gap-2 font-medium select-none",
    "rounded-[var(--button-radius)] h-[var(--control-h)] px-4",
    "transition-colors duration-[var(--motion-fast)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      intent: {
        primary:   "bg-[var(--color-action)] text-[var(--color-on-action)] hover:bg-[var(--color-action-hover)]",
        secondary: "bg-transparent border border-[var(--color-border-strong)] text-[var(--color-text-primary)]",
        ghost:     "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-sunken)]",
        danger:    "bg-[var(--tone-danger-fg)] text-[var(--color-text-inverse)]",
        selected:  "bg-[var(--color-selected)] text-[var(--color-on-selected)] shadow-[var(--shadow-selected)]",
      },
      size: { sm: "text-sm", md: "text-[0.9375rem]", lg: "text-base" },
    },
    defaultVariants: { intent: "secondary", size: "md" },
  },
);

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "style"> &
  VariantProps<typeof button> & { loading?: boolean; icon?: IconName };

export function Button({ intent, size, loading, icon, children, ...rest }: ButtonProps) {
  return (
    <button className={button({ intent, size })} aria-busy={loading || undefined} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}
```

In a module, the only thing a developer can write is `<Button intent="primary" icon="plus">Register patient</Button>`.

### 5.2 Example: StatusPill through the registry

```tsx
// patterns/StatusPill.tsx
export function StatusPill({ status, size = "md" }: { status: StatusKey; size?: "sm" | "md" }) {
  const { tone, icon, label } = statusRegistry[status];
  return (
    <span className={pill({ tone, size })}>
      <Icon name={icon} aria-hidden />
      {label}
    </span>
  );
}
```

`status` is a typed key. A module cannot invent a status or pick a colour for it.

---

## 6. Component catalogue

Every component below is built once in `@ui`. "Ref" is the reference image number from Section 2. "Used by" refers to the dashboards (D0 to D14) of the Dashboard Specification.

### 6.1 Foundations and layout

| Component | Purpose | Ref | Used by |
|-----------|---------|-----|---------|
| `Page`, `Section` | Page frame, titled sections | 2 | All |
| `Stack`, `Cluster` | Vertical and horizontal spacing with token gaps | | All |
| `Grid` | 12-column responsive grid | | All |
| `BentoGrid`, `BentoTile` | Summary layouts with tile spans `1x1`, `2x1`, `1x2`, `2x2`, `full` | 10 | D13, D9, D12, home |
| `Split` | List plus detail layout | 13 | D5, D7, D8, D9 |
| `Text`, `Heading`, `Numeric` | Typography with tabular numerals for numbers | all | All |
| `Icon` | The single icon entry point | all | All |
| `Divider`, `ScrollArea` | | | All |

### 6.2 Actions

| Component | Variants | Ref | Used by |
|-----------|----------|-----|---------|
| `Button` | intent: primary, secondary, ghost, danger, selected. size sm, md, lg. icon, loading | 2, 6, 13 | All |
| `IconButton` | Circular, with required accessible label | 1, 3 | Top bar, row actions |
| `ButtonGroup`, `SplitButton` | | | Toolbars |
| `MenuButton` | The "⋮" kebab with action menu | 1, 4 | Rows |
| `ActionBar` | Exactly one primary action plus secondary actions | | All forms and panels |

### 6.3 Inputs

| Component | Notes | Used by |
|-----------|-------|---------|
| `FormField` | Label, hint, inline error, required marker. Wraps every input | All forms |
| `TextField`, `TextArea`, `NumberField` | | All |
| `StructuredField` | Value + unit with range hint and soft warning (kg, m, mmHg, mmol/L) | D3 |
| `Select`, `Combobox` | | All |
| `CodePicker` | Server-searched coded input (ICD-10, GDRG-mapped service, NHIA medicine) | D4, D9, D14 |
| `DoseInput` | Dose, frequency, duration in the structured format | D4, D7 |
| `DateField`, `TimeField` | DD/MM/YYYY, 24 h | All |
| `SearchField` | With `/` shortcut | Top bar, lists |
| `Checkbox` (rounded square), `Radio`, `Switch` | | 6 |
| `FileDrop` | Documents upload | D0 |
| `Stepper`, `Wizard` | Multi-step forms | D1 |

### 6.4 Navigation

| Component | Variants | Ref | Used by |
|-----------|----------|-----|---------|
| `TopBar` | May use glass material (only here and `SideRail`) | 1, 2 | Shell |
| `SideRail` | `compact` (icons only), `expanded` (labels), collapsible `TreeNav`. Active item filled. Count badge | 2, 3, 4, 13 | Shell, D14 |
| `SegmentedControl` | Pill container, `selected` black pill | 1, 6 | Filters, range toggles |
| `Tabs` | Underline style for stage tabs | 4 | D5, D7, D0 |
| `RangeToggle` | Week / Month / Year | 2 | D13 |
| `Breadcrumbs` | | 13 | D0, D14 |
| `Pagination` | Numbered, selected black | 6 | Worklists |
| `ViewToggle` | List / grid | 6 | Documents, D2 |
| `WeekStrip`, `Calendar` | | 2, 5 | D1, D13 |
| `NavItem` | | 2, 4 | Shell |

### 6.5 Display

| Component | Variants | Ref | Used by |
|-----------|----------|-----|---------|
| `Card` | `flat`, `raised`, `tinted`, `selected`. Optional header with title, subtitle, action | 1, 2, 3, 10 | All |
| `HeroBanner` | The **only** place a gradient is allowed | 3, 5 | Home, D13 |
| `KpiTile` | Value, unit, label, `DeltaPill`, optional icon, optional `Sparkline`, "as of" time, click-through | 1, 2, 10 | D2, D5, D7, D8, D9, D10, D13 |
| `MetricStrip` | 3 to 4 inline metrics | 5 | D1, D10 |
| `DeltaPill` | Up/down with percentage. Tone is semantic (an increase in waiting time is *bad*), not automatic green | 1, 2, 10 | KPIs |
| `StatusPill` | Tinted, icon, label, from the registry | 7 | All |
| `PriorityBadge` | Triage and order priority, text always shown | | D2, D3, D4, D5 |
| `Tag` | Neutral label | 13 | D0, D14 |
| `Avatar`, `AvatarGroup` | | 2, 3 | All |
| `ListRow` | Leading avatar/icon, title, meta, trailing status, optional menu, selected state | 1, 2, 4, 5 | All lists |
| `Worklist` (data table) | Virtualised, server-paginated, sortable, stage tabs, density-aware, "n new" pill | 4 | D5, D7, D8, D9, D12 |
| `RankedList` | | 4, 10 | D13 |
| `ScheduleCard` | Time, title, participants, confirm/cancel actions | 2, 5 | D1, D3 |
| `Timeline` | Vertical event list | 2 | D0 |
| `InfoPanel`, `PropertyList` | Right context rail with label/value rows | 13 | D0, D9 |
| `ActivityList` | | 13 | D0, D14 |
| `DocumentTile` | File or folder summary tile | 13, 14 | D0 |
| `DepartmentTile` | Department summary tile with counts | 14 | D13, D2 |
| `PersonCard` | Photo, name, role, verified badge | 5, 12 | D13, D1 |
| `Receipt` | Itemised list, server-supplied total, reference, barcode, perforation. Printable | 8 | D8 |
| `LabelSheet` | Specimen, medicine and wristband labels, with `Barcode` | 8 | D5, D7 |
| `Barcode`, `QrCode` | | 8 | Labels, receipts |
| `Progress`, `SegmentedProgress` | Continuous and segmented, with count and weekly change | 9 | Claims, discharge, month progress |
| `UsageBar`, `StatBar` | Storage use bar, two-part split bar | 3, 13 | D12, D13 |
| `EmptyState`, `ErrorState`, `Skeleton` | | | All |

### 6.6 Feedback

| Component | Notes | Ref | Used by |
|-----------|-------|-----|---------|
| `Toast` | information, success, warning, error, with action. Only for server-confirmed outcomes | 11 | All |
| `AlertStrip` | Persistent, severity styled | 2 | All |
| `AlertList` | Short list of alerts and notifications | 2 | D13 |
| `InlineError` | Field-level | | Forms |
| `Tooltip` | | 1, 4, 10 | Charts, icons |
| `ConnectionChip`, `LastUpdated` | Live / Reconnecting / Offline | | Shell, all live panels |
| `ConfirmDialog`, `CriticalActionDialog` | Category C operations, idempotency, "Not yet confirmed" state | | D5, D7, D8, D10 |

### 6.7 Overlays

`Modal`, `Drawer`, `DetailDrawer`, `Popover`, `DropdownMenu`. Panel surfaces are solid. Only the scrim is translucent.

### 6.8 Charts

All charts share one set of chart tokens (`--chart-1 … 8`, grid, axis, highlight), one tooltip, one legend, one empty state, one loading skeleton, and an **accessible data table alternative** behind each chart.

| Component | Features | Ref | Used by |
|-----------|----------|-----|---------|
| `BarChart` | Single or grouped. One highlighted bar with tooltip | 1, 2, 10 | D13 |
| `LineAreaChart` | Area fill, crosshair tooltip, multi-series, range toggle | 2, 4 | D13, vitals trends |
| `DonutChart` | Centre total, legend with percentages | 1, 4 | D13 (revenue by service, payment methods) |
| `GaugeChart` | Full and semi-circle | 3, 10 | Bed occupancy |
| `StackedBar` | | 10 | D13 |
| `Heatmap` | Day × hour grid | 10 | Peak arrival hours, attendance |
| `Sparkline` | Inside `KpiTile` | 3 | KPIs |

### 6.9 Templates

| Template | Slots | Used by |
|----------|-------|---------|
| `DashboardPage` | Header (title, actions), `MetricStrip`, `BentoGrid` | D13, home |
| `WorklistPage` | Filters, stage tabs, `Worklist`, `DetailDrawer`, KPI strip | D5, D7, D8, D9, D12 |
| `BoardPage` | Columns of `QueueCard`s plus KPI strip | D2, D10 |
| `WorkspacePage` | Banner, three regions (timeline, content, context rail) | D0, D4 |
| `WizardPage` | Steps, progress, `ActionBar` | D1 |
| `ConsolePage` | Tree navigation plus content (admin) | D14 |

### 6.10 Clinical composites (built only from the layers above)

`PatientBanner`, `AllergyChip`, `QueueCard`, `BedTile`, `ClaimReadinessMeter` (built on `SegmentedProgress`), `ResultFlag` (H, L, Critical), `VitalsGrid`, `OrderStatusRow`, `CriticalValueNotice`.

---

## 7. The status and tone registry

One file defines what every status in the hospital looks like. Reference 7 gives the visual pattern (tinted pill, icon, text).

### 7.1 Tones

`neutral`, `info`, `progress`, `pending`, `review`, `submitted`, `success`, `danger`, `expired`, and the reserved `critical`.

`critical` is **solid and high-contrast and is used only for safety**: critical lab values, allergy conflicts, breaches. It is never used for decoration or routine states.

### 7.2 Registry (source of truth)

```ts
// status/registry.ts
export type Tone =
  | "neutral" | "info" | "progress" | "pending" | "review"
  | "submitted" | "success" | "danger" | "expired" | "critical";

export const statusRegistry = {
  // encounter
  "encounter.registered":      { tone: "neutral",   icon: "user-plus",      label: "Registered" },
  "encounter.triaged":         { tone: "info",      icon: "activity",       label: "Triaged" },
  "encounter.in_consultation": { tone: "progress",  icon: "stethoscope",    label: "In consultation" },
  "encounter.investigations":  { tone: "pending",   icon: "flask",          label: "Investigations pending" },
  "encounter.awaiting_dispensing": { tone: "pending", icon: "pill",         label: "Awaiting dispensing" },
  "encounter.awaiting_billing":    { tone: "pending", icon: "receipt",      label: "Awaiting billing" },
  "encounter.closed":          { tone: "success",   icon: "check-circle",   label: "Closed" },
  "encounter.cancelled":       { tone: "expired",   icon: "x-circle",       label: "Cancelled" },
  // lab and orders
  "order.ordered":             { tone: "pending",   icon: "clock",          label: "Ordered" },
  "order.in_process":          { tone: "progress",  icon: "loader",         label: "In process" },
  "order.awaiting_verification": { tone: "review",  icon: "eye",            label: "Awaiting verification" },
  "order.verified":            { tone: "success",   icon: "check-circle",   label: "Verified" },
  "order.rejected":            { tone: "danger",    icon: "x-circle",       label: "Rejected" },
  "result.critical":           { tone: "critical",  icon: "alert-triangle", label: "Critical" },
  // claims (reference 7 vocabulary)
  "claim.draft":               { tone: "neutral",   icon: "file",           label: "Not ready" },
  "claim.ready":               { tone: "info",      icon: "check",          label: "Ready" },
  "claim.exported":            { tone: "submitted", icon: "send",           label: "Exported" },
  "claim.import_passed":       { tone: "success",   icon: "check-circle",   label: "Import passed" },
  "claim.import_warned":       { tone: "review",    icon: "alert-circle",   label: "Import warning" },
  "claim.import_failed":       { tone: "danger",    icon: "x-circle",       label: "Import failed" },
  "claim.submitted":           { tone: "submitted", icon: "send",           label: "Submitted" },
  "claim.accepted":            { tone: "success",   icon: "check-circle",   label: "Accepted" },
  "claim.rejected":            { tone: "danger",    icon: "x-circle",       label: "Rejected" },
  // beds
  "bed.available":             { tone: "success",   icon: "bed",            label: "Available" },
  "bed.occupied":              { tone: "info",      icon: "user",           label: "Occupied" },
  "bed.reserved":              { tone: "review",    icon: "bookmark",       label: "Reserved" },
  "bed.cleaning":              { tone: "pending",   icon: "sparkles",       label: "Cleaning" },
  "bed.out_of_service":        { tone: "expired",   icon: "ban",            label: "Out of service" },
  // …payment, prescription, appointment, stock, sync …
} as const satisfies Record<string, { tone: Tone; icon: IconName; label: string }>;

export type StatusKey = keyof typeof statusRegistry;
```

Modules map their own enums to `StatusKey`. They never choose a tone, colour or icon. Changing the look of "Pending" everywhere is one edit to `tones` or `StatusPill`. Changing which tone "Awaiting billing" uses is one line in the registry.

---

## 8. Charts

- One wrapper family in `@ui/charts` over one library. [VERIFY] the library after a short spike on low-end hardware (Dashboard Spec §10). The wrapper API below is fixed regardless of library.
- Series colours come only from `--chart-1 … 8`, ordered so neighbouring series are visually distinct and remain distinguishable for common types of colour blindness. [VERIFY] with a simulation test.
- Every chart has: title, subtitle or "as of" time, empty state, loading skeleton, tooltip, legend and an accessible data table alternative.
- Charts never compute business figures. They display series supplied by the server (revenue, counts, occupancy).

```tsx
<BarChart
  title="Patients by day"
  asOf={asOf}
  series={[{ name: "Registered", data }, { name: "Seen", data }]}
  highlight="Wed"
/>
```

---

## 9. Layout system

- 12-column grid, with `BentoGrid` for summary screens. Tile spans are named (`1x1`, `2x1`, `1x2`, `2x2`, `full`). A page says what it wants (`<BentoTile span="2x1">`), never pixels.
- Page templates fix the arrangement, so all dashboards share structure and spacing.
- Breakpoints: 1366 px (minimum desktop), 1024 px (tablet), 640 px (phone summary).
- Print layouts live in `themes/print.css` and the `Receipt`, `LabelSheet` and `PrintSheet` components. The fixed NHIS claim form layout is a separate print template because it must match the paper form.

### 9.1 Example: a dashboard page contains no styling

```tsx
export function PharmacyOverview() {
  const { data, asOf } = usePharmacySummary();
  return (
    <DashboardPage
      title="Pharmacy"
      actions={<Button intent="primary" icon="plus">New prescription</Button>}
    >
      <MetricStrip>
        <KpiTile label="Waiting" value={data.waiting} delta={data.waitingDelta} deltaMeaning="lower-is-better" asOf={asOf} />
        <KpiTile label="Dispensed today" value={data.dispensed} asOf={asOf} />
        <KpiTile label="Low stock items" value={data.lowStock} tone="pending" asOf={asOf} />
      </MetricStrip>
      <BentoGrid>
        <BentoTile span="2x1"><BarChart title="Dispensed per hour" series={data.hourly} /></BentoTile>
        <BentoTile><AlertList items={data.stockAlerts} /></BentoTile>
      </BentoGrid>
    </DashboardPage>
  );
}
```

No colours, no padding values, no class names. Redesign the tiles or the grid and this page changes with no edit.

---

## 10. Themes, modifiers and effects

| Item | Mechanism | Notes |
|------|-----------|-------|
| Light, dark | `data-theme` on the root | Follows system by default, user override stored |
| High contrast | `data-theme="high-contrast"` | Accessibility theme, available to all |
| Density | `data-density` | Comfortable or compact, per user, default by role |
| Reduced effects | `data-effects="reduced"` | Replaces all glass with solid surfaces. Automatic under `prefers-reduced-transparency` |
| Print | `@media print` + `print.css` | Receipts, labels, forms |

### 10.1 Glass is contained in two components [DECISION]

Glass (blur, translucency) exists only inside `TopBar` and `SideRail`. It is **not exported** from `@ui`. No module, page or other pattern can request it. A `Card` has no `glass` variant. This is how the "glass on navigation only" decision from the Dashboard Specification becomes impossible to violate by accident. It also means turning glass on or off for the whole product is one token (`--nav-material`).

---

## 11. Governance and enforcement

The rules in Section 1 are enforced automatically so no one depends on memory.

| Control | What it blocks | Where |
|---------|---------------|-------|
| Restricted imports | Modules importing `@radix-ui/*`, `lucide-react`, chart libraries or `@ui/<subpath>` directly | ESLint `no-restricted-imports` |
| No styling in modules | `className` with colour, radius, shadow or arbitrary-value utilities; inline `style` with colours; hex or rgb literals | ESLint custom rule and a CI grep step |
| No CSS in modules | `.css` or `.module.css` files under `src/modules` | CI check |
| Public props | `className` and `style` omitted from every public component's props | TypeScript |
| Statuses | Only `StatusKey` values accepted by `StatusPill` | TypeScript |
| Token integrity | Every component token resolves to a semantic token. Every semantic token is defined in every theme | Token test |
| Contrast | Every text and surface token pair in every theme meets WCAG AA (4.5:1 text, 3:1 components) | Automated test on token pairs, fails CI |
| Visual regression | Unintended appearance change | Screenshot of every component, variant, theme and density |
| Accessibility | Missing labels, roles, keyboard traps | axe checks in Storybook and E2E |
| Storybook completeness | A component without stories for all variants and themes | CI check |

Illustrative lint rule (the exact configuration is finalised at implementation):

```js
// eslint: modules may not carry their own colours
"no-restricted-syntax": ["error", {
  selector: "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|ring|fill|stroke)-(red|green|blue|teal|amber|orange|violet|gray|slate|black|white)\\b/]",
  message: "Do not style in modules. Use a @ui variant or add it to the design system."
}]
```

### 11.1 Adding something new (rule R4)

1. A page needs a thing that does not exist.
2. The need is raised. A design system change is made first: tokens, component, story, tests.
3. The page then uses it.

No exceptions for "just this once", because that is how a one-place design change stops being possible.

### 11.2 Versioning

The design system is part of the monorepo, so a change ships with all dashboards at once. Breaking changes are listed in `DESIGN_SYSTEM_CHANGELOG.md` and require the visual regression suite to pass.

---

## 12. Build order (Release 0)

| Milestone | Delivers | Done when |
|-----------|----------|-----------|
| **M1 Tokens and themes** | All three token tiers, light, dark, density, reduced effects | Token tests and contrast tests pass |
| **M2 Foundations and primitives** | Layout, Text, Icon, Button, fields, Checkbox, pills, Avatar, Skeleton, Tooltip | Stories for all variants, themes, densities |
| **M3 Patterns** | Card, KpiTile, ListRow, Worklist, Toast, Tabs, SegmentedControl, Pagination, Timeline, InfoPanel, Calendar, Progress | Visual and a11y tests pass |
| **M4 Status registry and charts** | Registry, all chart types, accessible data tables | Registry covers every status in the dashboard spec |
| **M5 Templates and clinical composites** | Page templates, PatientBanner, QueueCard, BedTile, ClaimReadinessMeter | A sample dashboard is assembled with **no module styling** |
| **M6 Enforcement** | Lint rules, CI checks, Storybook gates | A deliberate violation fails the build |

The "one-place change" proof is part of acceptance: with the sample dashboard from M5, a reviewer changes `--button-radius`, the brand colour and one status tone, and confirms the entire sample changes with those three edits and nothing else.

---

## 13. Definition of done for any component

1. Built from tokens only, with typed variants and no `className` or `style` prop.
2. All states implemented, in all themes and both densities.
3. Keyboard and screen reader behaviour tested.
4. Passes contrast tests.
5. Has stories and visual snapshots.
6. Documented with when to use it and when not to.
7. Used by at least one dashboard or has a written, named consumer in the Dashboard Specification.

---

## 14. Open items [VERIFY]

| # | Item | Affects |
|---|------|---------|
| S1 | Brand colour, logo and any existing hospital identity | Brand scale, `HeroBanner`, print headers |
| S2 | Icon set (the previous build used Lucide) | `Icon` mapping |
| S3 | Chart library after a performance spike on low-end hardware | Charts |
| S4 | Font: system stack assumed. Confirm no licensed brand font is required | Typography |
| S5 | Colour-blind simulation results for chart series and status tones | Tokens |
| S6 | Whether a high-contrast theme is required at launch or later | Themes |
| S7 | Print hardware (label printers, receipt printers) and label sizes | `LabelSheet`, `Receipt` |
| S8 | Whether staff need a user-selectable theme, or role defaults only | Settings screen |

---

## 15. Decisions to freeze

| Decision | Status |
|----------|--------|
| One public entry point `@ui`. Modules never style | **Approved** (owner requirement) |
| Three-tier tokens: primitive, semantic, component | Proposed |
| Variants as typed props. No `className` or `style` on public components | Proposed |
| Single status and tone registry | Proposed |
| "Selected" (black pill) and "action" (brand) are separate tokens | Proposed |
| Glass confined to `TopBar` and `SideRail`, not exported | Proposed |
| Gradient allowed only in `HeroBanner` | Proposed |
| No decorative multi-colour KPI tiles | Proposed |
| One chart library behind our own wrappers, with accessible table alternatives | Proposed |
| Enforcement by lint, CI and visual regression | Proposed |
| New UI needs enter the design system first (rule R4) | Proposed |

---

## 16. Next documents

1. **Database Blueprint**, derived from the Dashboard Specification.
2. **Repository foundation**: scaffold of `@ui` with M1 and M2 (tokens, themes, primitives, Storybook, lint rules), so dashboards are built on it from the first screen.
3. **Module workflow documents**.

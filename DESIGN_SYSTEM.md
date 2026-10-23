# ILLUMATRIX HUD Design System Specification

> **Document Status:** Active Design Specification  
> **Aesthetic Philosophy:** Sci-Fi Production Terminal / Tactical Heads-Up Display (HUD)  
> **Source of Truth:** `src/index.css`, `src/App.tsx`, and verified component library

---

## 1. Visual Style & Theme Principles

ILLUMATRIX uses a high-contrast, tactical sci-fi command console aesthetic reminiscent of spaceflight telemetry, radar monitors, and precision avionics. 

Core tenets:
- **Dark Obsidian Canvas**: Deep space black background (`#030712`) with frosted translucent surface panels.
- **Vibrant Functional Accents**: Sharp cyber-yellow (`#FFE600`) for primary actions/selection and neon cobalt cyan (`#00F0FF`) for telemetry/navigation.
- **Restrained HUD Elements**: Subtle background scanlines, grid coordinates, and monospace typography.
- **Zero Decorative Slop**: Every badge, status pill, and border serves an explicit informational purpose (e.g. stage state, model health, pacing warning).

---

## 2. Color Palette & CSS Variables

Defined in `src/index.css`:

```css
:root {
  /* Surface Layers */
  --bg-canvas: #030712;              /* Primary dark background */
  --bg-terminal: #000000;            /* Terminal / console drawer */
  --bg-surface: #0B0F19;             /* Card / panel background */
  --bg-surface-elevated: #111726;    /* Modals & elevated dropdowns */
  --border-hud: #1E293B;             /* Standard component border */
  --border-hud-highlight: #334155;   /* Active / focused border */

  /* Functional Accents */
  --accent-primary: #FFE600;         /* Primary yellow (CTA, selection, warnings) */
  --accent-amber: #EAB308;           /* Amber secondary */
  --accent-secondary: #00F0FF;       /* Cyan neon (telemetry, active stage) */
  --accent-cyan: #06B6D4;            /* Cyan muted */
  --accent-success: #10B981;         /* Emerald green (approved, connected) */
  --accent-error: #FB7185;           /* Rose pink / red (failed, stale, alerts) */
  --accent-muted: #94A3B8;           /* Slate grey text */
}
```

### Visual Glow Classes
- `.hud-glow-yellow`: `box-shadow: 0 0 15px -3px rgba(255, 230, 0, 0.15);`
- `.hud-glow-cyan`: `box-shadow: 0 0 15px -3px rgba(0, 240, 255, 0.15);`
- `.hud-glow-emerald`: `box-shadow: 0 0 15px -3px rgba(16, 185, 129, 0.15);`
- `.hud-glow-rose`: `box-shadow: 0 0 15px -3px rgba(251, 113, 133, 0.15);`
- `.hud-grid-bg`: 32px x 32px subtle grid overlay (`rgba(30, 41, 59, 0.15)`).

---

## 3. Typography

- **Primary Font**: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
- **Secondary Monospace**: `'Share Tech Mono'` (imported via Google Fonts in `index.html`)
- **Pacing & Readability**:
  - Code/Telemetry labels: `text-[10px]` or `text-xs`, uppercase, tracked (`tracking-wider` / `tracking-widest`).
  - Section headers: `text-sm font-bold text-white tracking-wide`.
  - Stage titles: `text-xl font-bold text-white`.
  - Body narration: `text-xs text-slate-300 leading-relaxed font-mono`.

---

## 4. 3-Zone Workspace Layout

The application viewport (`100vw x 100vh`) is strictly bounded and structured into three functional zones plus header and drawer overlays:

```
+-----------------------------------------------------------------------------------------+
| [Zone 0: TopStatusBar] (h-14, fixed top)                                                |
| Project name, Session Selector, Provider status badge, Quota Radar toggle, Stage pill   |
+-----------------------------------------------------------------------------------------+
| [Zone 1: Left Stepper] | [Zone 2: Center TaskWorkspace]     | [Zone 3: ControlCenter]   |
| (w-64, fixed left)     | (flex-1, scrollable canvas)        | (w-80, collapsible right) |
|                        |                                    |                           |
| 7 Workflow stages with | Dynamic stage workspace:           | Model selector, quota     |
| step #, badge, lock,   | - 01_SETUP                         | telemetry, activity log   |
| stale indicator        | - 02_SOURCES                       | drawer trigger, project   |
|                        | - 03_SCRIPT_STUDIO                 | quick settings            |
|                        | - 04_SCENE_PROMPTS                 |                           |
|                        | - 05_SEO_PACKAGE                   |                           |
|                        | - 06_THUMBNAIL_STUDIO              |                           |
|                        | - 07_REVIEW_EXPORT                 |                           |
+-----------------------------------------------------------------------------------------+
| [Zone 4: Bottom ActivityTerminal Drawer] (Collapsible, h-64, live event stream)        |
+-----------------------------------------------------------------------------------------+
```

---

## 5. Standard Component Patterns

### 5.1 Stage Card Container
```tsx
<div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
  <div className="flex items-center justify-between">
    <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
      <Icon className="w-4 h-4 text-[#00F0FF]" />
      SECTION TITLE
    </span>
    <span className="text-[10px] text-slate-500 uppercase">Context Badge</span>
  </div>
  {/* Content */}
</div>
```

### 5.2 Primary Action Button (Yellow Glow)
```tsx
<button className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)]">
  <span>CONFIRM ACTION</span>
  <ArrowRight className="w-4 h-4" />
</button>
```

### 5.3 Secondary Telemetry Button (Cyan Outline)
```tsx
<button className="px-3 py-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] text-xs font-bold transition-all">
  VIEW TELEMETRY
</button>
```

---

## 6. Accessibility & Keyboard Shortcuts

As verified in `src/App.tsx`:
- **`Escape`**: Closes active overlays (Activity Terminal Drawer, Provider Manager Modal, Project Modal).
- **`Alt + [1-7]`**: Instant direct jump to corresponding workflow stage (`Alt+1` = Setup, `Alt+2` = Sources, ..., `Alt+7` = Review & Export).
- **Focus Rings**: Monospace form controls feature high-contrast `focus:border-[#00F0FF]` and `focus:ring-1 focus:ring-[#00F0FF]` states.

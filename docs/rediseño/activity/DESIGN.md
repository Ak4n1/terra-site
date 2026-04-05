# Design System Specification: The Architectural Dashboard

## 1. Overview & Creative North Star
**Creative North Star: "The Precision Atelier"**
This design system moves beyond the "generic SaaS dashboard" by treating the interface as a high-end architectural blueprint. Instead of flat boxes and rigid lines, we utilize **Tonal Architecture**. The goal is a high-density configuration environment that feels calm, authoritative, and bespoke. We break the "template" look by prioritizing negative space as a structural element and using subtle depth transitions to guide the eye, rather than heavy borders.

## 2. Colors & Surface Logic
The palette is rooted in a sophisticated range of cool grays and technical blues, designed to reduce cognitive load during complex configuration tasks.

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts.
*   **Example:** A `surface-container-low` configuration panel sitting on a `surface` background.
*   **The Logic:** If the user can see a line, the design is too "loud." Let the change in value (brightness) do the work.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base Layer:** `surface` (#f8f9fa) – The canvas.
*   **Secondary Zones:** `surface-container-low` (#f1f4f6) – Used for large sidebar or navigation areas.
*   **Primary Work Area:** `surface-container-lowest` (#ffffff) – Reserved for the highest priority interaction zones (e.g., the active config form).
*   **Interactive Overlays:** `surface-bright` (#f8f9fa) – Used for elements that need to feel "lifted" but not floating.

### The "Glass & Gradient" Rule
For floating elements like tooltips or dropdowns, use Glassmorphism:
*   **Token:** `surface-container-highest` at 80% opacity with a `12px` backdrop-blur. 
*   **Signature Textures:** For primary action buttons, apply a subtle linear gradient from `primary` (#0c56d0) to `primary_dim` (#004aba) at a 135-degree angle. This adds "soul" and a tactile quality to the professional aesthetic.

## 3. Typography: The Inter Editorial
We use **Inter** not just as a font, but as a data-visualization tool. 

*   **Display & Headlines:** Use `headline-sm` (1.5rem) for major section titles. Track these at `-0.02em` for a tighter, high-end look.
*   **The Functional Core:** `body-md` (0.875rem) is the workhorse. Use `on-surface-variant` (#586064) for labels to create a soft contrast against `on-surface` (#2b3437) values.
*   **Data Density:** For configuration keys and secondary metadata, use `label-sm` (0.6875rem) in all-caps with `+0.05em` letter spacing. This mimics technical instrumentation and feels more "designed" than standard small text.

## 4. Elevation & Depth
We eschew traditional drop shadows for **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface-container-lowest` card placed on a `surface-container-high` background creates a natural, soft lift.
*   **Ambient Shadows:** If a floating state is required (e.g., a dragged module), use a shadow tinted with `on-surface` color: `0px 12px 32px rgba(43, 52, 55, 0.06)`.
*   **The "Ghost Border" Fallback:** If accessibility requires a container edge, use the **Ghost Border**: `outline-variant` (#abb3b7) at **15% opacity**. Never use a 100% opaque border.

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_dim`), `rounded-md` (0.375rem). Use `label-md` for text to maintain a crisp, professional profile.
*   **Secondary:** `surface-container-high` background with no border. Text in `on-surface`.
*   **Tertiary:** Transparent background. Text in `primary`. Hover state uses `primary-container` at 40% opacity.

### Input Fields
*   **Default State:** `surface-container-highest` background, Ghost Border (15% opacity), `rounded-sm`.
*   **Focus State:** `primary` Ghost Border at 40% opacity, with a 2px outer glow of `primary_fixed_dim`.
*   **Layout:** Labels should be `label-md` and placed *above* the field, left-aligned, with a `spacing-1.5` gap.

### Cards & Configuration Rows
*   **No Dividers:** Forbid horizontal rules between rows. Instead, use a `spacing-4` vertical gap or a subtle hover state shift to `surface-container-low`.
*   **High-Density Config:** Use "Key-Value Pairs" where the Key is `label-sm` (muted) and the Value is `body-md` (high contrast).

### Chips (Status Indicators)
*   **Success:** `tertiary-container` background with `on-tertiary-container` text.
*   **Error:** `error-container` background with `on-error-container` text.
*   Keep chips small (`rounded-full`) to avoid distracting from the primary configuration flow.

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical margins. A wider left margin on a text block creates an editorial "breathing room" that feels premium.
*   **Do** use `spacing-8` or `spacing-10` between major configuration groups to prevent the 1368x768 screen from feeling cluttered.
*   **Do** use `on-surface-variant` for "Instructional Text" to keep the UI hierarchy clean.

### Don't:
*   **Don't** use pure black (#000) for text. Always use `on-surface` (#2b3437) to maintain the professional, neutral aesthetic.
*   **Don't** use 1px dividers to separate list items. Use white space (`spacing-3`) instead.
*   **Don't** use default browser focus rings. Always use the specified Ghost Border focus state.
*   **Don't** saturate the dashboard with too much `primary` blue. Save it for the "Final Action" (e.g., Save Changes). Use `secondary` for navigation or minor actions.
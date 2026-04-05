# Design System Document

## 1. Overview & Creative North Star: "The Gilded Archive"

This design system is built to transform a standard gaming administration panel into a premium, editorial experience. The **Creative North Star** is "The Gilded Archive"—a visual language that balances the raw, brutalist weight of ancient artifacts with the precision of a high-end modern interface.

Unlike generic dashboards that rely on repetitive grids and heavy borders, this system uses **intentional asymmetry** and **tonal depth**. We break the "template" look by treating the screen as a dark, cavernous space where information is illuminated by "golden light." Expect overlapping elements, cinematic typography scales, and a rigid adherence to sharp, 0px corners that evoke a sense of architectural permanence and "epic" stakes.

---

## 2. Colors

The palette is rooted in deep obsidian tones with luminous golden accents. It is designed for high-contrast readability and atmospheric immersion.

### Palette Highlights
- **Core Background:** `surface` (#131313) — A deep, true dark that acts as the "void."
- **Primary Accent:** `primary` (#f2ca50) — A vibrant gold used for critical actions and brand markers.
- **Secondary Accent:** `secondary` (#ffb77d) — A soft, sunset orange for secondary highlights and interactive cues.
- **Surface Hierarchy:** `surface_container_lowest` (#0e0e0e) through `surface_container_highest` (#353534).

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Layout boundaries must be defined through **background color shifts**. For example, a card should be distinguished from the main background by placing a `surface_container_low` object on top of a `surface` background. The eye should perceive the change in depth through color, not a drawn line.

### Glass & Gradient Implementation
To add "soul" to the data, use gradients sparingly. Main Call-to-Actions (CTAs) should transition from `primary` (#f2ca50) to `primary_container` (#d4af37). Floating modals or overlays should utilize **Glassmorphism**: semi-transparent `surface_variant` colors with a `backdrop-blur` of 12px-20px to feel integrated into the environment.

---

## 3. Typography

The system employs a high-contrast typographic pairing to bridge the gap between "Epic Fantasy" and "Modern Utility."

- **The Epic Voice (Headlines):** `Newsreader` is our serif display font. Use `display-lg` and `headline-lg` for page titles and major sections. This font carries the weight of a legendary chronicle. Use **Uppercase** for `label-md` when categorized as "Epic" to denote authority.
- **The Modern Tool (Data):** `Inter` is our sans-serif workhorse. Used for `body` and `title` scales, it ensures that complex game data, logs, and technical specs remain razor-sharp and legible.

**Hierarchy Tip:** Titles should always be `on_surface` (#e5e2e1), while secondary metadata should drop to `on_surface_variant` (#d0c5af) to create a clear visual map.

---

## 4. Elevation & Depth: Tonal Layering

We reject traditional box shadows. Depth is achieved through the **Layering Principle**.

1.  **The Stack:** Base layer is `surface`. Secondary containers use `surface_container_low`. Interactive cards use `surface_container_high`.
2.  **Ambient Glows:** When a floating effect is required, use an "Ambient Shadow." This is a large-spread blur (30px+) at 5% opacity, using the `primary` (gold) color rather than black. This creates a "glow" rather than a "shadow."
3.  **The Ghost Border:** If a separator is required for accessibility, use a "Ghost Border": the `outline_variant` (#4d4635) token at **15% opacity**. This provides a hint of structure without cluttering the UI.
4.  **Defined Edges:** Per the `Roundedness Scale`, all components must have a **0px radius**. Sharp corners are non-negotiable; they convey the "Epic/Fantastical" tone of stone-cut precision.

---

## 5. Components

### Buttons
- **Primary:** Background `primary` (#f2ca50), Text `on_primary` (#3c2f00). Sharp 0px edges. On hover, apply a subtle `primary_fixed` outer glow.
- **Secondary:** Transparent background with a `Ghost Border` (1px `outline` at 20% opacity). Text in `primary`.
- **Tertiary/Ghost:** Text only in `on_surface_variant`, transitioning to `on_surface` on hover.

### Input Fields
- **State:** Fields use `surface_container_highest` (#353534) for the background.
- **Active State:** Instead of a full border, use a 2px bottom-border of `primary` (#f2ca50) and a subtle internal glow.
- **Labels:** Use `label-sm` in `secondary` (#ffb77d) to provide a warm, legible contrast.

### Cards & Lists
- **Rule:** Forbid the use of divider lines.
- **Separation:** Use `spacing.8` (1.75rem) vertical white space to separate list items.
- **Selection:** A selected item should use a `surface_container_high` background with a `primary` vertical accent line (4px width) on the far left.

### Featured Gaming Component: "The Stat Shard"
For game-specific stats (e.g., Gold, Level, XP), use a high-contrast layout: `Newsreader` Headline-sm for the value, and `Inter` label-sm in `on_surface_variant` for the descriptor. Wrap these in a `surface_container_lowest` box with a 5% gold gradient overlay.

---

## 6. Do's and Don'ts

### Do
*   **Do** use extreme vertical spacing. Let the data "breathe" to feel premium.
*   **Do** use `primary` (gold) for icons when they represent "Action" or "Value."
*   **Do** align all text to a rigid grid, but vary the widths of containers to create an asymmetrical, editorial feel.
*   **Do** use sharp 0px corners on every single element, from buttons to large containers.

### Don't
*   **Don't** use rounded corners (`0px` is the law of the system).
*   **Don't** use pure white (#FFFFFF). Always use `on_surface` (#e5e2e1) to maintain the "aged" feel.
*   **Don't** use standard "drop shadows" (black/grey). If you need lift, use tonal shifts or golden ambient glows.
*   **Don't** use dividers. If the layout feels messy, increase your `spacing` tokens instead of adding lines.
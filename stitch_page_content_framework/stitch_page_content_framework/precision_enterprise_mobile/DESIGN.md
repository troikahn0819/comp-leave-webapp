---
name: Precision Enterprise Mobile
colors:
  surface: '#faf8ff'
  surface-dim: '#d8d9e6'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#ecedfa'
  surface-container-high: '#e6e7f4'
  surface-container-highest: '#e1e2ee'
  on-surface: '#191b24'
  on-surface-variant: '#424656'
  inverse-surface: '#2e303a'
  inverse-on-surface: '#eff0fd'
  outline: '#727687'
  outline-variant: '#c2c6d8'
  surface-tint: '#0054d6'
  primary: '#0050cb'
  on-primary: '#ffffff'
  primary-container: '#0066ff'
  on-primary-container: '#f8f7ff'
  inverse-primary: '#b3c5ff'
  secondary: '#5c5f61'
  on-secondary: '#ffffff'
  secondary-container: '#e0e3e5'
  on-secondary-container: '#626567'
  tertiary: '#4f5a6e'
  on-tertiary: '#ffffff'
  tertiary-container: '#677287'
  on-tertiary-container: '#f6f7ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#003fa4'
  secondary-fixed: '#e0e3e5'
  secondary-fixed-dim: '#c4c7c9'
  on-secondary-fixed: '#191c1e'
  on-secondary-fixed-variant: '#444749'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#faf8ff'
  on-background: '#191b24'
  surface-variant: '#e1e2ee'
typography:
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 16px
  stack-gap: 12px
---

## Brand & Style

The design system is engineered for utility, reliability, and corporate efficiency. It targets HR professionals and employees who require a dependable tool for managing compensatory leave calculations on the go. The aesthetic is **Corporate / Modern**, prioritizing information density and clarity over decorative elements.

The UI should evoke a sense of "Automated Accuracy." By using a structured grid and a disciplined color palette, the interface minimizes cognitive load and maximizes trust. The visual narrative is defined by:
- **Cleanliness:** Ample white space to separate complex data points.
- **Professionalism:** A rigorous adherence to alignment and systematic hierarchy.
- **Efficiency:** Streamlined workflows that utilize clear functional signifiers.

## Colors

The palette is anchored by a high-energy **Primary Blue (#0066FF)**, used exclusively for primary actions, progress indicators, and active navigational states. This ensures that the user's eye is immediately drawn to the next logical step in the workflow.

**Neutral Scales:**
- Backgrounds utilize `neutral_50` and `neutral_100` to create subtle depth without the harshness of pure white in high-density views.
- Text uses `neutral_900` for high-contrast readability and `neutral_600` for secondary metadata.

**Functional Colors:**
- **Success:** Used for "Ready," "Calculated," or "Approved" statuses.
- **Error:** High-visibility red for "Calculation Error" or "Missing Data."
- **Warning:** Amber for "Manual Review Required" or "Edge Case Detected."

## Typography

Typography is the backbone of this data-centric application. We utilize **Hanken Grotesk** for headlines to provide a modern, sharp executive feel. **Inter** is used for all UI labels and body text due to its exceptional legibility at small sizes on mobile screens.

For specific numeric data or time-stamps (like leave hours or calculation strings), a secondary monospaced font (**JetBrains Mono**) may be used to ensure tabular alignment and numerical clarity.

**Mobile Scaling:**
- Headlines are capped at 24px on mobile to ensure they don't consume excessive vertical space.
- Labels use a slightly increased letter-spacing to maintain readability when condensed into tight status badges.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a base unit of **4px**. On mobile devices, the standard horizontal margin is **16px** to ensure content remains centered while providing a comfortable "safe zone" for thumb interaction.

**Key Layout Rules:**
- **Vertical Rhythm:** Content cards and sections are separated by a standard `stack-gap` of 12px or 16px to maintain a dense but organized information hierarchy.
- **Touch Targets:** All interactive elements (buttons, inputs) must maintain a minimum height of 44px to comply with accessibility standards, despite the overall "compact" aesthetic.
- **Sectioning:** Group related calculation inputs into distinct cards with internal padding of 16px.

## Elevation & Depth

To maintain a professional and clean appearance, the design system avoids heavy shadows. Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines**.

- **Surface Level 0:** Background (`neutral_50`).
- **Surface Level 1:** Primary content cards (White background, 1px border `neutral_200`).
- **Surface Level 2:** Overlays, Modals, or Tooltips (White background, soft 8% opacity shadow, 16px blur).

**Active States:**
Interactive cards or list items do not "lift" on press; instead, they utilize a subtle background color shift (to `neutral_100`) or a 2px stroke of the `primary_color_hex` to indicate selection.

## Shapes

The design system uses a **Soft (1)** roundedness level. This choice strikes a balance between the friendliness of consumer apps and the rigid structure of enterprise software.

- **Standard Elements:** 0.25rem (4px) corner radius for buttons and input fields.
- **Large Elements:** 0.5rem (8px) for cards and containers.
- **Status Badges:** Fully pill-shaped (rounded-full) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid `#0066FF` with white text. Used for "Start Calculation" or "Save."
- **Secondary:** White background with `#0066FF` border and text. Used for "Add File" or "Edit Rules."
- **Ghost:** No background or border. Used for "Cancel" or "View Details."

### Cards
Cards are the primary container for calculation steps. They should feature a 1px `neutral_200` border and no shadow. Title headers within cards should use `headline-sm` with a bottom divider.

### Status Chips
Used for "Calculation Status."
- **Text:** `label-sm` in bold uppercase or title case.
- **Background:** Low-saturation tints of the status colors (e.g., Success status gets a 10% opacity green background with 100% opacity green text).

### Input Fields
- **Default:** 1px `neutral_200` border, `body-md` text.
- **Focused:** 2px `primary_color_hex` border.
- **Error:** 1px `status_error` border with a small helper message below.

### Data Lists
Mobile data lists (e.g., history of leave) should use a chevron-right icon to indicate drill-down capability. Use `body-md` for the primary label and `body-sm` (Neutral 600) for the secondary description.
---
name: Nocturnal Resonance
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e0bfb9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#a78a84'
  outline-variant: '#58413c'
  surface-tint: '#ffb4a4'
  primary: '#ffb4a4'
  on-primary: '#640d00'
  primary-container: '#c84b31'
  on-primary-container: '#fffbff'
  inverse-primary: '#aa361e'
  secondary: '#c4c4e0'
  on-secondary: '#2d2f44'
  secondary-container: '#44455c'
  on-secondary-container: '#b3b3ce'
  tertiary: '#c8c6ca'
  on-tertiary: '#303033'
  tertiary-container: '#757478'
  on-tertiary-container: '#fffbff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad3'
  primary-fixed-dim: '#ffb4a4'
  on-primary-fixed: '#3e0500'
  on-primary-fixed-variant: '#891e07'
  secondary-fixed: '#e1e0fd'
  secondary-fixed-dim: '#c4c4e0'
  on-secondary-fixed: '#181a2e'
  on-secondary-fixed-variant: '#44455c'
  tertiary-fixed: '#e4e1e5'
  tertiary-fixed-dim: '#c8c6ca'
  on-tertiary-fixed: '#1b1b1e'
  on-tertiary-fixed-variant: '#47464a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  label-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.1em
  value-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '300'
    lineHeight: 20px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  zone-height-lg: 33.33vh
  key-gutter: 2px
  safe-margin: 2rem
---

## Brand & Style
The design system centers on an immersive, tactile experience for musical expression. It adopts a **Minimalist-Tactile** hybrid style, stripping away traditional UI chrome to focus entirely on the "playing surface." The interface is divided into three distinct horizontal zones of influence, using color and light to define functional boundaries rather than lines or borders.

The target audience is composers and live performers who require an interface that feels like a physical instrument—responsive, deep, and focused. The emotional response should be one of "flow state" immersion, where the UI disappears into the dark, leaving only the performer and the sound.

## Colors
This design system utilizes a tiered dark palette structured into functional horizontal bands:
- **Ethereal Silver/Indigo (Top):** High-frequency zone. Uses semi-translucent silver with indigo undertones to represent "Bells."
- **Warm Mahogany/Amber (Middle):** Mid-frequency zone. A rich, glowing core representing the "Marimba."
- **Deep Charcoal (Bottom):** Low-frequency zone. A near-black, weighted foundation for the "Bass Drone."

The background is a deep `#0D0D0D` to allow the zone colors to "glow" from within the interactive elements.

## Typography
Typography is intentionally minimized to avoid visual clutter. Text should only appear as secondary metadata or subtle orientation markers. 

- Use **Inter** for its neutral, functional clarity.
- All text should be rendered at low opacity (30-50%) unless actively being interacted with.
- Use Uppercase for labels to emphasize the geometric, architectural feel of the interface.
- Font sizes never exceed 14px to maintain the scale of the playing surface.

## Layout & Spacing
The layout is a **Fixed-Ratio Horizontal Stack**. The screen is split into three primary zones of equal or weighted height. 

- **Internal Spacing:** Elements within zones (keys, pads, sliders) use a minimal 2px gutter to create a "scored" appearance, like fine woodworking or precision-milled metal.
- **Margins:** A 32px safe area is maintained around the perimeter for global controls, but the playing surfaces should ideally bleed to the edges to maximize touch targets.
- **Orientation:** Landscape orientation is mandatory to accommodate the horizontal frequency bands.

## Elevation & Depth
The design system avoids traditional drop shadows in favor of **Internal Glows** and **Tonal Layers**. 

- **Sunken Surfaces:** Inactive keys or pads are slightly darker than their zone background, appearing "carved out" of the surface.
- **Luminescent States:** Active or "played" states use a soft inner glow (box-shadow: inset) of the zone's primary color, simulating a physical light source beneath the surface.
- **Glass Overlays:** Global menus or settings use a high-radius backdrop blur (20px+) with 5% white tint to sit "above" the instrument without obscuring the performer's sense of place.

## Shapes
The shape language is **Soft-Geometric**. 

- Use `rounded-sm` (4px) for individual keys and interactive nodes to maintain a precision-instrument aesthetic.
- Avoid fully rounded "pill" shapes; rectangles with slight rounding feel more like professional hardware.
- Circular elements are reserved exclusively for "Modulators" or "Rotary" functions to distinguish them from "Note" triggers.

## Components
- **Interactive Keys:** Large rectangular areas within the three color bands. Inactive: Base color at 60% saturation. Active: 100% saturation with a white-hot center glow.
- **Modulation Sliders:** Thin, vertical lines with a single "bead" indicator. The bead color matches the zone color but at 100% brightness.
- **Global Toggles:** Minimalist icons (Inter glyphs) located in the corners of the screen. No background containers; the icon sits directly on the zone surface.
- **Visualizer Nodes:** Small, floating indigo or silver particles that appear in the "Bells" section upon contact, dissipating with a soft blur.
- **Pressure Sensitive Pads:** Elements that change their "glow" radius based on the Z-axis (pressure/velocity) input, expanding the light outward as pressure increases.
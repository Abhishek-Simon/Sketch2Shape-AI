---
name: Dimensional Studio
colors:
  surface: '#faf8ff'
  surface-dim: '#d5d9ef'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e3e7fd'
  surface-container-highest: '#dde2f7'
  on-surface: '#161b2a'
  on-surface-variant: '#474554'
  inverse-surface: '#2b3040'
  inverse-on-surface: '#eef0ff'
  outline: '#787586'
  outline-variant: '#c8c4d7'
  surface-tint: '#5745d9'
  primary: '#4d38ce'
  on-primary: '#ffffff'
  primary-container: '#6655e8'
  on-primary-container: '#f2edff'
  inverse-primary: '#c6bfff'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#74f8e4'
  on-secondary-container: '#007165'
  tertiary: '#864200'
  on-tertiary: '#ffffff'
  tertiary-container: '#aa5600'
  on-tertiary-container: '#ffece2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#3f26c1'
  secondary-fixed: '#74f8e4'
  secondary-fixed-dim: '#54dbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005047'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#faf8ff'
  on-background: '#161b2a'
  surface-variant: '#dde2f7'
typography:
  display:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system powers an advanced generative 3D modeling environment bridging the accessibility of modern AI generation with the precision of spatial CAD tools like Spline and Shapr3D. The user experience is engineered for 3D generalists, concept artists, game developers, and industrial designers who demand immediate creative momentum without sacrificing structural rigor.

### Aesthetic Movement
The aesthetic marries **Tactile Utility** with **Precision Minimalism**. The chrome recedes behind light neutral surfaces to maintain absolute focus on the creative subject matter, while spatial viewports plunge into an immersive deep-navy dark canvas. Interactive panels utilize razor-sharp hairline dividers, calibrated inner keyline strokes, and targeted micro-elevations rather than heavy skeuomorphism or loud decorative gradients.

### Personality & Tone
- **Precision Instrumentation:** Every dial, panel header, node point, and viewport gimbal projects engineering-grade calibration.
- **Generative Fluidity:** AI transitions, mesh generation feedback, and material bake states feel snappy, progressive, and deterministic.
- **Cognitive Clarity:** Dense multi-inspector toolchains remain organized via unified geometric rhythms and intentional focal hierarchy.

## Colors

The application operates as a dual-surface visual environment: an ergonomic high-contrast neutral light interface for tool panels, sidebars, and parameter inspectors, flanking a specialized deep dark environment specifically reserved for the 3D WebGL/WebGPU canvas.

### Color Roles & Implementation

- **Primary Accent (`#6655E8` - Electric Indigo):** Anchors core generative calls-to-action ("Generate Mesh", "Bake Textures"), active mesh vertex selections, keyframe markers, and focused spatial manipulation handles.
- **Secondary Accent (`#20B8A6` - Precision Teal):** Denotes computational completion, export readiness, high-fidelity geometry states, positive topology verification, and UV-unwrap validation.
- **Dark Surface & Viewport Anchor (`#171B2D` - Void Navy):** The dedicated canvas background for the real-time 3D viewport, viewport floating HUD toolbars, and rendering overlays. Eliminates eye strain during lighting adjustments.
- **App Shell & Panel Base (`#F5F6FA` - Studio Tint Base):** The primary host surface behind floating utility sidebars, canvas frames, and top utility bars.
- **Container & Card Surface (`#FFFFFF` - Pure White):** All docked tooling panels, modal sheets, prompt bars, and parameter groupings.
- **Dividers & Structural Borders (`#E2E8F0` / `#E5E7EB`):** Subtle hairline demarcations that frame inputs, tab strips, and dock sections without visual clutter.
- **Main Typography & Heavy Elements (`#252A3A` - Carbon Charcoal):** Dominant dark neutral ensuring maximum legibility across labels, coordinates, and layer trees.

## Typography

The type hierarchy balances **Manrope** for authoritative structural framing and **Inter** for dense UI inspection workflows. Numerical precision data (spatial transform vectors X/Y/Z, polygon counts, UV coordinates, bake latencies) defaults to a dedicated monospaced role to guarantee horizontal tabular alignment during continuous parameter scrubbing.

### Typographic Guidelines
- **Manrope** is reserved strictly for surface headers, modal banners, canvas titles, and primary panel categories.
- **Inter** handles all operational tools: context menus, properties, generation parameters, slider callouts, and field descriptions.
- Dynamic input scrubbers (e.g., `Scale [1.024]`, `Polycount [48,200]`) must explicitly apply tabular figures (`font-variant-numeric: tabular-nums`) or use the `mono-data` token.

## Layout & Spacing

The studio layout is anchored by a **3-Pane Studio Workbench**:
1. **Left Dock (Asset Ingestion & Generation):** Fixed width of 320px. Hosts image dropzones, sketch canvases, prompt engines, and preset libraries.
2. **Center Canvas (Spatial Viewport):** Flex-grow 3D engine canvas framed by fluid gutters, hosting contextual floating HUD overlays.
3. **Right Dock (Inspector & Toolchain):** Fixed width of 280px to 340px. Displays transform matrices, material nodes, topology decimation sliders, and export configurations.

### Responsive Behavior & Breakpoints
- **Desktop Wide (>= 1440px):** Simultaneous open left and right sidebars; persistent 3D canvas viewport.
- **Desktop Standard (1024px - 1439px):** Sidebars collapse into docked icon ribbons that slide out over the canvas upon focus.
- **Tablet / Small Display (< 1024px):** Single-column stacked mode. The 3D viewport anchors top/center, while toolchains adapt into bottom-sliding sheets with tabbed navigation.

## Elevation & Depth

Spatial separation relies on calibrated surface boundaries and ambient light distribution, preventing panels from blending into one another while avoiding intrusive, dirty shadows.

### Elevation Hierarchy

1. **Flat Canvas Surface (`level-0`):** 
   - Viewport interior (`#171B2D`) and background workbench (`#F5F6FA`). Zero shadow. Hairline separation via `1px solid #E2E8F0`.
2. **Docked Tool Panels (`level-1`):** 
   - Pure white panels (`#FFFFFF`) grounded with subtle structure: `box-shadow: 0 1px 3px 0 rgba(37, 42, 58, 0.04), 0 1px 2px -1px rgba(37, 42, 58, 0.04)`.
3. **Floating Viewport HUDs & Floating Action Bars (`level-2`):** 
   - Translucent dark shells over the 3D canvas (`rgba(23, 27, 45, 0.85)` with `backdrop-filter: blur(12px)`) or white cards over the tool bench: `box-shadow: 0 4px 12px -2px rgba(37, 42, 58, 0.08), 0 2px 6px -2px rgba(37, 42, 58, 0.05)`. Outer border: `1px solid rgba(255, 255, 255, 0.12)` (dark) or `1px solid #E2E8F0` (light).
4. **Context Menus, Flyouts & Modals (`level-3`):** 
   - Floating inspectors and generation progress modals: `box-shadow: 0 16px 32px -6px rgba(37, 42, 58, 0.12), 0 6px 12px -4px rgba(37, 42, 58, 0.06)`. Border: `1px solid #E2E8F0`.

## Shapes

The design system implements a refined **Level 2 (Rounded)** shape taxonomy, utilizing geometric radii spanning 10px to 14px to balance professional tool density with welcoming modern software aesthetics.

### Corner Radii Tokens
- **Standard Controls (`rounded`, 8px - 10px):** Inputs, select menus, icon buttons, color swatches, coordinate badges.
- **Cards & Sub-Panels (`rounded-lg`, 12px):** Nested generation cards, mesh preview tiles, prompt submission wells.
- **Primary Docked & Floating Panels (`rounded-xl`, 14px - 16px):** Viewport HUD containers, property panels, model generation staging cards.
- **Pill Formats (`rounded-full`):** Status indicators, camera view toggles (Top, Ortho, Perspective), and mesh mode switches (Wireframe, Shaded, Textured).

## Components

### Buttons
- **Primary Action ("Generate 3D", "Bake Textures"):** Solid `#6655E8` background, `#FFFFFF` text, 10px radius, height 40px, font weight 600. Hover: `#5544D8` with subtle transform micro-interaction. Active: `#4B3DC4`.
- **Secondary Tool Button:** Pure white background, `#252A3A` text, 1px border `#E2E8F0`. Hover: `#F5F6FA` surface with `#CBD5E1` border.
- **Viewport Canvas HUD Button:** Translucent `#171B2D` with 80% opacity, 1px border `rgba(255, 255, 255, 0.14)`, `#FFFFFF` icons. Hover: border `#6655E8`, background `rgba(102, 85, 232, 0.2)`.

### Input Fields & Vector Inputs
- **Text & Prompt Inputs:** White container, 1px border `#E2E8F0`, 10px radius, 36px height for inline tools, 44px for prompt generation. Focus: 1px border `#6655E8`, accompanied by an outer focus ring `box-shadow: 0 0 0 3px rgba(102, 85, 232, 0.15)`.
- **Vector Triad Scrubbers (X, Y, Z):** Compact 3-column input group with `mono-data` typography. Axis tag accents: Red (`#EF4444`) for X, Green (`#10B981`) for Y, and Blue (`#3B82F6`) for Z embedded directly in the left padding of the sub-fields.

### Chips & Badges
- **Status Chips:** Height 22px, pill-shaped radius (9999px), font size 11px, weight 600.
  - *Generating:* Background `rgba(102, 85, 232, 0.1)`, text `#6655E8`.
  - *Ready / High Poly:* Background `rgba(32, 184, 166, 0.12)`, text `#20B8A6`.
  - *Draft Mesh:* Background `#F1F5F9`, text `#64748B`.

### Cards & Model Preview Panels
- Surface: `#FFFFFF`, 12px radius, 1px border `#E2E8F0`. Internal padding: `space-md` (12px).
- Generative upload dropzones feature an inner dashed border (`1.5px dashed #CBD5E1`) over `#F8FAFC`, transitioning to solid `#6655E8` on drag-over.

### Specialized 3D Studio Components
- **Floating Viewport HUD:** Positioned 16px above the canvas bottom. Pill or 12px rounded capsule housing camera orbit resets, transform gizmo toggles (Translate/Rotate/Scale), and viewport shading selectors.
- **Topology & Generation Progress Dial:** Dual circular or linear track using `#E2E8F0` track background and `#20B8A6` / `#6655E8` dynamic fill indicator accompanied by real-time polycount metrics.
- **Layer & Mesh Outliner Tree:** Dense tree rows with height 28px, alternating hover state `#F8FAFC`, active item marked with `#6655E8` left border notch (2px width) and 8% purple tint surface background.
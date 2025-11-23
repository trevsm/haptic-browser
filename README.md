# Haptic Browser

A visual simulation of a tactile pin display device for web browsing by visually impaired users.

<img width="934" height="691" alt="image" src="https://github.com/user-attachments/assets/49a4548c-0489-4d28-a7d9-65d7f3033121" />


## Concept

The Haptic Browser simulates a flat tabletop device with a dense array of independently actuated vertical pins. The pin tops collectively form a continuously reconfigurable 3D relief surface. This surface can represent:

- **Web content**: Pages rendered as tactile geometry with Braille
- **UI elements**: Buttons, text blocks, and navigation as raised shapes
- **Data visualizations**: Charts, graphs, and maps as relief terrain
- **Pure geometry**: Waves, ripples, and patterns demonstrating the hardware

## Vision

This is a touch-first interface where users "read" geometry rather than pixels. The simulation emphasizes depth, structure, and tactile patterns over visual decoration. It establishes standards for tactile web iconography and spatial layout—similar to how visual web design has standards, but for touch.

## Physical Form (Simulated)

### Device Body
- **Shape**: Rectangular slab, like a thick tablet or shallow tray
- **Footprint**: 30–50 cm (desk object scale)
- **Thickness**: 3–6 cm solid base
- **Top border**: Shallow rim (5–10 mm) framing the active pin field

### Pin Field
- **Layout**: Uniform 2D grid covering most of the top surface
- **Pin geometry**: Small vertical columns (cylinders or square posts)
- **Pin spacing**: Regular and tight enough to read shapes
- **Height range**: 
  - Minimum: Flush with top plane (or slightly recessed)
  - Maximum: ~1–2 cm raised
  - Smooth interpolation between min and max

### Surface Representation
- The surface is defined by pin tops, not a continuous mesh
- From distance: pins average into visible terrain
- Up close: discrete pins are visible
- Default state: flat plane (baseline height)

## Core Behaviors

### Independent Actuation
- Every pin has its own height value
- Pins move vertically only (no tilting/lateral motion)
- Continuous motion with controllable rate

### Update Loop
- Interactive refresh rate with animated height transitions
- Heights driven by:
  - Mathematical fields (waves, bumps, noise)
  - Heightmaps (images as elevation)
  - Semantic layouts (UI elements as geometry)

### Height Constraints
- Pins clamp to [minHeight, maxHeight]
- Global amplitude multiplier for pattern scaling

### Physical Plausibility Modes
- **Ideal** (default): Free movement, no lag
- **Plausible** (optional): Easing, inertia, max speed per pin

## Display Modes

### 1. Pure Geometry / Terrain
- Traveling sine waves
- Ripples from touch points
- Gaussian hills/valleys
- Noise fields
- **Purpose**: Demonstrate resolution, smoothness, refresh speed

### 2. Data Visualization
- Bar charts as raised columns
- Line graphs as ridges
- Heatmaps as heightmaps
- Maps as terrain
- **Purpose**: Show data as tactile geometry

### 3. Interface / Web Layout
- Buttons: raised plateaus with sharp edges
- Text blocks: low ridges or patterned textures (Braille)
- Headings: taller ridges than body text
- Navigation: raised borders or edge textures
- Focus/selection: subtle local lift or pulse
- **Purpose**: Enable blind web browsing

## System Parameters

Configurable simulation controls:

- `gridSize`: Number of pins per side (resolution)
- `pinSpacing`: Distance between pin centers
- `pinWidth`: Pin cross-section size
- `minHeight`: Minimum pin height
- `maxHeight`: Maximum pin height
- `amplitude`: Global height scaling multiplier
- `responseSpeed`: Pin movement speed toward target
- `patternMode`: Wave, ripple, heightmap, UI layout, etc.
- `patternSpeed`: Time scaling for animated fields

## Data Model

- Pin field: 2D array `H[x, y]` of target heights
- Rendered height `h[x, y]` interpolates toward `H[x, y]` over time
- Future: Input events for touch/press at `[x, y]`

## Success Criteria

The simulation succeeds if:
- ✓ Clearly conveys a physical pin display object
- ✓ Pins form smooth, legible 3D shapes
- ✓ Can switch between terrain, data, and layout modes seamlessly
- ✓ Parameters visibly affect the experience
- ✓ Feels like something readable by touch (even viewed visually)

## Development Roadmap

### Current Phase: Baseline Simulation
- [x] Project setup
- [x] Basic Three.js scene with camera controls
- [x] Pin field geometry system
- [x] Parameter controls UI
- [x] Terrain/wave patterns
- [x] Lighting for relief emphasis

### Near-Term Expansion
- [ ] Press interaction and ripples
- [ ] Cursor/focus indicator
- [x] Tactile UI primitives library (button, card, text block, slider)
- [ ] HTML → tactile geometry pipeline
- [x] Braille text rendering

### Future Vision
- [ ] Real webpage rendering as tactile layouts
- [ ] Screen reader integration
- [ ] Tactile iconography standards
- [ ] Multi-user collaboration features

## Tech Stack

- **Three.js**: 3D rendering
- **TypeScript**: Type safety
- **Vite**: Fast development

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` to see the simulation.

## Visual Design

- **Materials**: Neutral matte materials for clear shape reading
- **Lighting**: Strong angled key light + soft ambient fill
- **Colors**: Dark gray base, lighter gray pins (color for clarity, not meaning)
- **Focus**: Shadows and relief for depth perception

---

**Note**: This is a visual simulation proxy for an eventual physical device. The interface prioritizes geometry and tactile structure over visual decoration.


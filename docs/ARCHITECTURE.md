# PathVerse Architecture

PathVerse is organized as a premium AI growth platform layered on top of the existing GPU navigation engine.

```text
Next.js App Router
  app/
    page.tsx                 Product cockpit
    ops/page.tsx             PixiJS/WebGL simulation console
    api/ai/*                 AI mentor and roadmap APIs
    api/resume/analyze       Resume intelligence API

Product layer
  components/platform        Premium SaaS UI and 3D visualization
  components/ui              Shadcn-style reusable primitives
  src/store                  Zustand product state
  src/services               Deterministic AI intelligence services
  src/types                  Strict product contracts

Engine layer
  src/engine/core            Grid, heap, queue, shared contracts
  src/engine/algorithms      A*, Dijkstra, BFS, DFS, Greedy, Bidirectional
  src/engine/rendering       PixiJS/WebGL renderer and GPU effects
  src/engine/telemetry       Runtime instrumentation
  src/engine/ai              Learning, memory, swarm, thought streams
  src/engine/civilization    Emergent world simulation

Persistence layer
  prisma/schema.prisma       PostgreSQL model for users, profiles, skills, roadmaps
```

The product UI never places React in the PixiJS render loop. GPU and animation loops are owned by PixiJS or Three.js systems, while React owns declarative product state and controls.

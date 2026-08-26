# SpecialEdge for Vue Flow

This project demonstrates a custom edge type for Vue Flow that renders an orthogonal, Manhattan-style route instead of a direct diagonal connector.

The goal is simple: keep edges readable, predictable, and easy to manipulate in a node-based graph editor. Orthogonal edges are especially useful when you want a diagram to feel structured and technical, such as flowcharts, network layouts, or process diagrams.

## Why this approach?

### 1. A more readable graph layout

Straight diagonal edges can feel visually noisy in dense diagrams. Orthogonal edges prefer horizontal and vertical segments, which creates cleaner routing and makes the graph easier to scan.

### 2. Better control for user editing

This implementation supports both:

- dragging a waypoint to reshape the path
- dragging a segment midpoint to move an entire orthogonal segment

That gives the user direct visual control over the route without requiring a fully custom graph layout engine.

### 3. Route recomputation after node movement

When a connected node moves, the project triggers a normalization pass to recompute the route and keep the edge aligned with the user’s graph layout. This is handled by updating a revision flag in the edge data, which is then picked up by the custom composable.

### 4. Geometry-first design

The code separates the concerns logically:

- the router decides the path
- the composable handles interaction state and preview updates
- the geometry helpers simplify and snap values so the route remains stable and neat

This makes the behavior easier to reason about and easier to extend later.

## Core idea

The custom edge is built around the idea of a route made of axis-aligned segments:

- source and target are connected by a path made of horizontal and vertical segments
- optional waypoints create bends in the route
- obstacles are avoided by routing through a grid-like search space
- the result is simplified to remove unnecessary or duplicate points

This is intentionally not a general-purpose routing solver. It is tuned for a small, interactive editor where the user can adjust the path visually.

## Main files and what they do

### src/components/SpecialEdge.vue

This is the visual edge component. It renders the SVG path and the interactive handles used to drag waypoints and segments.

Responsibilities:

- draws the routed path
- shows the edge label
- renders waypoint handles
- renders midpoint handles for segment dragging
- delegates interaction logic to the composable

### src/composables/useSpecialEdge.ts

This is the orchestration layer for the edge. It connects the edge state to the Vue Flow graph and manages the live user interactions.

Responsibilities:

- computes the source and target points
- builds a routed path from the current waypoints
- tracks segment dragging and waypoint dragging
- previews drag movement before committing
- normalizes and saves updated waypoints back to edge data
- keeps the edge path in sync with node movement

This is the file that turns a static route into a live editing experience.

### src/router/orthogonalRouter.ts

This file calculates the actual orthogonal path. It uses a grid-based routing approach with Manhattan-style movement.

Responsibilities:

- inflate obstacles with a clearance value
- build a coordinate grid for route search
- search for a valid path between source and target
- prefer certain directions on turns to keep routes predictable
- simplify the final path before returning it

This is the route-planning layer of the solution.

### src/services/specialEdgeGeometry.ts

This module provides the geometric utilities used by the edge and router. It is the low-level helper layer.

Responsibilities:

- simplify polylines by removing duplicate and collinear points
- snap dragged coordinates to nearby alignment values
- detect segment orientation
- calculate midpoint and label placement
- move a segment while keeping the rest of the route stable
- provide utilities for point comparison and Manhattan distance

This file keeps the route clean and visually stable while the user drags.

### src/interface/OrthogonalRouter.ts

This file defines the route and edge data types used across the project.

It includes:

- point coordinates
- obstacle geometry
- route options
- orthogonal edge data payloads
- grid path search state types

### src/interface/SpecialEdge.ts

This file defines drag-related state structures used by the composable.

It covers:

- segment drag state
- waypoint drag state
- handle metadata for midpoint editing

### src/App.vue

This is an example application showing how the custom edge is mounted in a Vue Flow graph.

It demonstrates:

- a graph with special edges
- node drag updates that trigger route normalization
- custom edge registration using the edge type

### src/**tests**/specialEdgeGeometry.spec.ts

This test file verifies the label placement logic and edge geometry behavior.

It focuses on the rule that labels are placed relative to the longest segment in the path, which helps keep labels readable and aligned.

## Data flow in practice

The user experience is roughly:

1. A custom edge is rendered with a type such as special.
2. The composable computes a route from source, target, and any saved waypoints.
3. The router finds a valid orthogonal path while avoiding clearances around obstacles.
4. Geometry helpers simplify the path and keep it aligned.
5. The user can drag a waypoint or segment midpoint.
6. Drag gestures are previewed, snapped, and then committed back to edge data.
7. The route is recalculated and redisplayed in the graph.

This keeps the route responsive without needing a heavy external layout engine.

## Important implementation notes

### Clearance

The route uses a clearance value to create a buffer around obstacles. This helps prevent edges from moving too tightly against diagram elements.

### Waypoints

Waypoints are not just visual markers; they are the main editable inputs for the custom edge route. They define where the orthogonal path bends.

### Segment simplification

A lot of route generation can create redundant points. The geometry helpers remove duplicate points and collapse collinear segments so the resulting path stays clean and easy to drag.

### Label positioning

Labels are not placed at the midpoint of the entire route. Instead, the graph picks the longest segment and places the label near it, which keeps the label readable and visually attached to the strongest part of the route.

## Run locally

Install dependencies:

npm install

Start the development app:

npm run dev

Run unit tests:

npm run test:unit

Build the project:

npm run build

Lint the project:

npm run lint

## Summary

This SpecialEdge is a custom, interaction-focused orthogonal edge system for Vue Flow. It blends route planning, direct manipulation, and geometry utilities into a compact structure that produces cleaner graph routing and a more controlled editing experience.

The design is intentionally layered so each part has a clear responsibility:

- route planning decides where the edge should go
- interaction logic decides how the user edits it
- geometry utilities keep the result stable and presentation-friendly

That separation is the main reason the implementation is easy to understand and extend.

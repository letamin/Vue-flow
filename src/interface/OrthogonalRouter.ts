export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OrthogonalRouteOptions {
  source: Point;
  target: Point;
  obstacles?: Obstacle[];
  waypoints?: Point[];
  clearance?: number;
  turnPenalty?: number;
}

export interface OrthogonalEdgeData {
  waypoints?: Point[];
  clearance?: number;
  normalizeRevision?: number;
}

export interface GridPoint extends Point {
  key: string;
}

export interface SearchState {
  point: GridPoint;
  direction: 'horizontal' | 'vertical' | null;
  cost: number;
  estimate: number;
  path: GridPoint[];
}

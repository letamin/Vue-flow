export interface Point {
  x: number;
  y: number;
}

export interface OrthogonalEdgeData {
  waypoints?: Point[];
  clearance?: number;
  normalizeRevision?: number;
  handles?: Point[];
}

export interface SegmentDragState {
  segmentIndex: number;
  originalRoute: Point[];
  currentCoordinate: number;
  moveAxis: 'x' | 'y';
  pointerStart: Point;
  hasMoved: boolean;
}

export interface DraggingHandle {
  index: number;
  point: Point;
}

export interface PathLocation {
  point: Point;
  distance: number;
}

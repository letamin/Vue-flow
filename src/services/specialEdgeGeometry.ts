// Shared geometry helpers for orthogonal edges: they simplify polylines, snap drag movement,
// and compute labels and path points used by the edge UI.
import type { Point } from '../interface/OrthogonalRouter';
import type { SegmentDragState } from '../interface/SpecialEdge';

export const ALIGNMENT_TOLERANCE = 6;
export const DRAG_THRESHOLD = 3;
export const POINT_EPSILON = 0.5;

export const nearlyEqual = (first: number, second: number, tolerance = POINT_EPSILON): boolean => {
  return Math.abs(first - second) <= tolerance;
};

export const samePoint = (first: Point, second: Point): boolean => {
  return nearlyEqual(first.x, second.x) && nearlyEqual(first.y, second.y);
};

export const samePointList = (first: Point[], second: Point[]): boolean => {
  return first.length === second.length && first.every((point, index) => second[index] !== undefined && samePoint(point, second[index]!));
};

export const manhattanDistance = (first: Point, second: Point): number => {
  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
};

export const segmentOrientation = (start: Point, end: Point): 'horizontal' | 'vertical' => {
  return nearlyEqual(start.y, end.y) ? 'horizontal' : 'vertical';
};

export const clonePoints = (points: Point[]): Point[] => {
  return points.map(({ x, y }) => ({ x, y }));
};

export const simplifyPolyline = (points: Point[]): Point[] => {
  const result: Point[] = [];

  for (const inputPoint of points) {
    const point = { x: inputPoint.x, y: inputPoint.y };
    const previous = result[result.length - 1];
    if (previous && samePoint(previous, point)) {
      continue;
    }

    result.push(point);

    while (result.length >= 3) {
      const first = result[result.length - 3];
      const middle = result[result.length - 2];
      const last = result[result.length - 1];
      if (!first || !middle || !last) {
        break;
      }

      const sameVerticalLine = nearlyEqual(first.x, middle.x) && nearlyEqual(middle.x, last.x);
      const sameHorizontalLine = nearlyEqual(first.y, middle.y) && nearlyEqual(middle.y, last.y);
      if (!sameVerticalLine && !sameHorizontalLine) {
        break;
      }

      result.splice(result.length - 2, 1);
    }
  }

  return result;
};

export const moveSegment = (route: Point[], segmentIndex: number, moveAxis: 'x' | 'y', coordinate: number): Point[] => {
  const start = route[segmentIndex];
  const end = route[segmentIndex + 1];
  if (!start || !end) {
    return route;
  }

  const movedStart = { ...start, [moveAxis]: coordinate };
  const movedEnd = { ...end, [moveAxis]: coordinate };

  return simplifyPolyline([...route.slice(0, segmentIndex + 1), movedStart, movedEnd, ...route.slice(segmentIndex + 1)]);
};

export const snapSegmentCoordinate = (coordinate: number, state: SegmentDragState): number => {
  let closestCoordinate = coordinate;
  let closestDistance = ALIGNMENT_TOLERANCE + 1;

  for (let index = 0; index < state.originalRoute.length - 1; index += 1) {
    if (index === state.segmentIndex) {
      continue;
    }

    const start = state.originalRoute[index];
    const end = state.originalRoute[index + 1];
    if (!start || !end) {
      continue;
    }

    const isParallel = state.moveAxis === 'y' ? nearlyEqual(start.y, end.y) : nearlyEqual(start.x, end.x);
    if (!isParallel) {
      continue;
    }

    const candidateCoordinate = start[state.moveAxis];
    const candidateDistance = Math.abs(coordinate - candidateCoordinate);
    if (candidateDistance < closestDistance) {
      closestDistance = candidateDistance;
      closestCoordinate = candidateCoordinate;
    }
  }

  return closestCoordinate;
};

export const snapWaypoint = (pointer: Point, waypointIndex: number, waypoints: Point[], source: Point, target: Point): Point => {
  const previous = waypointIndex === 0 ? source : waypoints[waypointIndex - 1];
  const next = waypointIndex === waypoints.length - 1 ? target : waypoints[waypointIndex + 1];
  const candidates = [previous, next].filter((point): point is Point => point !== undefined);
  let x = pointer.x;
  let y = pointer.y;
  let closestXDistance = ALIGNMENT_TOLERANCE + 1;
  let closestYDistance = ALIGNMENT_TOLERANCE + 1;

  for (const candidate of candidates) {
    const xDistance = Math.abs(pointer.x - candidate.x);
    const yDistance = Math.abs(pointer.y - candidate.y);
    if (xDistance < closestXDistance) {
      closestXDistance = xDistance;
      x = candidate.x;
    }
    if (yDistance < closestYDistance) {
      closestYDistance = yDistance;
      y = candidate.y;
    }
  }

  return { x, y };
};

export const pointAtPathProgress = (path: Point[], normalizedProgress: number): Point => {
  if (!path.length) {
    return { x: 0, y: 0 };
  }

  const totalLength = path.reduce((total, point, index) => {
    const previous = path[index - 1];
    return previous ? total + manhattanDistance(previous, point) : total;
  }, 0);
  let remaining = totalLength * normalizedProgress;

  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    if (!start || !end) {
      continue;
    }

    const segmentLength = manhattanDistance(start, end);
    if (remaining <= segmentLength) {
      const ratio = segmentLength > 0 ? remaining / segmentLength : 0;

      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    remaining -= segmentLength;
  }

  return path[path.length - 1] ?? { x: 0, y: 0 };
};

export const labelSegmentOrientation = (path: Point[]): 'horizontal' | 'vertical' => {
  let longestSegment: { start: Point; end: Point; length: number } | undefined;

  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    if (!start || !end) {
      continue;
    }

    const length = manhattanDistance(start, end);
    if (length > (longestSegment?.length ?? 0)) {
      longestSegment = { start, end, length };
    }
  }

  return longestSegment ? segmentOrientation(longestSegment.start, longestSegment.end) : 'horizontal';
};

export const pointForLabel = (path: Point[], offset = 18): Point => {
  let longestSegment: { start: Point; end: Point; length: number } | undefined;

  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    if (!start || !end) {
      continue;
    }

    const length = manhattanDistance(start, end);
    if (length > (longestSegment?.length ?? 0)) {
      longestSegment = { start, end, length };
    }
  }

  if (!longestSegment) {
    return path[0] ?? { x: 0, y: 0 };
  }

  const { start, end } = longestSegment;
  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return segmentOrientation(start, end) === 'horizontal'
    ? { x: midpoint.x, y: midpoint.y - offset }
    : { x: midpoint.x + offset, y: midpoint.y };
};

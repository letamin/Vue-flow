// Generates a Manhattan-style orthogonal path between two points while avoiding obstacles
// and respecting optional waypoint turns used by the custom edge behavior.
import type { Point, Obstacle, GridPoint, SearchState, OrthogonalRouteOptions } from '../interface/OrthogonalRouter';

const pointKey = ({ x, y }: Point) => `${x}:${y}`;

const samePoint = (first: Point, second: Point) => {
  return first.x === second.x && first.y === second.y;
};

const isInside = (point: Point, obstacle: Obstacle) => {
  return point.x > obstacle.x && point.x < obstacle.x + obstacle.width && point.y > obstacle.y && point.y < obstacle.y + obstacle.height;
};

const segmentIntersectsRect = (first: Point, second: Point, obstacle: Obstacle) => {
  if (first.x === second.x) {
    if (first.x <= obstacle.x || first.x >= obstacle.x + obstacle.width) {
      return false;
    }

    const segmentTop = Math.min(first.y, second.y);
    const segmentBottom = Math.max(first.y, second.y);
    return segmentBottom > obstacle.y && segmentTop < obstacle.y + obstacle.height;
  }

  if (first.y === second.y) {
    if (first.y <= obstacle.y || first.y >= obstacle.y + obstacle.height) {
      return false;
    }

    const segmentLeft = Math.min(first.x, second.x);
    const segmentRight = Math.max(first.x, second.x);
    return segmentRight > obstacle.x && segmentLeft < obstacle.x + obstacle.width;
  }

  return false;
};

const isClear = (first: Point, second: Point, obstacles: Obstacle[]) =>
  !obstacles.some((obstacle) => isInside(first, obstacle) || isInside(second, obstacle) || segmentIntersectsRect(first, second, obstacle));

const distance = (first: Point, second: Point) => Math.abs(first.x - second.x) + Math.abs(first.y - second.y);

const directionBetween = (first: Point, second: Point): 'horizontal' | 'vertical' => {
  return first.x === second.x ? 'vertical' : 'horizontal';
};

const addPoint = (points: Map<string, GridPoint>, point: Point) => {
  const key = pointKey(point);
  if (!points.has(key)) {
    points.set(key, { ...point, key });
  }
};

const simplifyPath = (points: Point[]) => {
  const simplified: Point[] = [];

  for (const point of points) {
    const previous = simplified[simplified.length - 1];
    const beforePrevious = simplified[simplified.length - 2];

    if (previous && samePoint(previous, point)) {
      continue;
    }

    if (
      beforePrevious &&
      previous &&
      ((beforePrevious.x === previous.x && previous.x === point.x && (previous.y - beforePrevious.y) * (point.y - previous.y) >= 0) ||
        (beforePrevious.y === previous.y && previous.y === point.y && (previous.x - beforePrevious.x) * (point.x - previous.x) >= 0))
    ) {
      simplified[simplified.length - 1] = point;
    } else {
      simplified.push(point);
    }
  }

  return simplified;
};

export const mergeCollinearPoints = (points: Point[]) => {
  if (points.length < 2) {
    return points;
  }

  const merged: Point[] = [];
  let runStart = points[0];
  let runEnd = points[0];
  let runDirection: 'horizontal' | 'vertical' | undefined;
  let runSign: -1 | 1 | undefined;

  const finishRun = () => {
    if (runStart && runEnd) {
      merged.push(
        runStart === runEnd
          ? runStart
          : {
              x: (runStart.x + runEnd.x) / 2,
              y: (runStart.y + runEnd.y) / 2,
            },
      );
    }
  };

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (!start || !end) {
      continue;
    }

    const direction = start.x === end.x ? 'vertical' : start.y === end.y ? 'horizontal' : undefined;
    if (!direction) {
      finishRun();
      runStart = end;
      runEnd = end;
      runDirection = undefined;
      runSign = undefined;
      continue;
    }

    const sign = (direction === 'horizontal' ? end.x - start.x : end.y - start.y) < 0 ? -1 : 1;

    if (runDirection === undefined) {
      if (runStart !== start) {
        finishRun();
        runStart = start;
      }
      runDirection = direction;
      runSign = sign;
    }

    if (direction !== runDirection || sign !== runSign) {
      finishRun();
      runStart = start;
      runDirection = direction;
      runSign = sign;
    }
    runEnd = end;
  }

  finishRun();

  return merged;
};

const routeBetween = (
  source: Point,
  target: Point,
  obstacles: Obstacle[],
  turnPenalty: number,
  preferredFirstDirection?: 'horizontal' | 'vertical',
): Point[] => {
  if (samePoint(source, target)) {
    return [source];
  }

  const xCoordinates = new Set([source.x, target.x]);
  const yCoordinates = new Set([source.y, target.y]);

  for (const obstacle of obstacles) {
    xCoordinates.add(obstacle.x);
    xCoordinates.add(obstacle.x + obstacle.width);
    yCoordinates.add(obstacle.y);
    yCoordinates.add(obstacle.y + obstacle.height);
  }

  const grid = new Map<string, GridPoint>();
  for (const x of xCoordinates) {
    for (const y of yCoordinates) {
      addPoint(grid, { x, y });
    }
  }

  const neighbors = new Map<string, GridPoint[]>();
  for (const point of grid.values()) {
    neighbors.set(point.key, []);
  }

  for (const point of grid.values()) {
    for (const candidate of grid.values()) {
      if (point.key === candidate.key) {
        continue;
      }
      if (point.x !== candidate.x && point.y !== candidate.y) {
        continue;
      }
      if (!isClear(point, candidate, obstacles)) {
        continue;
      }

      const points = neighbors.get(point.key);
      if (points) {
        points.push(candidate);
      }
    }
  }

  const start = grid.get(pointKey(source));
  const end = grid.get(pointKey(target));
  if (!start || !end) {
    return [source, target];
  }

  const open: SearchState[] = [{ point: start, direction: null, cost: 0, estimate: distance(source, target), path: [start] }];
  const bestCosts = new Map<string, number>();

  while (open.length) {
    open.sort((first, second) => first.estimate - second.estimate);
    const current = open.shift()!;

    if (current.point.key === end.key) {
      return current.path;
    }

    const stateKey = `${current.point.key}:${current.direction ?? 'none'}`;
    if ((bestCosts.get(stateKey) ?? Infinity) < current.cost) {
      continue;
    }
    bestCosts.set(stateKey, current.cost);

    const nextNeighbors = [...(neighbors.get(current.point.key) ?? [])].sort((first, second) => {
      if (current.direction || !preferredFirstDirection) {
        return 0;
      }

      const firstDirection = directionBetween(current.point, first);
      const secondDirection = directionBetween(current.point, second);
      return Number(secondDirection === preferredFirstDirection) - Number(firstDirection === preferredFirstDirection);
    });

    for (const neighbor of nextNeighbors) {
      const direction = directionBetween(current.point, neighbor);
      const nextCost =
        current.cost + distance(current.point, neighbor) + (current.direction && current.direction !== direction ? turnPenalty : 0);
      const neighborKey = `${neighbor.key}:${direction}`;

      if (nextCost >= (bestCosts.get(neighborKey) ?? Infinity)) {
        continue;
      }

      open.push({
        point: neighbor,
        direction,
        cost: nextCost,
        estimate: nextCost + distance(neighbor, target),
        path: [...current.path, neighbor],
      });
    }
  }

  return [source, target];
};

export const routeOrthogonal = ({
  source,
  target,
  obstacles = [],
  waypoints = [],
  clearance = 20,
  turnPenalty = 50,
}: OrthogonalRouteOptions): Point[] => {
  const inflatedObstacles = obstacles.map((obstacle) => ({
    x: obstacle.x - clearance,
    y: obstacle.y - clearance,
    width: obstacle.width + clearance * 2,
    height: obstacle.height + clearance * 2,
  }));
  const routePoints = [source, ...waypoints, target];
  const segments = routePoints.slice(0, -1).map((point, index) => {
    const nextPoint = routePoints[index + 1];
    if (!nextPoint) {
      return [];
    }

    const isFirstSegment = index === 0;
    const isLastSegment = index === routePoints.length - 2;
    const preferredFirstDirection =
      point.x !== nextPoint.x && point.y !== nextPoint.y
        ? isFirstSegment
          ? 'vertical'
          : isLastSegment
            ? 'horizontal'
            : undefined
        : undefined;

    return routeBetween(point, nextPoint, inflatedObstacles, turnPenalty, preferredFirstDirection);
  });

  const simplifiedSegments = segments.map(simplifyPath);
  const route = simplifiedSegments.flatMap((segment, index) => (index ? segment.slice(1) : segment));

  return simplifyPath(route);
};

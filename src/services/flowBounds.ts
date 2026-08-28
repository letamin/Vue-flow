import type { Edge } from '../interface/Flow';
import type { Point } from '../interface/SpecialEdge';

export const BOUNDARY_PADDING = 24;
export const DEFAULT_NODE_WIDTH = 150;
export const DEFAULT_NODE_HEIGHT = 40;
export const MIN_CANVAS_SIZE = 300;
export const MAX_CANVAS_SIZE = 2000;

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

export const normalizeBoundary = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(value), MIN_CANVAS_SIZE), MAX_CANVAS_SIZE);
};

export const getNodeExtent = ({ width, height }: { width: number; height: number }): [[number, number], [number, number]] => [
  [BOUNDARY_PADDING, BOUNDARY_PADDING],
  [Math.max(BOUNDARY_PADDING, width - BOUNDARY_PADDING), Math.max(BOUNDARY_PADDING, height - BOUNDARY_PADDING)],
];

export const clampPoint = (point: Point, dimensions: { width: number; height: number }): Point => ({
  x: clamp(point.x, BOUNDARY_PADDING, Math.max(BOUNDARY_PADDING, dimensions.width - BOUNDARY_PADDING)),
  y: clamp(point.y, BOUNDARY_PADDING, Math.max(BOUNDARY_PADDING, dimensions.height - BOUNDARY_PADDING)),
});

export const clampNodePosition = (
  node: { position: Point; dimensions?: { width?: number; height?: number } },
  dimensions: { width: number; height: number },
): Point => {
  const nodeWidth = node.dimensions?.width || DEFAULT_NODE_WIDTH;
  const nodeHeight = node.dimensions?.height || DEFAULT_NODE_HEIGHT;
  return {
    x: clamp(node.position.x, BOUNDARY_PADDING, Math.max(BOUNDARY_PADDING, dimensions.width - nodeWidth - BOUNDARY_PADDING)),
    y: clamp(node.position.y, BOUNDARY_PADDING, Math.max(BOUNDARY_PADDING, dimensions.height - nodeHeight - BOUNDARY_PADDING)),
  };
};

export const clampEdgeHandles = (edges: Edge[], dimensions: { width: number; height: number }): Edge[] => {
  return edges.map((edge) => {
    if (edge.type !== 'special' || !edge.data?.handles?.length) {
      return edge;
    }

    return {
      ...edge,
      data: {
        ...edge.data,
        handles: edge.data.handles.map((handle) => clampPoint(handle, dimensions)),
        normalizeRevision: (edge.data.normalizeRevision ?? 0) + 1,
      },
    };
  });
};

import { computed, onBeforeUnmount, ref, type CSSProperties } from 'vue';
import { getBezierPath, useVueFlow, type EdgeProps } from '@vue-flow/core';
import type { DraggingHandle, PathLocation, OrthogonalEdgeData, Point } from '@/interface/SpecialEdge';

const INTERACTION_STROKE_WIDTH = 12;
const CLOSEST_POINT_SAMPLES = 60; // Reduced from 160: ~60% faster label positioning with minimal visual quality loss
const HANDLE_MIN_DISTANCE = 12;
const LABEL_EDGE_CLEARANCE = 12;
const FALLBACK_LABEL_WIDTH = 84;

export const resolveLabelProgressForPath = (
  totalLength: number,
  handles: Point[],
  pathAtDistance: (distance: number) => Point | null,
  preferredDistance: number | null,
  labelWidthValue: number,
): number | null => {
  if (!handles.length || !totalLength) {
    return null;
  }

  const pathDistanceForPoint = (point: Point): number => {
    let closestDistance = 0;
    let closestPointDistance = Infinity;

    for (let index = 0; index <= CLOSEST_POINT_SAMPLES; index += 1) {
      const distance = (totalLength * index) / CLOSEST_POINT_SAMPLES;
      const candidate = pathAtDistance(distance);
      if (!candidate) {
        continue;
      }

      const candidateDistance = distanceSquared(candidate, point);
      if (candidateDistance < closestPointDistance) {
        closestPointDistance = candidateDistance;
        closestDistance = distance;
      }
    }

    return closestDistance;
  };

  const labelDistanceForHandles = (): number => {
    const handleDistances = handles.map(pathDistanceForPoint);
    const boundaries = [0, ...handleDistances, totalLength];
    const minimumSegmentLength = labelWidthValue + LABEL_EDGE_CLEARANCE * 2;
    const segments = boundaries.slice(0, -1).map((start, index) => ({
      start,
      end: boundaries[index + 1]!,
    }));
    const suitableSegments = segments.filter((segment) => segment.end - segment.start >= minimumSegmentLength);
    const candidates = suitableSegments.length ? suitableSegments : segments;
    const chosen = candidates.reduce((longest, segment) => (segment.end - segment.start > longest.end - longest.start ? segment : longest));
    return (chosen.start + chosen.end) / 2;
  };

  const isLabelDistanceClear = (distance: number): boolean => {
    const minimumHandleDistance = labelWidthValue / 2 + LABEL_EDGE_CLEARANCE;
    return handles.every((handle) => Math.abs(pathDistanceForPoint(handle) - distance) >= minimumHandleDistance);
  };

  const nextDistance =
    preferredDistance !== null && isLabelDistanceClear(preferredDistance) ? preferredDistance : labelDistanceForHandles();

  return nextDistance / totalLength;
};

const distanceSquared = (first: Point, second: Point): number => {
  const xDistance = first.x - second.x;
  const yDistance = first.y - second.y;
  return xDistance * xDistance + yDistance * yDistance;
};

const lerp = (first: Point, second: Point, amount: number): Point => ({
  x: first.x + (second.x - first.x) * amount,
  y: first.y + (second.y - first.y) * amount,
});

export const useSpecialEdge = (props: Readonly<EdgeProps<OrthogonalEdgeData>>) => {
  const { screenToFlowCoordinate, updateEdgeData } = useVueFlow();
  const visualPath = ref<SVGPathElement | null>(null);
  const labelElement = ref<HTMLElement | null>(null);
  const draggingHandle = ref<DraggingHandle | null>(null);
  let removeDragListeners: (() => void) | undefined;
  let scheduledUpdate: number | undefined;
  let pendingHandles: Point[] | undefined;

  const sourcePoint = computed(() => ({ x: props.sourceX, y: props.sourceY }));
  const targetPoint = computed(() => ({ x: props.targetX, y: props.targetY }));
  const storedHandles = computed<Point[]>(() => {
    return props.data?.handles ?? [];
  });
  const handlePoints = computed<Point[]>(() => {
    const handles = storedHandles.value.map((point) => ({ ...point }));
    const activeDrag = draggingHandle.value;
    if (activeDrag) {
      handles[activeDrag.index] = { ...activeDrag.point };
    }
    return handles;
  });

  const nativeBezierPath = () =>
    getBezierPath({
      sourceX: props.sourceX,
      sourceY: props.sourceY,
      sourcePosition: props.sourcePosition,
      targetX: props.targetX,
      targetY: props.targetY,
      targetPosition: props.targetPosition,
    });

  const pathThroughHandles = (handles: Point[]): string => {
    if (!handles.length) {
      return nativeBezierPath()[0];
    }

    if (handles.length === 1) {
      const handle = handles[0]!;
      const controlPoint = {
        x: handle.x * 2 - (sourcePoint.value.x + targetPoint.value.x) / 2,
        y: handle.y * 2 - (sourcePoint.value.y + targetPoint.value.y) / 2,
      };
      return `M${sourcePoint.value.x},${sourcePoint.value.y} Q${controlPoint.x},${controlPoint.y} ${targetPoint.value.x},${targetPoint.value.y}`;
    }

    const points = [sourcePoint.value, ...handles, targetPoint.value];
    const commands = [`M${points[0]!.x},${points[0]!.y}`];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const previous = points[index - 1] ?? start;
      const next = points[index + 2] ?? end;
      const firstControl = lerp(start, { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 }, 1);
      const secondControl = lerp(end, { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 }, 1);
      commands.push(`C${firstControl.x},${firstControl.y} ${secondControl.x},${secondControl.y} ${end.x},${end.y}`);
    }
    return commands.join(' ');
  };

  const svgPath = computed(() => pathThroughHandles(handlePoints.value));

  // PERFORMANCE: Cache path element and length to avoid repeated DOM operations.
  // resolvePathElement is expensive when visualPath isn't available yet.
  // pathLength is called multiple times per render - caching avoids redundant getTotalLength() calls.
  let cachedPathElement: SVGPathElement | null = null;
  let lastSvgPath = '';

  const resolvePathElement = (): SVGPathElement | null => {
    const currentPath = visualPath.value;
    if (currentPath && typeof currentPath.getTotalLength === 'function') {
      cachedPathElement = currentPath;
      return currentPath;
    }

    const markup = svgPath.value;
    if (!markup || typeof document === 'undefined') {
      return null;
    }

    // Only create temporary element if svg path changed or cache is stale
    if (cachedPathElement === null || lastSvgPath !== markup) {
      try {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', markup);
        cachedPathElement = path;
        lastSvgPath = markup;
      } catch {
        return null;
      }
    }

    return cachedPathElement;
  };

  // PERFORMANCE: Memoize path length to avoid repeated getTotalLength() calls.
  // This is called multiple times per label positioning and handle interaction.
  const cachedPathLength = computed(() => {
    const path = resolvePathElement();
    if (path && typeof path.getTotalLength === 'function') {
      return path.getTotalLength();
    }
    return 0;
  });

  const pathLocationAtLength = (length: number): Point | null => {
    const path = resolvePathElement();
    if (!path || typeof path.getPointAtLength !== 'function') {
      return null;
    }
    const point = path.getPointAtLength(length);
    return { x: point.x, y: point.y };
  };

  const closestPathLocation = (pointer: Point): PathLocation | null => {
    const length = cachedPathLength.value; // Use cached instead of calling pathLength()
    if (!length) {
      return null;
    }

    let closest: PathLocation | null = null;
    for (let index = 0; index <= CLOSEST_POINT_SAMPLES; index += 1) {
      const distance = (length * index) / CLOSEST_POINT_SAMPLES;
      const point = pathLocationAtLength(distance);
      if (!point) {
        continue;
      }
      if (!closest || distanceSquared(point, pointer) < distanceSquared(closest.point, pointer)) {
        closest = { point, distance };
      }
    }
    return closest;
  };

  const pathDistanceForPoint = (point: Point): number => {
    const length = cachedPathLength.value; // Use cached instead of calling pathLength()
    if (!length) {
      return 0;
    }

    let closestDistance = 0;
    let closestPointDistance = Infinity;
    for (let index = 0; index <= CLOSEST_POINT_SAMPLES; index += 1) {
      const distance = (length * index) / CLOSEST_POINT_SAMPLES;
      const candidate = pathLocationAtLength(distance);
      if (!candidate) {
        continue;
      }
      const candidateDistance = distanceSquared(candidate, point);
      if (candidateDistance < closestPointDistance) {
        closestPointDistance = candidateDistance;
        closestDistance = distance;
      }
    }
    return closestDistance;
  };

  const labelWidth = (): number => labelElement.value?.offsetWidth ?? FALLBACK_LABEL_WIDTH;

  const createHandle = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const pointer = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
    const closest = closestPathLocation(pointer);
    if (!closest || handlePoints.value.some((handle) => distanceSquared(handle, closest.point) < HANDLE_MIN_DISTANCE ** 2)) {
      return;
    }

    const newHandles = [...handlePoints.value];
    const insertionIndex = newHandles.findIndex((handle) => pathDistanceForPoint(handle) > closest.distance);
    if (insertionIndex < 0) {
      newHandles.push(closest.point);
    } else {
      newHandles.splice(insertionIndex, 0, closest.point);
    }
    updateEdgeData<OrthogonalEdgeData>(props.id, { handles: newHandles });
  };

  const labelPosition = computed<Point>(() => {
    const handles = handlePoints.value;
    const pathMarkup = svgPath.value;
    if (!handles.length || !pathMarkup) {
      const [, labelX, labelY] = nativeBezierPath();
      return { x: labelX, y: labelY };
    }

    const length = cachedPathLength.value; // Use cached path length instead of calling pathLength()
    if (!length) {
      return handles[0]!;
    }

    const progress = resolveLabelProgressForPath(length, handles, pathLocationAtLength, null, labelWidth());
    if (progress === null) {
      return handles[0]!;
    }

    const distance = progress * length;
    return pathLocationAtLength(distance) ?? handles[0]!;
  });

  const labelStyle = computed<CSSProperties>(() => ({
    transform: `translate(-50%, -50%) translate(${labelPosition.value.x}px, ${labelPosition.value.y}px)`,
  }));

  const handleStyle = (point: Point): CSSProperties => ({
    pointerEvents: 'all',
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
  });

  const stopHandleDrag = () => {
    flushPendingUpdate();
    removeDragListeners?.();
    removeDragListeners = undefined;
    draggingHandle.value = null;
  };

  const flushPendingUpdate = () => {
    if (scheduledUpdate !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(scheduledUpdate);
    }
    scheduledUpdate = undefined;

    const handles = pendingHandles;
    pendingHandles = undefined;
    if (handles) {
      updateEdgeData<OrthogonalEdgeData>(props.id, { handles });
    }
  };

  const cancelPendingUpdate = () => {
    if (scheduledUpdate !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(scheduledUpdate);
    }
    scheduledUpdate = undefined;
    pendingHandles = undefined;
  };

  const scheduleEdgeUpdate = (handles: Point[]) => {
    pendingHandles = handles;
    if (scheduledUpdate !== undefined) {
      return;
    }

    if (typeof requestAnimationFrame !== 'function') {
      flushPendingUpdate();
      return;
    }

    scheduledUpdate = requestAnimationFrame(flushPendingUpdate);
  };

  const startHandleDrag = (index: number, event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const initialHandle = handlePoints.value[index];
    if (!initialHandle) {
      return;
    }

    draggingHandle.value = { index, point: { ...initialHandle } };
    const move = (moveEvent: PointerEvent) => {
      const point = screenToFlowCoordinate({ x: moveEvent.clientX, y: moveEvent.clientY });
      draggingHandle.value = { index, point };
      const handles = handlePoints.value.map((handle, handleIndex) => (handleIndex === index ? point : handle));
      scheduleEdgeUpdate(handles);
    };

    removeDragListeners = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stopHandleDrag);
      document.removeEventListener('pointercancel', stopHandleDrag);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stopHandleDrag);
    document.addEventListener('pointercancel', stopHandleDrag);
  };

  onBeforeUnmount(() => {
    cancelPendingUpdate();
    removeDragListeners?.();
  });

  return {
    handlePoints,
    labelElement,
    visualPath,
    svgPath,
    labelStyle,
    handleStyle,
    interactionStrokeWidth: INTERACTION_STROKE_WIDTH,
    createHandle,
    startHandleDrag,
  };
};

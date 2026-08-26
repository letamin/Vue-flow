// Keeps an orthogonal edge responsive: it reroutes the path, previews drag interactions,
// and writes adjusted waypoints back to Vue Flow as the user edits the edge.
import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue';
import { useVueFlow, type EdgeProps } from '@vue-flow/core';
import type { OrthogonalEdgeData, Point } from '../interface/OrthogonalRouter';
import type { SegmentDragState, WaypointDragState, SegmentHandle } from '../interface/SpecialEdge';
import { routeOrthogonal } from '../router/orthogonalRouter';
import {
  clonePoints,
  DRAG_THRESHOLD,
  labelSegmentOrientation,
  manhattanDistance,
  moveSegment,
  pointForLabel,
  samePoint,
  samePointList,
  simplifyPolyline,
  snapSegmentCoordinate,
  snapWaypoint,
  segmentOrientation,
} from '../services/specialEdgeGeometry';

export const useSpecialEdge = (props: Readonly<EdgeProps<OrthogonalEdgeData>>) => {
  const { screenToFlowCoordinate, updateEdgeData } = useVueFlow();

  const segmentDrag = ref<SegmentDragState | null>(null);
  const waypointDrag = ref<WaypointDragState | null>(null);

  let removeDragListeners: (() => void) | undefined;
  let scheduledMove: number | undefined;
  let pendingMove: (() => void) | undefined;

  const sourcePoint = computed(() => ({ x: props.sourceX, y: props.sourceY }));
  const targetPoint = computed(() => ({ x: props.targetX, y: props.targetY }));
  const isInteracting = computed(() => Boolean(segmentDrag.value || waypointDrag.value));

  const buildRoute = (waypoints: Point[] = []) => {
    return routeOrthogonal({
      source: sourcePoint.value,
      target: targetPoint.value,
      obstacles: [],
      waypoints,
      clearance: props.data?.clearance,
    });
  };

  const effectiveWaypoints = computed(() => waypointDrag.value?.previewWaypoints ?? props.data?.waypoints ?? []);
  const routedPath = computed(() => buildRoute(effectiveWaypoints.value));

  const displayedRoute = computed(() => {
    const state = segmentDrag.value;
    return state ? moveSegment(state.originalRoute, state.segmentIndex, state.moveAxis, state.currentCoordinate) : routedPath.value;
  });

  const segmentDragHandle = computed<Point | null>(() => {
    const state = segmentDrag.value;
    if (!state) {
      return null;
    }
    const start = displayedRoute.value[state.segmentIndex];
    const end = displayedRoute.value[state.segmentIndex + 1];
    return start && end ? { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } : null;
  });

  const svgPath = computed(() => displayedRoute.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '));

  const midpointHandles = computed<SegmentHandle[]>(() => {
    if (isInteracting.value) {
      return [];
    }
    const handles: SegmentHandle[] = [];
    const route = displayedRoute.value;

    for (let segmentIndex = 0; segmentIndex < route.length - 1; segmentIndex += 1) {
      const start = route[segmentIndex];
      const end = route[segmentIndex + 1];

      if (!start || !end || samePoint(start, end)) {
        continue;
      }

      const horizontal = segmentOrientation(start, end) === 'horizontal';
      handles.push({
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        segmentIndex,
        direction: horizontal ? 'horizontal' : 'vertical',
        moveAxis: horizontal ? 'y' : 'x',
      });
    }

    return handles;
  });

  const waypointHandles = computed(() => {
    if (segmentDrag.value) {
      return [];
    }

    return waypointDrag.value?.previewWaypoints ?? props.data?.waypoints ?? [];
  });

  const labelPosition = computed(() => pointForLabel(displayedRoute.value));

  const labelStyle = computed<CSSProperties>(() => ({
    transform: `${labelSegmentOrientation(displayedRoute.value) === 'vertical' ? 'translate(0, -50%)' : 'translate(-50%, -50%)'} translate(${labelPosition.value.x}px, ${labelPosition.value.y}px)`,
  }));

  const handleStyle = (handle: Point): CSSProperties => ({
    pointerEvents: 'all',
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${handle.x}px, ${handle.y}px)`,
  });

  const addDragListeners = (moveHandler: (event: PointerEvent) => void, finishHandler: () => void) => {
    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', finishHandler);
    document.addEventListener('pointercancel', finishHandler);

    return () => {
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', finishHandler);
      document.removeEventListener('pointercancel', finishHandler);
    };
  };

  const flushScheduledMove = () => {
    if (scheduledMove !== undefined) {
      cancelAnimationFrame(scheduledMove);
    }

    scheduledMove = undefined;
    const move = pendingMove;
    pendingMove = undefined;
    move?.();
  };

  const scheduleMove = (move: () => void) => {
    pendingMove = move;
    if (scheduledMove !== undefined) {
      return;
    }

    if (typeof requestAnimationFrame !== 'function') {
      flushScheduledMove();
      return;
    }

    scheduledMove = requestAnimationFrame(flushScheduledMove);
  };

  const cleanupDragInteraction = () => {
    if (scheduledMove !== undefined) {
      cancelAnimationFrame(scheduledMove);
    }

    scheduledMove = undefined;
    pendingMove = undefined;
    removeDragListeners?.();
    removeDragListeners = undefined;
  };

  const commitPolyline = (polyline: Point[]) => {
    const simplified = simplifyPolyline(polyline);
    updateEdgeData<OrthogonalEdgeData>(props.id, { waypoints: simplified.length <= 2 ? [] : simplified.slice(1, -1) });
  };

  const startSegmentDrag = (segmentIndex: number, event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const routeSnapshot = clonePoints(routedPath.value);
    const start = routeSnapshot[segmentIndex];
    const end = routeSnapshot[segmentIndex + 1];
    if (!start || !end || samePoint(start, end)) {
      return;
    }

    const moveAxis = segmentOrientation(start, end) === 'horizontal' ? 'y' : 'x';
    const pointerStart = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
    segmentDrag.value = {
      segmentIndex,
      originalRoute: routeSnapshot,
      currentCoordinate: start[moveAxis],
      moveAxis,
      pointerStart,
      hasMoved: false,
    };

    const movePreview = (moveEvent: PointerEvent) => {
      const pointer = screenToFlowCoordinate({ x: moveEvent.clientX, y: moveEvent.clientY });
      scheduleMove(() => {
        const state = segmentDrag.value;
        if (!state) {
          return;
        }

        state.currentCoordinate = snapSegmentCoordinate(pointer[state.moveAxis], state);
        state.hasMoved ||= manhattanDistance(state.pointerStart, pointer) >= DRAG_THRESHOLD;
      });
    };

    const finish = () => {
      flushScheduledMove();
      const state = segmentDrag.value;
      if (state?.hasMoved) {
        commitPolyline(moveSegment(state.originalRoute, state.segmentIndex, state.moveAxis, state.currentCoordinate));
      }

      segmentDrag.value = null;
      cleanupDragInteraction();
    };

    removeDragListeners = addDragListeners(movePreview, finish);
  };

  const startWaypointDrag = (waypointIndex: number, event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const existingWaypoints = clonePoints(props.data?.waypoints ?? []);
    if (!existingWaypoints[waypointIndex]) {
      return;
    }

    const pointerStart = screenToFlowCoordinate({ x: event.clientX, y: event.clientY });
    waypointDrag.value = { waypointIndex, previewWaypoints: existingWaypoints, pointerStart, hasMoved: false };

    const movePreview = (moveEvent: PointerEvent) => {
      const pointer = screenToFlowCoordinate({ x: moveEvent.clientX, y: moveEvent.clientY });
      scheduleMove(() => {
        const state = waypointDrag.value;
        if (!state) {
          return;
        }

        const snappedPoint = snapWaypoint(pointer, state.waypointIndex, state.previewWaypoints, sourcePoint.value, targetPoint.value);
        state.previewWaypoints = state.previewWaypoints.map((waypoint, index) => (index === state.waypointIndex ? snappedPoint : waypoint));
        state.hasMoved ||= manhattanDistance(state.pointerStart, pointer) >= DRAG_THRESHOLD;
      });
    };

    const finish = () => {
      flushScheduledMove();
      const state = waypointDrag.value;
      if (state?.hasMoved) {
        commitPolyline(buildRoute(state.previewWaypoints));
      }

      waypointDrag.value = null;
      cleanupDragInteraction();
    };

    removeDragListeners = addDragListeners(movePreview, finish);
  };

  watch(
    () => props.data?.normalizeRevision,
    async (newRevision, oldRevision) => {
      if (newRevision === undefined || newRevision === oldRevision || isInteracting.value) {
        return;
      }
      await nextTick();

      const currentWaypoints = props.data?.waypoints ?? [];
      if (!currentWaypoints.length) {
        return;
      }

      const normalized = simplifyPolyline([sourcePoint.value, ...clonePoints(currentWaypoints), targetPoint.value]);
      const normalizedWaypoints = normalized.length > 2 ? normalized.slice(1, -1) : [];

      if (!samePointList(currentWaypoints, normalizedWaypoints)) {
        updateEdgeData<OrthogonalEdgeData>(props.id, { waypoints: normalizedWaypoints });
      }
    },
    { flush: 'post' },
  );
  onBeforeUnmount(() => {
    cleanupDragInteraction();
    segmentDrag.value = null;
    waypointDrag.value = null;
  });

  return {
    segmentDragHandle,
    svgPath,
    waypointHandles,
    midpointHandles,
    labelStyle,
    labelPosition,
    handleStyle,
    startSegmentDrag,
    startWaypointDrag,
  };
};

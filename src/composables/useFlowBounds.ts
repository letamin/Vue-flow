import { computed, nextTick, reactive, ref, watch, onBeforeUnmount, type CSSProperties } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { CanvasDimensions, Edge, NodeExtent } from '../interface/Flow';
import { clampNodePosition, getNodeExtent, normalizeBoundary } from '../services/flowBounds';

export const useFlowBounds = () => {
  const { fitView, getNodes, getEdges, setEdges, updateNodeInternals } = useVueFlow();

  const dimensions = reactive<CanvasDimensions>({ width: 800, height: 600 });
  const isResizing = ref(false);

  const nodeExtent = computed<NodeExtent>(() => getNodeExtent(dimensions));
  const canvasStyle = computed<CSSProperties>(() => ({ width: `${dimensions.width}px`, height: `${dimensions.height}px` }));

  const resizeFlow = async (newWidth: number, newHeight: number): Promise<void> => {
    if (isResizing.value) {
      return;
    }
    isResizing.value = true;
    const currentNodes = getNodes.value;
    const currentEdges = [...getEdges.value] as Edge[];

    // PERFORMANCE: Batch all updates into single operations to minimize re-renders
    // Update node positions in single pass
    currentNodes.forEach((node) => {
      node.position = clampNodePosition(node, { width: newWidth, height: newHeight });
    });

    // Clamp only edges that actually need it (those with special type and handles)
    const edgesToClamp = currentEdges.map((edge) => {
      if (edge.type !== 'special' || !edge.data?.handles?.length) {
        return edge;
      }

      return {
        ...edge,
        data: {
          ...edge.data,
          handles: edge.data.handles.map((handle) => {
            const x = Math.max(
              24,
              Math.min(handle.x, Math.max(24, newWidth - 24)),
            );
            const y = Math.max(
              24,
              Math.min(handle.y, Math.max(24, newHeight - 24)),
            );
            return { x, y };
          }),
          normalizeRevision: (edge.data.normalizeRevision ?? 0) + 1,
        },
      };
    });

    // Single edge update instead of setEdges([]) then setEdges(...)
    setEdges(edgesToClamp);

    // Single update of all node internals at once
    await nextTick();
    updateNodeInternals(currentNodes.map((node) => node.id));

    // Fit view after all updates complete
    await fitView({ duration: 300 });
    isResizing.value = false;
  };

  // PERFORMANCE: Debounce resize to prevent multiple resize cycles and layout thrashing.
  // Consolidate multiple watchers into single watcher and batch normalization.
  let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
  let lastWidth = dimensions.width;
  let lastHeight = dimensions.height;

  const triggerDebouncedResize = (width: number, height: number): void => {
    // Clear pending resize
    if (resizeTimeout !== undefined) {
      clearTimeout(resizeTimeout);
    }

    // Schedule new resize with 300ms debounce
    resizeTimeout = setTimeout(() => {
      void resizeFlow(width, height);
      resizeTimeout = undefined;
    }, 300);
  };

  // Single consolidated watcher for both width and height
  watch(
    () => ({ width: dimensions.width, height: dimensions.height }),
    ({ width, height }) => {
      // Normalize both dimensions
      dimensions.width = normalizeBoundary(width, 800);
      dimensions.height = normalizeBoundary(height, 600);

      // Trigger debounced resize only if dimensions actually changed
      if (dimensions.width !== lastWidth || dimensions.height !== lastHeight) {
        lastWidth = dimensions.width;
        lastHeight = dimensions.height;
        triggerDebouncedResize(dimensions.width, dimensions.height);
      }
    },
    { flush: 'post' },
  );

  onBeforeUnmount(() => {
    if (resizeTimeout !== undefined) {
      clearTimeout(resizeTimeout);
    }
  });

  const presets = [
    { label: '16:9', width: 1280, height: 720 },
    { label: '4:3', width: 800, height: 600 },
    { label: 'Square', width: 600, height: 600 },
  ];

  const applyPreset = (preset: CanvasDimensions): void => {
    dimensions.width = preset.width;
    dimensions.height = preset.height;
  };

  return { dimensions, nodeExtent, canvasStyle, presets, applyPreset };
};

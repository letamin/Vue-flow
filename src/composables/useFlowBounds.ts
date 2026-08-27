import { computed, nextTick, reactive, ref, watch, type CSSProperties } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { CanvasDimensions, Edge, NodeExtent } from '../interface/Flow';
import { clampEdgeHandles, clampNodePosition, getNodeExtent, normalizeBoundary } from '../services/flowBounds';

export const useFlowBounds = () => {
  const dimensions = reactive<CanvasDimensions>({ width: 800, height: 600 });
  const isResizing = ref(false);
  const { fitView, getNodes, getEdges, setEdges, updateNodeInternals } = useVueFlow();

  const nodeExtent = computed<NodeExtent>(() => getNodeExtent(dimensions));
  const canvasStyle = computed<CSSProperties>(() => ({ width: `${dimensions.width}px`, height: `${dimensions.height}px` }));

  const resizeFlow = async (newWidth: number, newHeight: number): Promise<void> => {
    if (isResizing.value) {
      return;
    }
    isResizing.value = true;
    const currentNodes = getNodes.value;
    const currentEdges = [...getEdges.value] as Edge[];
    setEdges([]);
    currentNodes.forEach((node) => {
      node.position = clampNodePosition(node, { width: newWidth, height: newHeight });
    });
    await nextTick();
    updateNodeInternals(currentNodes.map((node) => node.id));
    await nextTick();
    setEdges(clampEdgeHandles(currentEdges, { width: newWidth, height: newHeight }));
    await fitView({ duration: 300 });
    isResizing.value = false;
  };

  watch(
    () => dimensions.width,
    (value) => {
      dimensions.width = normalizeBoundary(value, 800);
    },
  );
  watch(
    () => dimensions.height,
    (value) => {
      dimensions.height = normalizeBoundary(value, 600);
    },
  );
  watch(
    () => [dimensions.width, dimensions.height] as const,
    ([width, height]) => void resizeFlow(width, height),
    { flush: 'post' },
  );

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

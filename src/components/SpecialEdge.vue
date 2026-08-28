<template>
  <path ref="visualPath" :id="id" :style="style" class="vue-flow__edge-path" :d="svgPath" :marker-end="markerEnd" />
  <path class="special-edge__interaction-path" :d="svgPath" :stroke-width="interactionStrokeWidth" @dblclick="createHandle" />

  <EdgeLabelRenderer>
    <div
      v-if="props.label"
      ref="labelElement"
      class="edge-label nodrag nopan"
      :style="{
        position: 'absolute',
        ...labelStyle,
      }"
    >
      {{ props.label }}
    </div>

    <template v-if="props.selected">
      <button
        v-for="(handle, index) in handlePoints"
        :key="`edge-handle-${index}`"
        class="edge-waypoint-handle nodrag nopan"
        :style="handleStyle(handle)"
        type="button"
        aria-label="Move edge handle"
        @pointerdown="startHandleDrag(index, $event)"
      />
    </template>
  </EdgeLabelRenderer>
</template>

<script lang="ts" setup>
import { EdgeLabelRenderer, type EdgeProps } from '@vue-flow/core';
import type { OrthogonalEdgeData } from '../interface/SpecialEdge';
import { useSpecialEdge } from '../composables/useSpecialEdge';

const props = defineProps<EdgeProps<OrthogonalEdgeData>>();

const { handlePoints, svgPath, labelStyle, handleStyle, interactionStrokeWidth, createHandle, startHandleDrag } = useSpecialEdge(props);
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<style>
.special-edge__interaction-path {
  fill: none;
  stroke: transparent;
  pointer-events: stroke;
  cursor: pointer;
}

.edge-waypoint-handle {
  width: 10px;
  height: 10px;
  padding: 0;
  border: 2px solid #f05f75;
  border-radius: 50%;
  background: white;
  cursor: grab;
  box-sizing: border-box;
}

.edge-waypoint-handle:active {
  cursor: grabbing;
}

.edge-label {
  pointer-events: none;
  padding: 4px 8px;
  border: 1px solid #c8d0d9;
  border-radius: 4px;
  background: white;
  color: #27313a;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgb(0 0 0 / 12%);
}
</style>

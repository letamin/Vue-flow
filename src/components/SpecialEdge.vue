<template>
  <path :id="id" :style="style" class="vue-flow__edge-path" :d="svgPath" :marker-end="markerEnd" />

  <EdgeLabelRenderer>
    <div
      v-if="props.label"
      class="edge-label nodrag nopan"
      :style="{
        position: 'absolute',
        ...labelStyle,
      }"
    >
      {{ props.label }}
    </div>

    <button
      v-for="(waypoint, index) in waypointHandles"
      :key="`waypoint-${index}`"
      class="edge-waypoint-handle edge-waypoint-handle--active nodrag nopan"
      :style="handleStyle(waypoint)"
      type="button"
      aria-label="Move edge waypoint"
      @pointerdown="startWaypointDrag(index, $event)"
    />

    <button
      v-for="handle in midpointHandles"
      :key="`segment-${handle.segmentIndex}`"
      class="edge-waypoint-handle edge-waypoint-handle--midpoint nodrag nopan"
      :style="handleStyle(handle)"
      type="button"
      aria-label="Move edge segment"
      @pointerdown="startSegmentDrag(handle.segmentIndex, $event)"
    />

    <button
      v-if="segmentDragHandle"
      class="edge-waypoint-handle edge-waypoint-handle--dragging nodrag nopan"
      :style="handleStyle(segmentDragHandle)"
      type="button"
      aria-hidden="true"
      tabindex="-1"
    />
  </EdgeLabelRenderer>
</template>

<script lang="ts" setup>
import { EdgeLabelRenderer, type EdgeProps } from '@vue-flow/core';
import type { OrthogonalEdgeData } from '../interface/OrthogonalRouter';
import { useSpecialEdge } from '../composables/useSpecialEdge';

const props = defineProps<EdgeProps<OrthogonalEdgeData>>();

const { segmentDragHandle, svgPath, waypointHandles, midpointHandles, labelStyle, handleStyle, startSegmentDrag, startWaypointDrag } =
  useSpecialEdge(props);
</script>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<style>
.edge-waypoint-handle {
  width: 10px;
  height: 10px;
  padding: 0;
  border: 2px solid #f05f75;
  border-radius: 50%;
  background: white;
  cursor: crosshair;
  box-sizing: border-box;
  transition:
    width 100ms ease,
    height 100ms ease,
    background-color 100ms ease;
}

.edge-waypoint-handle:hover {
  width: 14px;
  height: 14px;
  background: #f05f75;
}

.edge-waypoint-handle--active {
  background: #f05f75;
}

.edge-waypoint-handle--midpoint {
  background: white;
}

.edge-waypoint-handle--midpoint:hover {
  background: #f05f75;
}

.edge-waypoint-handle--dragging {
  width: 14px;
  height: 14px;
  border-color: #d93654;
  background: #f05f75;
  cursor: grabbing;
  pointer-events: none;
  box-shadow:
    0 0 0 3px rgb(240 95 117 / 20%),
    0 2px 6px rgb(0 0 0 / 20%);
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

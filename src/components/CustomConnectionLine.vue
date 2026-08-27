<template>
  <path class="vue-flow__connection-path" :d="path[0]" :marker-end="markerEnd" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getBezierPath, type ConnectionLineProps } from '@vue-flow/core';
import type { CanvasDimensions } from '../interface/Flow';
import { clampPoint } from '../services/flowBounds';

const props = defineProps<ConnectionLineProps & { boundary: CanvasDimensions }>();

const path = computed(() => {
  const source = clampPoint({ x: props.sourceX, y: props.sourceY }, props.boundary);
  const target = clampPoint({ x: props.targetX, y: props.targetY }, props.boundary);

  return getBezierPath({
    sourceX: source.x,
    sourceY: source.y,
    sourcePosition: props.sourcePosition,
    targetX: target.x,
    targetY: target.y,
    targetPosition: props.targetPosition,
  });
});
</script>

<style scoped>
.vue-flow__connection-path {
  fill: none;
  stroke: #7dc9bd;
  stroke-width: 2;
}
</style>

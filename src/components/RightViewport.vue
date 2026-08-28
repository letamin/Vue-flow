<template>
  <main class="viewport-panel">
    <div class="canvas-frame bounded-container" :style="canvasStyle">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :node-extent="nodeExtent"
        :translate-extent="nodeExtent"
        :only-render-visible-elements="true"
        @node-drag-stop="onNodeDragStop"
        @connect="onConnect"
        @edges-change="onEdgesChange"
      >
        <template #node-special="specialNodeProps">
          <SpecialNode v-bind="specialNodeProps" />
        </template>
        <template #edge-special="specialEdgeProps">
          <SpecialEdge v-bind="{ ...specialEdgeProps, style: specialEdgeProps.style ?? {} }" />
        </template>
      </VueFlow>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { VueFlow, type Connection, type EdgeChange, type NodeDragEvent } from '@vue-flow/core';
import type { CanvasDimensions, Edge, Node, NodeExtent } from '../interface/Flow.ts';
import SpecialEdge from './SpecialEdge.vue';
import SpecialNode from './SpecialNode.vue';

defineProps<{ nodes: Node[]; edges: Edge[]; boundary: CanvasDimensions; nodeExtent: NodeExtent; canvasStyle: CSSProperties }>();

const emit = defineEmits<{
  nodeDragStop: [event: NodeDragEvent];
  connect: [connection: Connection];
  edgesChange: [changes: EdgeChange[]];
}>();

const onNodeDragStop = (event: NodeDragEvent): void => emit('nodeDragStop', event);
const onConnect = (connection: Connection): void => emit('connect', connection);
const onEdgesChange = (changes: EdgeChange[]): void => emit('edgesChange', changes);
</script>

<style>
.viewport-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 40px;
  background-color: #0e151a;
  background-image: radial-gradient(#29373c 1px, transparent 1px);
  background-size: 22px 22px;
}
.canvas-frame {
  position: relative;
  flex: 0 0 auto;
  overflow: hidden;
  pointer-events: auto;
  border: 2px solid #7dc9bd;
  box-shadow:
    0 0 0 8px rgba(125, 201, 189, 0.08),
    0 18px 50px rgba(0, 0, 0, 0.35);
}
.bounded-container {
  overflow: hidden;
  clip-path: inset(0);
}
.canvas-frame .vue-flow,
.canvas-frame .vue-flow__container,
.canvas-frame .vue-flow__renderer,
.canvas-frame .vue-flow__edges,
.canvas-frame .vue-flow__connectionline {
  overflow: hidden;
}
@media (max-width: 700px) {
  .viewport-panel {
    min-height: 520px;
    padding: 24px;
  }
}
</style>

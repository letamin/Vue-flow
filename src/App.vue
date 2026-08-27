<template>
  <div class="app-shell">
    <LeftPanel v-model:dimensions="dimensions" :presets="presets" @apply-preset="applyPreset" />
    <RightViewport
      :nodes="nodes"
      :edges="edges"
      :boundary="dimensions"
      :node-extent="nodeExtent"
      :canvas-style="canvasStyle"
      @node-drag-stop="onNodeDragStop"
      @connect="onConnect"
      @edges-change="onEdgesChange"
    />
  </div>
</template>

<script setup lang="ts">
import LeftPanel from './components/LeftPanel.vue';
import RightViewport from './components/RightViewport.vue';
import { useFlowBounds } from './composables/useFlowBounds';
import { useFlowEdges } from './composables/useFlowEdges';

const { dimensions, nodeExtent, canvasStyle, presets, applyPreset } = useFlowBounds();
const { nodes, edges, onConnect, onEdgesChange, onNodeDragStop } = useFlowEdges(dimensions);
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.app-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #111820;
  color: #e8eef2;
  font-family: 'Trebuchet MS', sans-serif;
}

@media (max-width: 700px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: auto;
  }
}
</style>

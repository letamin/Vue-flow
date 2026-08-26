<template>
  <div class="wrapper">
    <VueFlow :nodes="nodes" :edges="edges" :only-render-visible-elements="true" @node-drag-stop="onNodeDragStop">
      <template #node-special="specialNodeProps">
        <SpecialNode v-bind="specialNodeProps" />
      </template>

      <template #edge-special="specialEdgeProps">
        <SpecialEdge
          v-bind="{
            ...specialEdgeProps,
            style: specialEdgeProps.style ?? {},
          }"
        />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Edge, Node } from '@vue-flow/core';
import { VueFlow, type NodeDragEvent } from '@vue-flow/core';
import type { OrthogonalEdgeData } from './interface/OrthogonalRouter.ts';

import SpecialNode from './components/SpecialNode.vue';
import SpecialEdge from './components/SpecialEdge.vue';

const nodes = ref<Node[]>([
  {
    id: '1',
    type: 'input',
    position: { x: 250, y: 5 },
    data: { label: 'Node 1' },
  },
  {
    id: '2',
    position: { x: 100, y: 100 },
    data: { label: 'Node 2' },
  },
  {
    id: '3',
    type: 'output',
    position: { x: 400, y: 200 },
    data: { label: 'Node 3' },
  },
  {
    id: '4',
    type: 'special',
    position: { x: 800, y: 200 },
    data: {
      label: 'Node 4',
      hello: 'world',
    },
  },
]);

const edges = ref<Edge<OrthogonalEdgeData>[]>([
  {
    id: 'e1->2',
    source: '1',
    target: '2',
  },
  {
    id: 'e2->3',
    source: '2',
    target: '3',
    animated: true,
  },
  {
    id: 'e3->4',
    type: 'special',
    source: '3',
    target: '4',
    label: 'Special route',
    data: {
      clearance: 20,
    },
  },
]);

const onNodeDragStop = (event: NodeDragEvent): void => {
  const draggedNodeId = event.node.id;

  for (const edge of edges.value) {
    const isConnected = edge.source === draggedNodeId || edge.target === draggedNodeId;

    if (edge.type !== 'special' || !isConnected) {
      continue;
    }

    edge.data = {
      ...edge.data,
      normalizeRevision: (edge.data?.normalizeRevision ?? 0) + 1,
    };
  }
};
</script>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.wrapper {
  width: 100vw;
  height: 100vh;
}
</style>

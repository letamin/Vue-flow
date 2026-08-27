import { ref } from 'vue';
import { applyEdgeChanges, useVueFlow, type Connection, type EdgeChange, type GraphEdge, type NodeDragEvent } from '@vue-flow/core';
import type { CanvasDimensions, Edge, Node } from '../interface/Flow';
import { edges as mockEdges, nodes as mockNodes } from '../mocks/data';
import { clampNodePosition } from '../services/flowBounds';

export const useFlowEdges = (dimensions: CanvasDimensions) => {
  const { addEdges } = useVueFlow();

  const nodes = ref<Node[]>(mockNodes);
  const edges = ref<Edge[]>(mockEdges);

  const onConnect = (connection: Connection): void => {
    addEdges(connection);
  };

  const onEdgesChange = (changes: EdgeChange[]): void => {
    edges.value = applyEdgeChanges(changes, edges.value as unknown as GraphEdge[]) as unknown as Edge[];
  };

  const onNodeDragStop = (event: NodeDragEvent): void => {
    event.node.position = clampNodePosition(event.node, dimensions);
    for (const edge of edges.value) {
      if (edge.type === 'special' && (edge.source === event.node.id || edge.target === event.node.id)) {
        edge.data = { ...edge.data, normalizeRevision: (edge.data?.normalizeRevision ?? 0) + 1 };
      }
    }
  };

  return { nodes, edges, onConnect, onEdgesChange, onNodeDragStop };
};

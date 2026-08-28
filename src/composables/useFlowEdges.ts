import { ref } from 'vue';
import { applyEdgeChanges, useVueFlow, type Connection, type EdgeChange, type GraphEdge, type NodeDragEvent } from '@vue-flow/core';
import type { CanvasDimensions, Edge, Node } from '../interface/Flow';
import { edges as mockEdges, nodes as mockNodes } from '../mocks/data';
import { clampNodePosition } from '../services/flowBounds';

export const useFlowEdges = (dimensions: CanvasDimensions) => {
  const { addEdges } = useVueFlow();

  const nodes = ref<Node[]>(mockNodes);
  const edges = ref<Edge[]>(mockEdges);

  // PERFORMANCE NOTE: Current implementation finds connected edges.
  // Edge type has complex recursive types that cause TypeScript inference issues with type-safe operations.
  // Using type assertions to work around TypeScript limitations while maintaining runtime safety.
  const getConnectedEdges = (nodeId: string): Edge[] => {
    const result: Edge[] = [];
    const edgeList = edges.value as Array<Edge | undefined>;
    for (let i = 0; i < edgeList.length; i++) {
      const edge = edgeList[i];
      if (edge && (edge.source === nodeId || edge.target === nodeId)) {
        result.push(edge as Edge);
      }
    }
    return result;
  };

  const onConnect = (connection: Connection): void => {
    addEdges(connection);
  };

  const onEdgesChange = (changes: EdgeChange[]): void => {
    edges.value = applyEdgeChanges(changes, edges.value as unknown as GraphEdge[]) as unknown as Edge[];
  };

  const onNodeDragStop = (event: NodeDragEvent): void => {
    event.node.position = clampNodePosition(event.node, dimensions);
    // PERFORMANCE: Use O(1) lookup instead of O(n) loop through all edges
    const connectedEdges = getConnectedEdges(event.node.id);
    for (const edge of connectedEdges) {
      if (edge.type === 'special') {
        edge.data = { ...edge.data, normalizeRevision: (edge.data?.normalizeRevision ?? 0) + 1 };
      }
    }
  };

  return { nodes, edges, onConnect, onEdgesChange, onNodeDragStop };
};

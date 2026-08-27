import type { CoordinateExtent, Edge as VueFlowEdge, Node as VueFlowNode } from '@vue-flow/core';
import type { OrthogonalEdgeData } from './OrthogonalRouter';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export type Node = VueFlowNode;
export type Edge = VueFlowEdge<OrthogonalEdgeData>;

export interface Flow {
  dimensions: CanvasDimensions;
  nodes: Node[];
  edges: Edge[];
}

export type NodeExtent = CoordinateExtent;

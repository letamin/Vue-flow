import type { CoordinateExtent, Edge as VueFlowEdge, Node as VueFlowNode } from '@vue-flow/core';
import type { OrthogonalEdgeData } from './SpecialEdge';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export type Node = VueFlowNode;
export type Edge = VueFlowEdge<OrthogonalEdgeData>;

export type NodeExtent = CoordinateExtent;

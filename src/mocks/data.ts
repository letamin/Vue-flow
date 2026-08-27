import type { Edge, Node } from '../interface/Flow';

export const nodes: Node[] = [
  { id: '1', type: 'input', position: { x: 250, y: 5 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 100, y: 100 }, data: { label: 'Node 2' } },
  { id: '3', type: 'output', position: { x: 200, y: 200 }, data: { label: 'Node 3' } },
  { id: '4', type: 'special', position: { x: 600, y: 200 }, data: { label: 'Node 4', hello: 'world' } },
];

export const edges: Edge[] = [
  { id: 'e1->2', source: '1', target: '2' },
  { id: 'e2->3', source: '2', target: '3', animated: true },
  { id: 'e3->4', type: 'special', source: '3', target: '4', label: 'Special route', data: { clearance: 20 } },
];

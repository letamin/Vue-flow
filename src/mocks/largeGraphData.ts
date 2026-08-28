import type { Edge, Node } from '../interface/Flow';

/**
 * PERFORMANCE TEST DATA
 *
 * Use these datasets to test scalability:
 * - smallGraph: 10 nodes, 15 edges (baseline)
 * - mediumGraph: 100 nodes, 200 edges  
 * - largeGraph: 500 nodes, 1000 edges
 * - veryLargeGraph: 1000 nodes, 2000 edges
 * - massiveGraph: 5000 nodes, 10000 edges (stress test)
 *
 * To use in development:
 * 1. Import: import { mediumGraph } from '@/mocks/largeGraphData'
 * 2. Update src/composables/useFlowEdges.ts to use desired dataset
 * 3. Test performance with different canvas sizes
 */

const generateGridGraph = (rows: number, cols: number): { nodes: Node[]; edges: Edge[] } => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Generate nodes in a grid layout
  const nodeSpacingX = 200;
  const nodeSpacingY = 150;

  let nodeId = 0;
  const nodeGrid: string[][] = [];

  for (let r = 0; r < rows; r++) {
    nodeGrid[r] = [];
    for (let c = 0; c < cols; c++) {
      const id = String(nodeId);
      nodes.push({
        id,
        position: {
          x: c * nodeSpacingX + 50,
          y: r * nodeSpacingY + 50,
        },
        data: { label: `N${nodeId}` },
        type: nodeId % 5 === 0 ? 'special' : undefined,
      });
      nodeGrid[r]![c] = id;
      nodeId++;
    }
  }

  // Connect nodes horizontally and vertically to create edges
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const currentId = nodeGrid[r]![c]!;

      // Connect to right neighbor
      if (c < cols - 1) {
        const targetId = nodeGrid[r]![c + 1]!;
        edges.push({
          id: `e${currentId}-${targetId}`,
          source: currentId,
          target: targetId,
          type: (r + c) % 7 === 0 ? 'special' : undefined,
          label: (r + c) % 11 === 0 ? `Link ${edges.length}` : undefined,
        });
      }

      // Connect to bottom neighbor
      if (r < rows - 1) {
        const targetId = nodeGrid[r + 1]![c]!;
        edges.push({
          id: `e${currentId}-${targetId}`,
          source: currentId,
          target: targetId,
          type: (r + c) % 7 === 2 ? 'special' : undefined,
          label: (r + c) % 13 === 0 ? `Link ${edges.length}` : undefined,
        });
      }

      // Occasionally add diagonal edges for complexity
      if (r < rows - 1 && c < cols - 1 && (r + c) % 5 === 0) {
        const targetId = nodeGrid[r + 1]![c + 1]!;
        edges.push({
          id: `e${currentId}-${targetId}`,
          source: currentId,
          target: targetId,
          type: (r + c) % 6 === 0 ? 'special' : undefined,
        });
      }
    }
  }

  return { nodes, edges };
};

// Test datasets of increasing size
export const smallGraph = generateGridGraph(3, 3);
export const mediumGraph = generateGridGraph(10, 10);
export const largeGraph = generateGridGraph(22, 22);
export const veryLargeGraph = generateGridGraph(32, 32);
export const massiveGraph = generateGridGraph(71, 71); // ~5000 nodes

/**
 * Performance Testing Guide
 *
 * 1. BASELINE (current small graph)
 *    - 4 nodes, 3 edges
 *    - Rendering should be instant
 *    - Resize should be immediate
 *
 * 2. SMALL TEST (3x3 grid = 9 nodes, ~15 edges)
 *    - Replace smallGraph in useFlowEdges.ts
 *    - Expected: No visible lag
 *    - Resize time: < 50ms
 *
 * 3. MEDIUM TEST (10x10 grid = 100 nodes, ~200 edges)
 *    - Replace with mediumGraph
 *    - Expected: Still responsive
 *    - Resize time: 50-200ms (with optimizations)
 *    - Drag responsiveness: 60 FPS
 *
 * 4. LARGE TEST (22x22 grid = 484 nodes, ~1000 edges)
 *    - Replace with largeGraph
 *    - Expected: Noticeable lag without optimizations
 *    - Resize time: 200-500ms (with optimizations)
 *    - Drag might drop frames without optimizations
 *
 * 5. VERY LARGE (32x32 grid = 1024 nodes, ~2000 edges)
 *    - Replace with veryLargeGraph
 *    - Expected: Significant lag becomes apparent
 *    - This tests the breaking point of current architecture
 *
 * 6. MASSIVE (71x71 grid = 5041 nodes, ~10000 edges)
 *    - Replace with massiveGraph
 *    - Expected: Major performance issues
 *    - Use browser DevTools to identify bottlenecks
 *
 * Testing Commands:
 * 1. npm run dev (start dev server)
 * 2. Open http://localhost:5174
 * 3. Press F12 to open DevTools
 * 4. Go to Performance tab
 * 5. Record while:
 *    - Dragging nodes
 *    - Resizing canvas
 *    - Zooming/panning
 * 6. Analyze flame chart for bottlenecks
 *
 * Key Metrics to Monitor:
 * - Resize operation time
 * - Node drag frame rate
 * - Memory usage (heap size)
 * - Canvas render time
 * - Event handler time
 */

import { describe, expect, it } from 'vitest';
import { resolveLabelProgressForPath } from '../composables/useSpecialEdge';
import { labelSegmentOrientation, pointForLabel, segmentOrientation } from '../services/specialEdgeGeometry';

describe('special edge geometry', () => {
  it('places the label beside the longest vertical segment', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 120 },
      { x: 80, y: 120 },
    ];

    expect(segmentOrientation(path[1]!, path[2]!)).toBe('vertical');
    expect(labelSegmentOrientation(path)).toBe('vertical');
    expect(pointForLabel(path, 18)).toEqual({ x: 58, y: 60 });
  });

  it('places the label above the longest horizontal segment', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 40 },
    ];

    expect(segmentOrientation(path[0]!, path[1]!)).toBe('horizontal');
    expect(labelSegmentOrientation(path)).toBe('horizontal');
    expect(pointForLabel(path, 18)).toEqual({ x: 60, y: -18 });
  });

  it('keeps the label in the longest clear segment when handles are present', () => {
    const pathLength = 100;
    const handles = [
      { x: 30, y: 0 },
      { x: 70, y: 0 },
    ];

    const progress = resolveLabelProgressForPath(pathLength, handles, (distance) => ({ x: distance, y: 0 }), 25, 18);

    expect(progress).toBeCloseTo(0.5, 5);
  });
});

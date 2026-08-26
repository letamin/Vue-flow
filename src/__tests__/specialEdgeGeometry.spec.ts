import { describe, expect, it } from 'vitest';
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
});

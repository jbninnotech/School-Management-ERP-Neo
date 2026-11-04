import { describe, it, expect } from 'vitest';
import { calculateFaceOverlap, evaluateFaceState } from './faceDetector.js';

describe('Face State & Guide Frame Overlap Analyzer', () => {
  const guideBox = { x: 100, y: 50, width: 200, height: 300 };

  it('reports no_face when face count is 0 or box is missing', () => {
    const res = evaluateFaceState(null, guideBox, 0);
    expect(res.status).toBe('no_face');
    expect(res.colorState).toBe('red');
    expect(res.isInside).toBe(false);
  });

  it('reports multiple_faces when face count is greater than 1', () => {
    const faceBox = { x: 110, y: 60, width: 180, height: 260 };
    const res = evaluateFaceState(faceBox, guideBox, 2);
    expect(res.status).toBe('multiple_faces');
    expect(res.colorState).toBe('red');
    expect(res.isInside).toBe(false);
  });

  it('reports in_frame and green when face is well centered with >= 70% overlap', () => {
    // Face box inside guide box
    const faceBox = { x: 110, y: 60, width: 180, height: 260 };
    const res = evaluateFaceState(faceBox, guideBox, 1);
    expect(res.status).toBe('in_frame');
    expect(res.colorState).toBe('green');
    expect(res.isInside).toBe(true);
    expect(res.overlap).toBeGreaterThanOrEqual(70);
  });

  it('reports near_edge and yellow when face is centered but overlap is between 40% and 70%', () => {
    // Face box shifted towards right edge
    const faceBox = { x: 200, y: 100, width: 180, height: 240 };
    const res = evaluateFaceState(faceBox, guideBox, 1);
    expect(res.status).toBe('near_edge');
    expect(res.colorState).toBe('yellow');
    expect(res.isInside).toBe(true);
  });

  it('reports face_out_of_frame and red when face center is outside guide box', () => {
    const faceBox = { x: 20, y: 30, width: 80, height: 100 };
    const res = evaluateFaceState(faceBox, guideBox, 1);
    expect(res.status).toBe('face_out_of_frame');
    expect(res.colorState).toBe('red');
    expect(res.isInside).toBe(false);
  });
});

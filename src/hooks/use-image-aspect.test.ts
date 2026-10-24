import { describe, expect, it } from 'vitest'
import { ASPECT_TALLEST, ASPECT_WIDEST, clampAspect } from '../lib/image-aspect'

describe('clampAspect', () => {
  it('shows a landscape photo in its own shape', () => {
    // 3:2 is what most cameras shoot; it must not be squeezed into 4:3.
    expect(clampAspect(3000, 2000)).toBeCloseTo(1.5)
  })

  it('shows a 4:3 phone photo unchanged', () => {
    expect(clampAspect(4032, 3024)).toBeCloseTo(4 / 3)
  })

  it('gives a portrait photo the tall 4:5 slot instead of cropping it to 4:3', () => {
    // The regression this exists for: a 3:4 phone portrait rendered in a fixed
    // 4:3 box with contentFit="cover" lost ~44% of its height.
    expect(clampAspect(3024, 4032)).toBe(ASPECT_TALLEST)
    expect(ASPECT_TALLEST).toBeLessThan(4 / 3)
  })

  it('clamps a panorama so one frame cannot become a thin strip', () => {
    expect(clampAspect(6000, 1000)).toBe(ASPECT_WIDEST)
  })

  it('clamps an extremely tall frame so it cannot take over the feed', () => {
    expect(clampAspect(500, 3000)).toBe(ASPECT_TALLEST)
  })

  it('keeps every result inside the allowed range', () => {
    const sizes: [number, number][] = [
      [4032, 3024],
      [3024, 4032],
      [6000, 1000],
      [500, 3000],
      [1080, 1080],
      [1920, 1080],
    ]
    for (const [w, h] of sizes) {
      const a = clampAspect(w, h)
      expect(a).toBeGreaterThanOrEqual(ASPECT_TALLEST)
      expect(a).toBeLessThanOrEqual(ASPECT_WIDEST)
    }
  })
})

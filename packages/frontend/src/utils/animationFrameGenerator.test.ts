import { describe, it, expect } from 'vitest'
import {
  generateAnimationFrames,
  getFrameCount,
  getProgressForFrame,
  getTimeForFrame,
  getFrameForTime
} from './animationFrameGenerator'
import type { ChartOptions, AnimationOptions } from '@chart-generator/shared'

// Helper to create minimal chart options
function createChartOptions(dataLength: number = 100): ChartOptions {
  const data = Array.from({ length: dataLength }, (_, i) => ({
    label: `${i}km`,
    value: 100 + Math.sin(i / 10) * 50 // Elevation between 50-150m
  }))

  return {
    data,
    colors: { primary: '#2E7D32', background: '#ffffff' },
    title: 'Test Elevation',
    silhouetteMode: true
  }
}

// Helper to create animation options
function createAnimationOptions(overrides: Partial<AnimationOptions> = {}): AnimationOptions {
  return {
    enabled: true,
    durationMs: 5000,
    fps: 30,
    easing: 'linear',
    showMarker: true,
    markerSize: 6,
    markerColor: '#ffffff',
    curveEndpoint: 30,
    ...overrides
  }
}

describe('getFrameCount', () => {
  it('calculates correct frame count for standard settings', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30 })
    // 5 seconds * 30 fps = 150 frames + 1 for final frame = 151
    expect(getFrameCount(options)).toBe(151)
  })

  it('calculates correct frame count for 60fps', () => {
    const options = createAnimationOptions({ durationMs: 2000, fps: 60 })
    // 2 seconds * 60 fps = 120 frames + 1 = 121
    expect(getFrameCount(options)).toBe(121)
  })

  it('handles short durations', () => {
    const options = createAnimationOptions({ durationMs: 500, fps: 30 })
    // 0.5 seconds * 30 fps = 15 frames + 1 = 16
    expect(getFrameCount(options)).toBe(16)
  })

  it('handles 1 second at 24fps (cinematic)', () => {
    const options = createAnimationOptions({ durationMs: 1000, fps: 24 })
    // 1 second * 24 fps = 24 frames + 1 = 25
    expect(getFrameCount(options)).toBe(25)
  })
})

describe('getProgressForFrame', () => {
  it('returns 0 for first frame', () => {
    const options = createAnimationOptions({ easing: 'linear' })
    expect(getProgressForFrame(0, options)).toBe(0)
  })

  it('returns 1 for last frame', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30, easing: 'linear' })
    const lastFrame = getFrameCount(options) - 1
    expect(getProgressForFrame(lastFrame, options)).toBe(1)
  })

  it('returns 0.5 at midpoint with linear easing', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30, easing: 'linear' })
    const midFrame = Math.floor((getFrameCount(options) - 1) / 2)
    expect(getProgressForFrame(midFrame, options)).toBeCloseTo(0.5, 1)
  })

  it('applies ease-in-out correctly', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30, easing: 'ease-in-out' })
    const totalFrames = getFrameCount(options) - 1

    // At midpoint, ease-in-out should return 0.5
    const midFrame = Math.floor(totalFrames / 2)
    expect(getProgressForFrame(midFrame, options)).toBeCloseTo(0.5, 1)

    // Early frame should be slower than linear
    const earlyFrame = Math.floor(totalFrames * 0.25)
    const earlyProgress = getProgressForFrame(earlyFrame, options)
    expect(earlyProgress).toBeLessThan(0.25)
  })
})

describe('getTimeForFrame', () => {
  it('returns 0 for first frame', () => {
    const options = createAnimationOptions({ durationMs: 5000 })
    expect(getTimeForFrame(0, options)).toBe(0)
  })

  it('returns duration for last frame', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30 })
    const lastFrame = getFrameCount(options) - 1
    expect(getTimeForFrame(lastFrame, options)).toBe(5000)
  })

  it('returns correct time for middle frame', () => {
    const options = createAnimationOptions({ durationMs: 4000, fps: 30 })
    const totalFrames = getFrameCount(options) - 1
    const midFrame = Math.floor(totalFrames / 2)
    expect(getTimeForFrame(midFrame, options)).toBeCloseTo(2000, 0)
  })
})

describe('getFrameForTime', () => {
  it('returns 0 for time 0', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30 })
    expect(getFrameForTime(0, options)).toBe(0)
  })

  it('returns last frame for duration time', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30 })
    const lastFrame = getFrameCount(options) - 1
    expect(getFrameForTime(5000, options)).toBe(lastFrame)
  })

  it('clamps to last frame for time exceeding duration', () => {
    const options = createAnimationOptions({ durationMs: 5000, fps: 30 })
    const lastFrame = getFrameCount(options) - 1
    expect(getFrameForTime(10000, options)).toBe(lastFrame)
  })

  it('returns correct frame for middle time', () => {
    const options = createAnimationOptions({ durationMs: 4000, fps: 30 })
    const frame = getFrameForTime(2000, options)
    const totalFrames = getFrameCount(options) - 1
    expect(frame).toBe(Math.round(totalFrames / 2))
  })
})

describe('generateAnimationFrames', () => {
  it('generates correct number of frames', () => {
    const chartOptions = createChartOptions(100)
    const animOptions = createAnimationOptions({ durationMs: 1000, fps: 30 })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    // 1 second * 30 fps = 30 + 1 = 31 frames
    expect(frames).toHaveLength(31)
  })

  it('all frames are valid SVG strings', () => {
    const chartOptions = createChartOptions(50)
    const animOptions = createAnimationOptions({ durationMs: 500, fps: 10 })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    frames.forEach((frame, index) => {
      expect(frame).toContain('<svg')
      expect(frame).toContain('</svg>')
    })
  })

  it('first frame has minimal content revealed', () => {
    const chartOptions = createChartOptions(100)
    const animOptions = createAnimationOptions({ durationMs: 1000, fps: 30 })

    const frames = generateAnimationFrames(chartOptions, animOptions)
    const firstFrame = frames[0]

    // First frame should have clip-path at x=0 or very small width
    expect(firstFrame).toContain('clipPath')
  })

  it('last frame has full content revealed', () => {
    const chartOptions = createChartOptions(100)
    const animOptions = createAnimationOptions({ durationMs: 1000, fps: 30 })

    const frames = generateAnimationFrames(chartOptions, animOptions)
    const lastFrame = frames[frames.length - 1]

    // Last frame should exist and be valid SVG
    expect(lastFrame).toContain('<svg')
    expect(lastFrame).toContain('path')
  })

  it('includes marker when showMarker is true', () => {
    const chartOptions = createChartOptions(50)
    const animOptions = createAnimationOptions({
      durationMs: 500,
      fps: 10,
      showMarker: true
    })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    // Middle frames should have marker circle
    const middleFrame = frames[Math.floor(frames.length / 2)]
    expect(middleFrame).toContain('<circle')
  })

  it('excludes marker when showMarker is false', () => {
    const chartOptions = createChartOptions(50)
    const animOptions = createAnimationOptions({
      durationMs: 500,
      fps: 10,
      showMarker: false
    })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    // No frame should have marker circle (except possibly in defs)
    const middleFrame = frames[Math.floor(frames.length / 2)]
    // Count occurrences - should not have cx/cy attributes typical of marker
    const markerPattern = /<circle[^>]*cx="[^"]*"[^>]*cy="[^"]*"/
    expect(markerPattern.test(middleFrame)).toBe(false)
  })

  it('respects export dimensions when provided', () => {
    const chartOptions = createChartOptions(50)
    const animOptions = createAnimationOptions({ durationMs: 500, fps: 10 })
    const exportDimensions = { width: 1080, height: 1920 }

    const frames = generateAnimationFrames(chartOptions, animOptions, exportDimensions)

    // Frames should use Instagram Reel dimensions in viewBox
    const frame = frames[0]
    expect(frame).toContain('viewBox="0 0 1080 1920"')
  })
})

describe('performance', () => {
  it('generates 150 frames with 500 data points in reasonable time', () => {
    const chartOptions = createChartOptions(500)
    const animOptions = createAnimationOptions({ durationMs: 5000, fps: 30 })

    const startTime = performance.now()
    const frames = generateAnimationFrames(chartOptions, animOptions)
    const endTime = performance.now()

    expect(frames).toHaveLength(151)

    // Should complete in under 5 seconds (generous limit)
    const duration = endTime - startTime
    expect(duration).toBeLessThan(5000)
  })

  it('generates 150 frames with 1000 data points in reasonable time', () => {
    const chartOptions = createChartOptions(1000)
    const animOptions = createAnimationOptions({ durationMs: 5000, fps: 30 })

    const startTime = performance.now()
    const frames = generateAnimationFrames(chartOptions, animOptions)
    const endTime = performance.now()

    expect(frames).toHaveLength(151)

    // Should complete in under 10 seconds
    const duration = endTime - startTime
    expect(duration).toBeLessThan(10000)
  })

  it('frame generation scales linearly with frame count', () => {
    const chartOptions = createChartOptions(200)

    // 30 frames
    const options30 = createAnimationOptions({ durationMs: 1000, fps: 30 })
    const start30 = performance.now()
    generateAnimationFrames(chartOptions, options30)
    const time30 = performance.now() - start30

    // 60 frames
    const options60 = createAnimationOptions({ durationMs: 2000, fps: 30 })
    const start60 = performance.now()
    generateAnimationFrames(chartOptions, options60)
    const time60 = performance.now() - start60

    // 60 frames should take roughly 2x as long as 30 frames
    // Allow 3x margin for variance
    expect(time60).toBeLessThan(time30 * 3 + 100)
  })
})

describe('memory', () => {
  it('does not create excessively large frames', () => {
    const chartOptions = createChartOptions(500)
    const animOptions = createAnimationOptions({ durationMs: 1000, fps: 30 })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    // Each SVG frame should be reasonable size (under 100KB)
    frames.forEach((frame, index) => {
      const sizeKB = new Blob([frame]).size / 1024
      expect(sizeKB).toBeLessThan(100)
    })
  })

  it('total frame array size is manageable', () => {
    const chartOptions = createChartOptions(500)
    const animOptions = createAnimationOptions({ durationMs: 5000, fps: 30 })

    const frames = generateAnimationFrames(chartOptions, animOptions)

    // Total size should be under 15MB for 151 frames
    const totalSize = frames.reduce((sum, frame) => sum + frame.length, 0)
    const totalSizeMB = totalSize / (1024 * 1024)
    expect(totalSizeMB).toBeLessThan(15)
  })
})

/**
 * Tests for useVideoExport composable
 *
 * Note: Full FFmpeg tests require browser environment with SharedArrayBuffer.
 * These tests verify the composable's structure and basic functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useVideoExport } from './useVideoExport'

// Mock FFmpeg for unit tests (actual FFmpeg requires browser with COOP/COEP)
vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    load: vi.fn().mockResolvedValue(undefined),
    exec: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(new Uint8Array([0, 0, 0])),
    deleteFile: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array()),
  toBlobURL: vi.fn().mockResolvedValue('blob:test'),
}))

describe('useVideoExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should return all expected properties', () => {
      const result = useVideoExport()

      // State
      expect(result).toHaveProperty('isLoaded')
      expect(result).toHaveProperty('isExporting')
      expect(result).toHaveProperty('isSupported')
      expect(result).toHaveProperty('progress')
      expect(result).toHaveProperty('error')

      // Actions
      expect(result).toHaveProperty('loadFFmpeg')
      expect(result).toHaveProperty('exportToMp4')
      expect(result).toHaveProperty('downloadVideo')
      expect(result).toHaveProperty('reset')
    })

    it('should start with idle state', () => {
      const { progress, isLoaded, isExporting, error } = useVideoExport()

      expect(isLoaded.value).toBe(false)
      expect(isExporting.value).toBe(false)
      expect(error.value).toBe(null)
      expect(progress.value.stage).toBe('idle')
    })
  })

  describe('isSupported', () => {
    it('should check for SharedArrayBuffer support', () => {
      const { isSupported } = useVideoExport()

      // In jsdom environment, SharedArrayBuffer might not be defined
      // The composable should handle this gracefully
      expect(typeof isSupported.value).toBe('boolean')
    })
  })

  describe('reset', () => {
    it('should reset progress state', () => {
      const { progress, reset } = useVideoExport()

      // Simulate a state change
      progress.value = {
        stage: 'encoding',
        percent: 50,
        currentFrame: 10,
        totalFrames: 20,
        message: 'Test message',
      }

      reset()

      expect(progress.value.stage).toBe('idle')
      expect(progress.value.percent).toBe(0)
      expect(progress.value.currentFrame).toBe(0)
      expect(progress.value.totalFrames).toBe(0)
      expect(progress.value.message).toBe('')
    })
  })

  describe('loadFFmpeg', () => {
    it('should return false if SharedArrayBuffer is not supported', async () => {
      // Mock SharedArrayBuffer as undefined
      const originalSharedArrayBuffer = globalThis.SharedArrayBuffer
      // @ts-expect-error - intentionally setting to undefined for test
      globalThis.SharedArrayBuffer = undefined

      const { loadFFmpeg, error } = useVideoExport()
      const result = await loadFFmpeg()

      expect(result).toBe(false)
      expect(error.value).toContain('SharedArrayBuffer')

      // Restore
      globalThis.SharedArrayBuffer = originalSharedArrayBuffer
    })
  })

  describe('downloadVideo', () => {
    it('should create download link for video blob', () => {
      const { downloadVideo } = useVideoExport()

      // Mock DOM methods
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      const testBlob = new Blob(['test'], { type: 'video/mp4' })
      downloadVideo(testBlob, 'test-video.mp4')

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockAnchor.download).toBe('test-video.mp4')
      expect(mockAnchor.click).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalled()

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
    })
  })
})

describe('ExportProgress stages', () => {
  it('should have all expected stages', () => {
    const stages = ['idle', 'loading-ffmpeg', 'generating-frames', 'converting-to-png', 'encoding', 'done', 'error']

    const { progress } = useVideoExport()

    // Verify initial stage is valid
    expect(stages).toContain(progress.value.stage)
  })
})

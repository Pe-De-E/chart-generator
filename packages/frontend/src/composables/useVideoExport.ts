/**
 * Composable for exporting chart animations to MP4 video
 * Uses ffmpeg.wasm for client-side video encoding
 */

import { ref, shallowRef, computed } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { ChartOptions, AnimationOptions } from '@chart-generator/shared'
import { generateAnimationFrames, getFrameCount } from '../utils/animationFrameGenerator'

export interface ExportOptions {
  width: number
  height: number
  fps: number
  quality: 'low' | 'medium' | 'high'
}

export interface ExportProgress {
  stage: 'idle' | 'loading-ffmpeg' | 'generating-frames' | 'converting-to-png' | 'encoding' | 'done' | 'error'
  percent: number
  currentFrame: number
  totalFrames: number
  message: string
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  width: 1080,
  height: 1920,
  fps: 30,
  quality: 'high'
}

// Quality presets for FFmpeg (CRF values - lower = better quality, larger file)
const QUALITY_CRF: Record<ExportOptions['quality'], number> = {
  low: 28,
  medium: 23,
  high: 18
}

export function useVideoExport() {
  const ffmpeg = shallowRef<FFmpeg | null>(null)
  const isLoaded = ref(false)
  const isExporting = ref(false)
  const progress = ref<ExportProgress>({
    stage: 'idle',
    percent: 0,
    currentFrame: 0,
    totalFrames: 0,
    message: ''
  })
  const error = ref<string | null>(null)

  // Check if SharedArrayBuffer is available (required for ffmpeg.wasm)
  const isSupported = computed(() => {
    return typeof SharedArrayBuffer !== 'undefined'
  })

  /**
   * Load and initialize FFmpeg
   */
  async function loadFFmpeg(): Promise<boolean> {
    if (isLoaded.value && ffmpeg.value) {
      return true
    }

    if (!isSupported.value) {
      error.value = 'SharedArrayBuffer is not supported. Please ensure COOP/COEP headers are set.'
      return false
    }

    try {
      progress.value = {
        stage: 'loading-ffmpeg',
        percent: 0,
        currentFrame: 0,
        totalFrames: 0,
        message: 'Loading FFmpeg...'
      }

      const ff = new FFmpeg()

      // Log FFmpeg messages for debugging
      ff.on('log', ({ message }) => {
        console.log('[FFmpeg]', message)
      })

      // Track encoding progress
      ff.on('progress', ({ progress: p }) => {
        if (progress.value.stage === 'encoding') {
          progress.value = {
            ...progress.value,
            percent: Math.round(p * 100),
            message: `Encoding video... ${Math.round(p * 100)}%`
          }
        }
      })

      // Load FFmpeg core from CDN
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      })

      ffmpeg.value = ff
      isLoaded.value = true
      error.value = null

      progress.value = {
        stage: 'idle',
        percent: 100,
        currentFrame: 0,
        totalFrames: 0,
        message: 'FFmpeg loaded successfully'
      }

      return true
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to load FFmpeg'
      error.value = errorMsg
      progress.value = {
        stage: 'error',
        percent: 0,
        currentFrame: 0,
        totalFrames: 0,
        message: errorMsg
      }
      return false
    }
  }

  /**
   * Convert SVG string to PNG data URL using Canvas
   */
  async function svgToPng(svgString: string, width: number, height: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      const img = new Image()
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert canvas to blob'))
              return
            }
            blob.arrayBuffer().then((buffer) => {
              resolve(new Uint8Array(buffer))
            })
          },
          'image/png'
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG image'))
      }

      img.src = url
    })
  }

  /**
   * Export chart animation to MP4
   */
  async function exportToMp4(
    chartOptions: ChartOptions,
    animationOptions: AnimationOptions,
    exportOptions: Partial<ExportOptions> = {}
  ): Promise<Blob | null> {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...exportOptions }

    if (isExporting.value) {
      error.value = 'Export already in progress'
      return null
    }

    isExporting.value = true
    error.value = null

    try {
      // Step 1: Load FFmpeg if not already loaded
      const loaded = await loadFFmpeg()
      if (!loaded || !ffmpeg.value) {
        throw new Error('Failed to load FFmpeg')
      }

      const ff = ffmpeg.value

      // Step 2: Generate SVG frames
      progress.value = {
        stage: 'generating-frames',
        percent: 0,
        currentFrame: 0,
        totalFrames: getFrameCount(animationOptions),
        message: 'Generating animation frames...'
      }

      // Override animation fps with export fps
      const exportAnimOptions = {
        ...animationOptions,
        fps: opts.fps
      }

      const svgFrames = generateAnimationFrames(chartOptions, exportAnimOptions, {
        width: opts.width,
        height: opts.height
      })
      const totalFrames = svgFrames.length

      progress.value = {
        ...progress.value,
        totalFrames,
        message: `Generated ${totalFrames} frames`
      }

      // Step 3: Convert SVG frames to PNG
      progress.value = {
        ...progress.value,
        stage: 'converting-to-png',
        message: 'Converting frames to PNG...'
      }

      for (let i = 0; i < svgFrames.length; i++) {
        const pngData = await svgToPng(svgFrames[i], opts.width, opts.height)
        const fileName = `frame${i.toString().padStart(5, '0')}.png`
        await ff.writeFile(fileName, pngData)

        progress.value = {
          ...progress.value,
          currentFrame: i + 1,
          percent: Math.round(((i + 1) / totalFrames) * 100),
          message: `Converting frame ${i + 1}/${totalFrames}`
        }
      }

      // Step 4: Encode to MP4
      progress.value = {
        stage: 'encoding',
        percent: 0,
        currentFrame: totalFrames,
        totalFrames,
        message: 'Encoding video...'
      }

      const crf = QUALITY_CRF[opts.quality]

      await ff.exec([
        '-framerate', opts.fps.toString(),
        '-i', 'frame%05d.png',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', crf.toString(),
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      ])

      // Step 5: Read output file
      const data = await ff.readFile('output.mp4')
      const videoBlob = new Blob([data], { type: 'video/mp4' })

      // Cleanup: remove all frame files
      for (let i = 0; i < svgFrames.length; i++) {
        const fileName = `frame${i.toString().padStart(5, '0')}.png`
        await ff.deleteFile(fileName)
      }
      await ff.deleteFile('output.mp4')

      progress.value = {
        stage: 'done',
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        message: 'Export complete!'
      }

      return videoBlob
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Export failed'
      error.value = errorMsg
      progress.value = {
        stage: 'error',
        percent: 0,
        currentFrame: 0,
        totalFrames: 0,
        message: errorMsg
      }
      return null
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Download video blob as file
   */
  function downloadVideo(blob: Blob, filename: string = 'chart-animation.mp4') {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Reset progress state
   */
  function reset() {
    progress.value = {
      stage: 'idle',
      percent: 0,
      currentFrame: 0,
      totalFrames: 0,
      message: ''
    }
    error.value = null
  }

  return {
    // State
    isLoaded,
    isExporting,
    isSupported,
    progress,
    error,

    // Actions
    loadFFmpeg,
    exportToMp4,
    downloadVideo,
    reset
  }
}

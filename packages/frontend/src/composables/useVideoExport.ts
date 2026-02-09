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

// Quality presets for FFmpeg (CRF + encoding speed preset)
const QUALITY_PRESETS: Record<ExportOptions['quality'], { crf: number; preset: string }> = {
  low: { crf: 28, preset: 'ultrafast' },
  medium: { crf: 23, preset: 'veryfast' },
  high: { crf: 18, preset: 'fast' }
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

  // Cache for converted image data URLs (to avoid re-fetching for each frame)
  const imageDataUrlCache = new Map<string, string>()

  /**
   * Convert an image URL to a Base64 data URL (with caching)
   */
  async function imageUrlToDataUrl(url: string): Promise<string> {
    const cached = imageDataUrlCache.get(url)
    if (cached) return cached

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        // Scale down to max 1920px for export (no need for full resolution)
        const maxDim = 1920
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        // JPEG is ~10-20x smaller than PNG as base64 — critical for SVG embedding
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        imageDataUrlCache.set(url, dataUrl)
        resolve(dataUrl)
      }

      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`))
      }

      img.src = url
    })
  }

  /**
   * Embed external images in SVG as Base64 data URLs
   */
  async function embedImagesInSvg(svgString: string): Promise<string> {
    // Find all image elements with href or xlink:href
    const imageRegex = /<image[^>]*(?:href|xlink:href)="([^"]+)"[^>]*>/gi
    const matches = [...svgString.matchAll(imageRegex)]

    if (matches.length === 0) {
      return svgString
    }

    let result = svgString

    for (const match of matches) {
      const fullMatch = match[0]
      const imageUrl = match[1]

      // Skip if already a data URL
      if (imageUrl.startsWith('data:')) {
        continue
      }

      try {
        const dataUrl = await imageUrlToDataUrl(imageUrl)
        // Replace the URL in the image tag
        const newImageTag = fullMatch.replace(imageUrl, dataUrl)
        result = result.replace(fullMatch, newImageTag)
      } catch (e) {
        console.warn('Failed to embed image:', imageUrl, e)
        // Continue without embedding this image
      }
    }

    return result
  }

  // Reusable canvas for frame rendering (avoids creating/destroying per frame)
  let renderCanvas: HTMLCanvasElement | null = null
  let renderCtx: CanvasRenderingContext2D | null = null

  function getOrCreateCanvas(width: number, height: number): CanvasRenderingContext2D {
    if (!renderCanvas || renderCanvas.width !== width || renderCanvas.height !== height) {
      renderCanvas = document.createElement('canvas')
      renderCanvas.width = width
      renderCanvas.height = height
      renderCtx = renderCanvas.getContext('2d')
    }
    return renderCtx!
  }

  /**
   * Convert SVG string to JPEG image data using a reusable Canvas.
   * JPEG is ~3-5x faster than PNG for intermediate frames.
   */
  async function svgToImage(svgString: string, width: number, height: number): Promise<Uint8Array> {
    // Embed any external images as data URLs (cached after first call)
    const embeddedSvg = await embedImagesInSvg(svgString)

    return new Promise((resolve, reject) => {
      const ctx = getOrCreateCanvas(width, height)
      ctx.clearRect(0, 0, width, height)

      const img = new Image()
      const svgBlob = new Blob([embeddedSvg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)

        renderCanvas!.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert canvas to blob'))
              return
            }
            blob.arrayBuffer().then((buffer) => {
              resolve(new Uint8Array(buffer))
            })
          },
          'image/jpeg',
          0.92
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
        const imgData = await svgToImage(svgFrames[i], opts.width, opts.height)
        const fileName = `frame${i.toString().padStart(5, '0')}.jpg`
        await ff.writeFile(fileName, imgData)

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

      const { crf, preset } = QUALITY_PRESETS[opts.quality]

      await ff.exec([
        '-framerate', opts.fps.toString(),
        '-i', 'frame%05d.jpg',
        '-c:v', 'libx264',
        '-preset', preset,
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
        const fileName = `frame${i.toString().padStart(5, '0')}.jpg`
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
      imageDataUrlCache.clear()
      renderCanvas = null
      renderCtx = null
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

  // Cancellation flag
  let cancelRequested = false

  /**
   * Cancel ongoing export
   */
  function cancelExport() {
    cancelRequested = true
    isExporting.value = false
    imageDataUrlCache.clear() // Clear image cache
    progress.value = {
      stage: 'idle',
      percent: 0,
      currentFrame: 0,
      totalFrames: 0,
      message: 'Export cancelled'
    }
  }

  /**
   * Export video using a render callback function
   * This API allows the caller to provide custom frame rendering logic
   */
  interface ExportVideoOptions {
    width: number
    height: number
    fps: number
    quality?: 'low' | 'medium' | 'high'
    durationMs: number
    filename: string
    renderFrame: (progress: number) => string
  }

  async function exportVideo(options: ExportVideoOptions): Promise<void> {
    const { width, height, fps, quality = 'high', durationMs, filename, renderFrame } = options

    if (isExporting.value) {
      error.value = 'Export already in progress'
      return
    }

    isExporting.value = true
    cancelRequested = false
    error.value = null

    try {
      // Step 1: Load FFmpeg if not already loaded
      const loaded = await loadFFmpeg()
      if (!loaded || !ffmpeg.value) {
        throw new Error('Failed to load FFmpeg')
      }

      if (cancelRequested) return

      const ff = ffmpeg.value

      // Calculate total frames
      const totalFrames = Math.ceil((durationMs / 1000) * fps) + 1

      // Pre-warm: embed external images (e.g. background) into cache
      // so the first frame doesn't pay the full fetch + encode cost
      progress.value = {
        stage: 'converting-to-png',
        percent: 0,
        currentFrame: 0,
        totalFrames,
        message: 'Preparing images...'
      }
      const firstSvg = renderFrame(0)
      await embedImagesInSvg(firstSvg)

      if (cancelRequested) return

      // Step 2: Generate and convert frames
      progress.value = {
        ...progress.value,
        message: 'Rendering frames...'
      }

      for (let i = 0; i < totalFrames; i++) {
        if (cancelRequested) return

        const frameProgress = i / (totalFrames - 1)
        const svgString = renderFrame(frameProgress)

        const imgData = await svgToImage(svgString, width, height)
        const fileName = `frame${i.toString().padStart(5, '0')}.jpg`
        await ff.writeFile(fileName, imgData)

        progress.value = {
          ...progress.value,
          currentFrame: i + 1,
          percent: Math.round(((i + 1) / totalFrames) * 100),
          message: `Rendering frame ${i + 1}/${totalFrames}`
        }
      }

      if (cancelRequested) return

      // Step 3: Encode to MP4
      progress.value = {
        stage: 'encoding',
        percent: 0,
        currentFrame: totalFrames,
        totalFrames,
        message: 'Encoding video...'
      }

      const { crf, preset } = QUALITY_PRESETS[quality]

      await ff.exec([
        '-framerate', fps.toString(),
        '-i', 'frame%05d.jpg',
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf.toString(),
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      ])

      if (cancelRequested) return

      // Step 4: Read output file and download
      const data = await ff.readFile('output.mp4')
      const videoBlob = new Blob([data], { type: 'video/mp4' })

      // Download the video
      downloadVideo(videoBlob, filename)

      // Cleanup: remove all frame files
      for (let i = 0; i < totalFrames; i++) {
        const fileName = `frame${i.toString().padStart(5, '0')}.jpg`
        try {
          await ff.deleteFile(fileName)
        } catch {
          // Ignore cleanup errors
        }
      }
      try {
        await ff.deleteFile('output.mp4')
      } catch {
        // Ignore cleanup errors
      }

      progress.value = {
        stage: 'done',
        percent: 100,
        currentFrame: totalFrames,
        totalFrames,
        message: 'Export complete!'
      }
    } catch (e) {
      if (cancelRequested) return

      const errorMsg = e instanceof Error ? e.message : 'Export failed'
      error.value = errorMsg
      progress.value = {
        stage: 'error',
        percent: 0,
        currentFrame: 0,
        totalFrames: 0,
        message: errorMsg
      }
    } finally {
      isExporting.value = false
      imageDataUrlCache.clear()
      renderCanvas = null
      renderCtx = null
    }
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
    exportVideo,
    downloadVideo,
    cancelExport,
    reset
  }
}

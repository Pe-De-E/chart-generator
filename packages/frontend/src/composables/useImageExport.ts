import { ref } from 'vue'
import { embedImagesInSvg } from './useVideoExport'

export function useImageExport() {
  const isExporting = ref(false)

  async function exportFrame(
    svgString: string,
    width: number,
    height: number,
    filename: string,
  ): Promise<void> {
    if (isExporting.value || !svgString) return
    isExporting.value = true
    try {
      const embedded = await embedImagesInSvg(svgString)
      const blob = await svgToPngBlob(embedded, width, height)
      triggerDownload(blob, `${filename}.png`)
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportFrame }
}

async function svgToPngBlob(svgString: string, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve()
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG konnte nicht geladen werden'))
    }
    img.src = url
  })

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob fehlgeschlagen')),
      'image/png',
    )
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

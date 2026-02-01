import type { ElevationThemeTokens } from '@chart-generator/shared'

export interface SystemElevationThemeDefinition {
  id: string
  name: string
  description: string
  preview: string
  tokens: ElevationThemeTokens
}

export const SYSTEM_ELEVATION_THEMES: SystemElevationThemeDefinition[] = [
  {
    id: 'system-dark',
    name: 'Dark',
    description: 'Dunkles Theme mit Gradient',
    preview: 'linear-gradient(180deg, #000 0%, #302b63 50%, #000 100%)',
    tokens: {
      curve: {
        color: '#ffffff',
        strokeWidth: 6,
      },
      marker: {
        size: 6,
        color: '#ffffff',
        show: true,
      },
      background: {
        type: 'gradient',
        color: '#000000',
        gradientColor: '#302b63',
        meshColors: ['#667eea', '#764ba2', '#f093fb'],
      },
      labels: {
        elevationColor: '#ffffffb3',
        distanceColor: '#ffffffb3',
        showElevation: false,
        showDistance: false,
      },
      pattern: {
        color: '#ffffff',
        opacity: 0.1,
      },
      animation: {
        duration: 5,
        easing: 'ease-in-out',
      },
    },
  },
  {
    id: 'system-minimal',
    name: 'Minimal',
    description: 'Hell und clean',
    preview: '#f8fafc',
    tokens: {
      curve: {
        color: '#374151',
        strokeWidth: 4,
      },
      marker: {
        size: 5,
        color: '#374151',
        show: true,
      },
      background: {
        type: 'solid',
        color: '#f8fafc',
        gradientColor: '#e5e7eb',
        meshColors: ['#d1d5db', '#9ca3af', '#6b7280'],
      },
      labels: {
        elevationColor: '#6b7280',
        distanceColor: '#6b7280',
        showElevation: true,
        showDistance: true,
      },
      pattern: {
        color: '#d1d5db',
        opacity: 0.3,
      },
      animation: {
        duration: 5,
        easing: 'ease-in-out',
      },
    },
  },
  {
    id: 'system-bold',
    name: 'Bold',
    description: 'Kontraststark mit Orange',
    preview: 'linear-gradient(180deg, #1a1a1a 0%, #FF6B35 100%)',
    tokens: {
      curve: {
        color: '#FF6B35',
        strokeWidth: 8,
      },
      marker: {
        size: 8,
        color: '#ffffff',
        show: true,
      },
      background: {
        type: 'solid',
        color: '#1a1a1a',
        gradientColor: '#FF6B35',
        meshColors: ['#FF6B35', '#F7931E', '#FDB833'],
      },
      labels: {
        elevationColor: '#ffffff',
        distanceColor: '#ffffff',
        showElevation: true,
        showDistance: true,
      },
      pattern: {
        color: '#FF6B35',
        opacity: 0.15,
      },
      animation: {
        duration: 4,
        easing: 'ease-out',
      },
    },
  },
  {
    id: 'system-neon',
    name: 'Neon',
    description: 'Cyberpunk mit Neonfarben',
    preview: 'linear-gradient(135deg, #000 0%, #00ff00 50%, #ff00ff 100%)',
    tokens: {
      curve: {
        color: '#00ff00',
        strokeWidth: 5,
      },
      marker: {
        size: 7,
        color: '#00ffff',
        show: true,
      },
      background: {
        type: 'mesh',
        color: '#0a0a0a',
        gradientColor: '#001a00',
        meshColors: ['#00ff00', '#ff00ff', '#00ffff'],
      },
      labels: {
        elevationColor: '#00ff00cc',
        distanceColor: '#00ffffcc',
        showElevation: true,
        showDistance: true,
      },
      pattern: {
        color: '#00ff00',
        opacity: 0.2,
      },
      animation: {
        duration: 3,
        easing: 'linear',
      },
    },
  },
  {
    id: 'system-sunset',
    name: 'Sunset',
    description: 'Warme Sonnenuntergang-Farben',
    preview: 'linear-gradient(180deg, #1a1a2e 0%, #ff6b6b 50%, #feca57 100%)',
    tokens: {
      curve: {
        color: '#feca57',
        strokeWidth: 6,
      },
      marker: {
        size: 6,
        color: '#ffffff',
        show: true,
      },
      background: {
        type: 'mesh',
        color: '#1a1a2e',
        gradientColor: '#ff6b6b',
        meshColors: ['#ff6b6b', '#ff9f43', '#feca57'],
      },
      labels: {
        elevationColor: '#feca57cc',
        distanceColor: '#ff9f43cc',
        showElevation: false,
        showDistance: false,
      },
      pattern: {
        color: '#feca57',
        opacity: 0.1,
      },
      animation: {
        duration: 6,
        easing: 'ease-in-out',
      },
    },
  },
]

import type { ChartPresetConfig } from '@chart-generator/shared'

export interface SystemChartPresetDefinition {
  id: string
  name: string
  config: ChartPresetConfig
}

// Default statistical overlays (all disabled)
const defaultStatisticalOverlays = {
  showMean: false,
  showMedian: false,
  showStdDev: false,
  showMinMax: false,
  showQuartiles: false,
  showCustomRange: false,
  customRangeMin: 0,
  customRangeMax: 100,
  showZScore: false,
  zScoreThreshold: 2,
  color: '#E53935',
  colors: {
    mean: '#E53935',
    median: '#8E24AA',
    stdDev: '#FB8C00',
    minMax: '#43A047',
    quartiles: '#1E88E5',
    customRange: '#00ACC1',
    zScore: '#F4511E',
  },
}

export const SYSTEM_CHART_PRESETS: SystemChartPresetDefinition[] = [
  {
    id: 'system-corporate-blue',
    name: 'Corporate Blue',
    config: {
      colors: {
        background: '#FFFFFF',
        series: ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'],
      },
      statisticalOverlays: {
        ...defaultStatisticalOverlays,
        colors: {
          mean: '#1E3A8A',
          median: '#3B82F6',
          stdDev: '#60A5FA',
          minMax: '#93C5FD',
          quartiles: '#BFDBFE',
          customRange: '#1E40AF',
          zScore: '#1E3A8A',
        },
      },
    },
  },
  {
    id: 'system-minimalist',
    name: 'Minimalistisch',
    config: {
      colors: {
        background: '#FAFAFA',
        series: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
      },
      statisticalOverlays: {
        ...defaultStatisticalOverlays,
        colors: {
          mean: '#374151',
          median: '#6B7280',
          stdDev: '#9CA3AF',
          minMax: '#D1D5DB',
          quartiles: '#E5E7EB',
          customRange: '#4B5563',
          zScore: '#374151',
        },
      },
    },
  },
  {
    id: 'system-presentation',
    name: 'Praesentation',
    config: {
      colors: {
        background: '#FFFFFF',
        series: ['#DC2626', '#EA580C', '#F59E0B', '#10B981', '#3B82F6'],
      },
      statisticalOverlays: {
        ...defaultStatisticalOverlays,
        colors: {
          mean: '#DC2626',
          median: '#EA580C',
          stdDev: '#F59E0B',
          minMax: '#10B981',
          quartiles: '#3B82F6',
          customRange: '#7C3AED',
          zScore: '#DC2626',
        },
      },
    },
  },
  {
    id: 'system-dark-mode',
    name: 'Dark Mode',
    config: {
      colors: {
        background: '#1F2937',
        series: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'],
      },
      statisticalOverlays: {
        ...defaultStatisticalOverlays,
        colors: {
          mean: '#60A5FA',
          median: '#34D399',
          stdDev: '#FBBF24',
          minMax: '#F87171',
          quartiles: '#A78BFA',
          customRange: '#2DD4BF',
          zScore: '#60A5FA',
        },
      },
      styleOverrides: {
        title: { color: '#F3F4F6' },
        xAxis: {
          labels: { color: '#9CA3AF' },
          gridLines: { color: '#374151' },
        },
        yAxis: {
          labels: { color: '#9CA3AF' },
          gridLines: { color: '#374151' },
        },
      },
    },
  },
]

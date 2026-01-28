import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// UI Redesign: Warm & Soft Theme (inspiriert von UI_Inspo.jpg)
// Warme Beige-Töne, Pastellfarben, einladende Ästhetik

export default createVuetify({
  components,
  directives,
  defaults: {
    // Globale Rundungen - KEINE Pill-Shapes
    VBtn: { rounded: 'lg' },
    VCard: { rounded: 'lg' },
    VTextField: { rounded: 'lg' },
    VSelect: { rounded: 'lg' },
    VAutocomplete: { rounded: 'lg' },
    VCombobox: { rounded: 'lg' },
    VFileInput: { rounded: 'lg' },
    VTextarea: { rounded: 'lg' },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VExpansionPanels: { rounded: 'lg' },
    VExpansionPanel: { rounded: 'lg' },
    VMenu: { rounded: 'lg' },
    VList: { rounded: 'lg' },
    VDialog: { rounded: 'xl' },
    VSnackbar: { rounded: 'lg' },
    VProgressLinear: { rounded: 'lg' },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          // Primary: Warmes Teal (wie im Inspo)
          primary: '#2D8B7A',
          'primary-darken-1': '#247A6A',

          // Secondary: Sanftes Rosa
          secondary: '#E8A0BF',
          'secondary-darken-1': '#D988AB',

          // Accent: Warmes Gelb/Gold
          accent: '#F2C94C',

          // Warme Backgrounds
          background: '#F7F4EF',
          surface: '#FFFFFF',
          'surface-variant': '#F0EBE3',
          'surface-bright': '#FFFCF7',

          // Semantic (sanftere Töne)
          success: '#7BC47F',
          warning: '#F2C94C',
          error: '#E57373',
          info: '#7EB8DA',

          // Text
          'on-background': '#2D2A26',
          'on-surface': '#2D2A26',
          'on-surface-variant': '#6B6560',
          'on-primary': '#FFFFFF',
          'on-secondary': '#2D2A26',
        }
      },
      dark: {
        dark: true,
        colors: {
          // Primary: Teal (heller für Dark Mode)
          primary: '#4ECDC4',
          'primary-darken-1': '#3DBDB5',

          // Secondary: Sanftes Rosa
          secondary: '#F0B8D0',
          'secondary-darken-1': '#E8A0BF',

          // Accent
          accent: '#F2C94C',

          // Dark Backgrounds (warm-getönt)
          background: '#1A1918',
          surface: '#252422',
          'surface-variant': '#302D2A',
          'surface-bright': '#3D3935',

          // Semantic
          success: '#7BC47F',
          warning: '#F2C94C',
          error: '#E57373',
          info: '#7EB8DA',

          // Text
          'on-background': '#F5F2ED',
          'on-surface': '#F5F2ED',
          'on-surface-variant': '#A8A29E',
          'on-primary': '#1A1918',
          'on-secondary': '#1A1918',
        }
      }
    }
  }
})

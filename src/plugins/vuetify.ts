import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#4F46E5',
          secondary: '#818CF8',
          accent: '#EC4899',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#6366F1',
          secondary: '#A5B4FC',
          accent: '#F472B6',
          background: '#1E1E1E',
          surface: '#2D2D2D',
        }
      }
    }
  }
})

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
          primary: '#00796B',
          secondary: '#0277BD',
          accent: '#FF6F00',
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: '#00897B',
          secondary: '#0288D1',
          accent: '#FF8F00',
          background: '#1E1E1E',
          surface: '#2D2D2D',
        }
      }
    }
  }
})

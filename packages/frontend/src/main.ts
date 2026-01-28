import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import { useAuth } from './composables/useAuth'

// UI Redesign: Global Styles
import './styles/variables.scss'

const app = createApp(App)

app.use(vuetify)
app.use(router)

// TODO root mit @ konfigurieren

// Initialize auth state before mounting
const { init } = useAuth()
init().then(() => {
  app.mount('#app')
})

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'
import { useAuthStore } from './stores/useAuthStore'

// UI Redesign: Global Styles
import './styles/variables.scss'

const app = createApp(App)

app.use(createPinia())
app.use(vuetify)
app.use(router)

// TODO root mit @ konfigurieren

// Initialize auth state before mounting
const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})

import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/useAuthStore'

// Import views
import LandingPage from '../views/LandingPage.vue'
import Home from '../views/Home/Home.vue'
import ChartGenerator from '../components/ChartGenerator.vue'
import Login from '../views/Login/Login.vue'
import Signup from '../views/Signup.vue'
import AdminDashboard from '../views/adminDashboard/AdminDashboard.vue'
import LegalPage from '../views/LegalPage.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Landing',
    component: LandingPage,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/generator',
    name: 'Generator',
    component: ChartGenerator,
    meta: { requiresAuth: true },
  },
  {
    path: '/elevation',
    redirect: '/gpx?mode=route-map',
  },
  {
    path: '/gpx',
    name: 'GPX',
    component: () => import('../components/GPXGenerator.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/route-map',
    redirect: '/gpx?mode=route-map',
  },
  {
    path: '/terrain',
    redirect: '/gpx?mode=terrain',
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: Signup,
    meta: { requiresGuest: true },
  },
  {
    path: '/impressum',
    name: 'Impressum',
    component: LegalPage,
  },
  {
    path: '/datenschutz',
    name: 'Datenschutz',
    component: LegalPage,
  },
  {
    path: '/agb',
    name: 'AGB',
    component: LegalPage,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard to protect routes
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // Wait for auth initialization to complete
  if (!authStore.isInitialized) {
    await authStore.init()
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
    return
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Dashboard' })
    return
  }

  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router

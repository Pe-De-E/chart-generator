import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuth } from '../composables/useAuth'

// Import views
import Home from '../views/Home/Home.vue'
import ChartGenerator from '../components/ChartGenerator.vue'
import Login from '../views/Login/Login.vue'
import Signup from '../views/Signup.vue'
import AdminDashboard from '../views/adminDashboard/AdminDashboard.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard to protect routes
router.beforeEach(async (to, _from, next) => {
  const { isAuthenticated, isAdmin, isInitialized, init } = useAuth()

  // Wait for auth initialization to complete
  if (!isInitialized.value) {
    await init()
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login' })
    return
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin && !isAdmin.value) {
    next({ name: 'Home' })
    return
  }

  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next({ name: 'Home' })
    return
  }

  next()
})

export default router

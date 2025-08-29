import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';

// Import components
import Home from '../pages/Home.vue';
import Login from '../pages/auth/Login.vue';
import Register from '../pages/auth/Register.vue';
import ForgotPassword from '../pages/auth/ForgotPassword.vue';
import ResetPassword from '../pages/auth/ResetPassword.vue';
import Dashboard from '../pages/Dashboard.vue';
import Profile from '../pages/Profile.vue';
import Payments from '../pages/Payments.vue';
import PaymentSuccess from '../pages/PaymentSuccess.vue';
import PaymentCancel from '../pages/PaymentCancel.vue';
import Notifications from '../pages/Notifications.vue';
import NotFound from '../pages/NotFound.vue';

// Define routes
const routes = [
    {
        path: '/',
        name: 'home',
        component: Home,
        meta: {
            title: 'Home',
            requiresAuth: false,
        },
    },
    {
        path: '/login',
        name: 'login',
        component: Login,
        meta: {
            title: 'Login',
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/register',
        name: 'register',
        component: Register,
        meta: {
            title: 'Register',
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/forgot-password',
        name: 'forgot-password',
        component: ForgotPassword,
        meta: {
            title: 'Forgot Password',
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/reset-password',
        name: 'reset-password',
        component: ResetPassword,
        meta: {
            title: 'Reset Password',
            requiresAuth: false,
            guestOnly: true,
        },
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: Dashboard,
        meta: {
            title: 'Dashboard',
            requiresAuth: true,
        },
    },
    {
        path: '/profile',
        name: 'profile',
        component: Profile,
        meta: {
            title: 'Profile',
            requiresAuth: true,
        },
    },
    {
        path: '/payments',
        name: 'payments',
        component: Payments,
        meta: {
            title: 'Payments',
            requiresAuth: true,
        },
    },
    {
        path: '/payment/success',
        name: 'payment-success',
        component: PaymentSuccess,
        meta: {
            title: 'Payment Success',
            requiresAuth: true,
        },
    },
    {
        path: '/payment/cancel',
        name: 'payment-cancel',
        component: PaymentCancel,
        meta: {
            title: 'Payment Cancelled',
            requiresAuth: true,
        },
    },
    {
        path: '/notifications',
        name: 'notifications',
        component: Notifications,
        meta: {
            title: 'Notifications',
            requiresAuth: true,
        },
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: NotFound,
        meta: {
            title: 'Page Not Found',
            requiresAuth: false,
        },
    },
];

// Create router
const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0 };
        }
    },
});

// Navigation guards
router.beforeEach(async (to, from, next) => {
    // Set page title
    document.title = to.meta.title ? `${to.meta.title} - Money Maker Platform` : 'Money Maker Platform';
    
    // Check if route requires authentication
    if (to.meta.requiresAuth) {
        const token = localStorage.getItem('jwt_token');
        
        if (!token) {
            // No token, redirect to login
            next({
                name: 'login',
                query: { redirect: to.fullPath },
            });
            return;
        }
        
        // Check if user is loaded in store
        if (!store.getters['auth/isAuthenticated']) {
            try {
                // Try to load user from token
                await store.dispatch('auth/loadUser');
            } catch (error) {
                // Token is invalid, redirect to login
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user');
                next({
                    name: 'login',
                    query: { redirect: to.fullPath },
                });
                return;
            }
        }
    }
    
    // Check if route is for guests only
    if (to.meta.guestOnly) {
        const token = localStorage.getItem('jwt_token');
        
        if (token && store.getters['auth/isAuthenticated']) {
            // User is authenticated, redirect to dashboard
            next({ name: 'dashboard' });
            return;
        }
    }
    
    next();
});

// After navigation
router.afterEach((to, from) => {
    // Track page views if analytics is available
    if (window.gtag) {
        window.gtag('config', 'GA_MEASUREMENT_ID', {
            page_path: to.path,
        });
    }
    
    // Update breadcrumbs if needed
    store.dispatch('ui/updateBreadcrumbs', to);
});

export default router;
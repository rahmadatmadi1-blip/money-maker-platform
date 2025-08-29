import axios from 'axios';
import moment from 'moment';
import Swal from 'sweetalert2';

// Configure axios
window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.headers.common['Accept'] = 'application/json';
window.axios.defaults.headers.common['Content-Type'] = 'application/json';

// Set base URL
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
window.axios.defaults.baseURL = baseURL;

// Request interceptor
window.axios.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            config.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
window.axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle common errors
        if (error.response) {
            const { status, data } = error.response;
            
            switch (status) {
                case 401:
                    // Unauthorized - redirect to login
                    localStorage.removeItem('jwt_token');
                    localStorage.removeItem('user');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    break;
                    
                case 403:
                    // Forbidden
                    Swal.fire({
                        icon: 'error',
                        title: 'Access Denied',
                        text: 'You do not have permission to perform this action.',
                    });
                    break;
                    
                case 404:
                    // Not found
                    console.error('Resource not found:', error.config.url);
                    break;
                    
                case 422:
                    // Validation errors
                    if (data.errors) {
                        const errorMessages = Object.values(data.errors).flat();
                        Swal.fire({
                            icon: 'error',
                            title: 'Validation Error',
                            html: errorMessages.join('<br>'),
                        });
                    }
                    break;
                    
                case 429:
                    // Rate limit exceeded
                    Swal.fire({
                        icon: 'warning',
                        title: 'Rate Limit Exceeded',
                        text: 'Too many requests. Please try again later.',
                    });
                    break;
                    
                case 500:
                    // Server error
                    Swal.fire({
                        icon: 'error',
                        title: 'Server Error',
                        text: 'An internal server error occurred. Please try again later.',
                    });
                    break;
                    
                default:
                    // Other errors
                    const message = data.message || 'An unexpected error occurred';
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: message,
                    });
            }
        } else if (error.request) {
            // Network error
            Swal.fire({
                icon: 'error',
                title: 'Network Error',
                text: 'Unable to connect to the server. Please check your internet connection.',
            });
        }
        
        return Promise.reject(error);
    }
);

// Configure moment
window.moment = moment;
moment.locale('en');

// Configure SweetAlert2
window.Swal = Swal;
Swal.mixin({
    customClass: {
        confirmButton: 'btn btn-primary mx-2',
        cancelButton: 'btn btn-secondary mx-2'
    },
    buttonsStyling: false
});

// Global utilities
window.formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

window.formatDate = (date, format = 'YYYY-MM-DD') => {
    return moment(date).format(format);
};

window.formatRelativeTime = (date) => {
    return moment(date).fromNow();
};

window.debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

window.throttle = (func, limit) => {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Service Worker registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Performance monitoring
if (import.meta.env.PROD) {
    // Monitor page load performance
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }
        }, 0);
    });
}

// Error tracking
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    
    // Send to monitoring service if available
    if (window.Sentry) {
        window.Sentry.captureException(event.error);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // Send to monitoring service if available
    if (window.Sentry) {
        window.Sentry.captureException(event.reason);
    }
});
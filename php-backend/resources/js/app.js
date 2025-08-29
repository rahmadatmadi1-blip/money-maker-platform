import './bootstrap';
import { createApp } from 'vue';
import router from './router';
import store from './store';
import App from './components/App.vue';
import './plugins';

// Global components
import LoadingSpinner from './components/common/LoadingSpinner.vue';
import ErrorMessage from './components/common/ErrorMessage.vue';
import SuccessMessage from './components/common/SuccessMessage.vue';
import Modal from './components/common/Modal.vue';
import Pagination from './components/common/Pagination.vue';

// Create Vue app
const app = createApp(App);

// Register global components
app.component('LoadingSpinner', LoadingSpinner);
app.component('ErrorMessage', ErrorMessage);
app.component('SuccessMessage', SuccessMessage);
app.component('Modal', Modal);
app.component('Pagination', Pagination);

// Use plugins
app.use(router);
app.use(store);

// Global properties
app.config.globalProperties.$api = window.axios;
app.config.globalProperties.$moment = window.moment;

// Error handler
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue Error:', err);
    console.error('Component:', instance);
    console.error('Info:', info);
    
    // Send error to monitoring service if available
    if (window.Sentry) {
        window.Sentry.captureException(err);
    }
};

// Mount app
app.mount('#app');

// Hot Module Replacement
if (import.meta.hot) {
    import.meta.hot.accept();
}
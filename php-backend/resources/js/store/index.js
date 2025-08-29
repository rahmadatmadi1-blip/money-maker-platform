import { createStore } from 'vuex';
import auth from './modules/auth';
import ui from './modules/ui';
import payments from './modules/payments';
import notifications from './modules/notifications';

const store = createStore({
    modules: {
        auth,
        ui,
        payments,
        notifications,
    },
    
    state: {
        loading: false,
        error: null,
        success: null,
    },
    
    mutations: {
        SET_LOADING(state, loading) {
            state.loading = loading;
        },
        
        SET_ERROR(state, error) {
            state.error = error;
        },
        
        SET_SUCCESS(state, success) {
            state.success = success;
        },
        
        CLEAR_MESSAGES(state) {
            state.error = null;
            state.success = null;
        },
    },
    
    actions: {
        setLoading({ commit }, loading) {
            commit('SET_LOADING', loading);
        },
        
        setError({ commit }, error) {
            commit('SET_ERROR', error);
            setTimeout(() => {
                commit('SET_ERROR', null);
            }, 5000);
        },
        
        setSuccess({ commit }, success) {
            commit('SET_SUCCESS', success);
            setTimeout(() => {
                commit('SET_SUCCESS', null);
            }, 5000);
        },
        
        clearMessages({ commit }) {
            commit('CLEAR_MESSAGES');
        },
    },
    
    getters: {
        isLoading: (state) => state.loading,
        error: (state) => state.error,
        success: (state) => state.success,
    },
    
    strict: import.meta.env.DEV,
});

export default store;
import axios from 'axios';

const state = {
    payments: [],
    paymentMethods: [],
    currentPayment: null,
    loading: false,
    pagination: {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    },
};

const mutations = {
    SET_PAYMENTS(state, { data, pagination }) {
        state.payments = data;
        state.pagination = pagination;
    },
    
    ADD_PAYMENT(state, payment) {
        state.payments.unshift(payment);
    },
    
    UPDATE_PAYMENT(state, updatedPayment) {
        const index = state.payments.findIndex(p => p.id === updatedPayment.id);
        if (index !== -1) {
            state.payments.splice(index, 1, updatedPayment);
        }
    },
    
    SET_PAYMENT_METHODS(state, methods) {
        state.paymentMethods = methods;
    },
    
    SET_CURRENT_PAYMENT(state, payment) {
        state.currentPayment = payment;
    },
    
    SET_LOADING(state, loading) {
        state.loading = loading;
    },
};

const actions = {
    async fetchPayments({ commit }, { page = 1, per_page = 10, filters = {} } = {}) {
        try {
            commit('SET_LOADING', true);
            
            const params = {
                page,
                per_page,
                ...filters,
            };
            
            const response = await axios.get('/payments', { params });
            
            if (response.data.success) {
                commit('SET_PAYMENTS', {
                    data: response.data.data.data,
                    pagination: {
                        current_page: response.data.data.current_page,
                        last_page: response.data.data.last_page,
                        per_page: response.data.data.per_page,
                        total: response.data.data.total,
                    },
                });
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch payments');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch payments';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async fetchPayment({ commit }, id) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.get(`/payments/${id}`);
            
            if (response.data.success) {
                commit('SET_CURRENT_PAYMENT', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch payment');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch payment';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async fetchPaymentMethods({ commit }) {
        try {
            const response = await axios.get('/payments/methods');
            
            if (response.data.success) {
                commit('SET_PAYMENT_METHODS', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch payment methods');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch payment methods';
            throw new Error(message);
        }
    },
    
    async processOrderPayment({ commit }, { orderId, paymentMethod, paymentData = {} }) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/payments/order', {
                order_id: orderId,
                payment_method: paymentMethod,
                ...paymentData,
            });
            
            if (response.data.success) {
                const payment = response.data.data;
                commit('ADD_PAYMENT', payment);
                
                // Handle different payment methods
                if (payment.gateway_response?.redirect_url) {
                    // Redirect to payment gateway
                    window.location.href = payment.gateway_response.redirect_url;
                } else if (payment.gateway_response?.client_secret) {
                    // Return client secret for Stripe
                    return {
                        success: true,
                        payment,
                        clientSecret: payment.gateway_response.client_secret,
                    };
                }
                
                return { success: true, payment };
            } else {
                throw new Error(response.data.message || 'Payment processing failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Payment processing failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async processServicePayment({ commit }, { serviceOrderId, paymentMethod, paymentData = {} }) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/payments/service', {
                service_order_id: serviceOrderId,
                payment_method: paymentMethod,
                ...paymentData,
            });
            
            if (response.data.success) {
                const payment = response.data.data;
                commit('ADD_PAYMENT', payment);
                
                // Handle different payment methods
                if (payment.gateway_response?.redirect_url) {
                    // Redirect to payment gateway
                    window.location.href = payment.gateway_response.redirect_url;
                } else if (payment.gateway_response?.client_secret) {
                    // Return client secret for Stripe
                    return {
                        success: true,
                        payment,
                        clientSecret: payment.gateway_response.client_secret,
                    };
                }
                
                return { success: true, payment };
            } else {
                throw new Error(response.data.message || 'Payment processing failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Payment processing failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async processContentPayment({ commit }, { contentPurchaseId, paymentMethod, paymentData = {} }) {
        try {
            commit('SET_LOADING', true);
            
            const response = await axios.post('/payments/content', {
                content_purchase_id: contentPurchaseId,
                payment_method: paymentMethod,
                ...paymentData,
            });
            
            if (response.data.success) {
                const payment = response.data.data;
                commit('ADD_PAYMENT', payment);
                
                // Handle different payment methods
                if (payment.gateway_response?.redirect_url) {
                    // Redirect to payment gateway
                    window.location.href = payment.gateway_response.redirect_url;
                } else if (payment.gateway_response?.client_secret) {
                    // Return client secret for Stripe
                    return {
                        success: true,
                        payment,
                        clientSecret: payment.gateway_response.client_secret,
                    };
                }
                
                return { success: true, payment };
            } else {
                throw new Error(response.data.message || 'Payment processing failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Payment processing failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async confirmManualPayment({ commit }, { paymentId, proofImage, notes = '' }) {
        try {
            commit('SET_LOADING', true);
            
            const formData = new FormData();
            formData.append('proof_image', proofImage);
            formData.append('notes', notes);
            
            const response = await axios.post(`/payments/${paymentId}/confirm`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            if (response.data.success) {
                const updatedPayment = response.data.data;
                commit('UPDATE_PAYMENT', updatedPayment);
                return { success: true, payment: updatedPayment };
            } else {
                throw new Error(response.data.message || 'Payment confirmation failed');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Payment confirmation failed';
            throw new Error(message);
        } finally {
            commit('SET_LOADING', false);
        }
    },
    
    async getPaymentStats({ commit }) {
        try {
            const response = await axios.get('/payments/stats');
            
            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to fetch payment stats');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to fetch payment stats';
            throw new Error(message);
        }
    },
};

const getters = {
    payments: (state) => state.payments,
    paymentMethods: (state) => state.paymentMethods,
    currentPayment: (state) => state.currentPayment,
    loading: (state) => state.loading,
    pagination: (state) => state.pagination,
    
    enabledPaymentMethods: (state) => {
        return state.paymentMethods.filter(method => method.enabled);
    },
    
    getPaymentById: (state) => (id) => {
        return state.payments.find(payment => payment.id === id);
    },
    
    getPaymentsByStatus: (state) => (status) => {
        return state.payments.filter(payment => payment.status === status);
    },
    
    totalPayments: (state) => state.pagination.total,
    
    hasNextPage: (state) => {
        return state.pagination.current_page < state.pagination.last_page;
    },
    
    hasPrevPage: (state) => {
        return state.pagination.current_page > 1;
    },
};

export default {
    namespaced: true,
    state,
    mutations,
    actions,
    getters,
};
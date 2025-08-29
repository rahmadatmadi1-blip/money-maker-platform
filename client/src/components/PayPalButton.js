import React, { useEffect, useRef, useState } from 'react';
import paypalService from '../services/paypalService';
import { useNotifications } from '../contexts/NotificationContext';
import './PayPalButton.css';

const PayPalButton = ({ 
  amount, 
  currency = 'USD', 
  type = 'order', 
  orderId = null,
  onSuccess = () => {},
  onError = () => {},
  onCancel = () => {},
  disabled = false,
  className = ''
}) => {
  const paypalRef = useRef();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!amount || amount <= 0) {
      setError('Invalid amount specified');
      setLoading(false);
      return;
    }

    if (disabled) {
      setLoading(false);
      return;
    }

    // Clear previous PayPal button
    if (paypalRef.current) {
      paypalRef.current.innerHTML = '';
    }

    const initializePayPal = async () => {
      try {
        setLoading(true);
        setError(null);

        await paypalService.createPayPalButton('paypal-button-container', {
          amount,
          currency,
          type,
          orderId,
          onSuccess: (data) => {
            addNotification('Pembayaran PayPal berhasil!', 'success');
            onSuccess(data);
          },
          onError: (err) => {
            console.error('PayPal payment error:', err);
            addNotification('Terjadi kesalahan pada pembayaran PayPal', 'error');
            setError('Payment failed. Please try again.');
            onError(err);
          },
          onCancel: (data) => {
            addNotification('Pembayaran PayPal dibatalkan', 'info');
            onCancel(data);
          }
        });

        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize PayPal:', err);
        setError('Failed to load PayPal. Please refresh and try again.');
        setLoading(false);
        addNotification('Gagal memuat PayPal', 'error');
      }
    };

    initializePayPal();

    // Cleanup function
    return () => {
      if (paypalRef.current) {
        paypalRef.current.innerHTML = '';
      }
    };
  }, [amount, currency, type, orderId, disabled, onSuccess, onError, onCancel, addNotification]);

  if (error) {
    return (
      <div className={`paypal-button-error ${className}`}>
        <div className="error-content">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button 
            className="retry-button"
            onClick={() => window.location.reload()}
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={`paypal-button-disabled ${className}`}>
        <div className="disabled-content">
          <i className="fab fa-paypal"></i>
          <p>PayPal tidak tersedia</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`paypal-button-wrapper ${className}`}>
      {loading && (
        <div className="paypal-loading">
          <div className="loading-spinner">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
          <p>Memuat PayPal...</p>
        </div>
      )}
      
      <div 
        id="paypal-button-container" 
        ref={paypalRef}
        className={loading ? 'loading' : ''}
        style={{ 
          minHeight: loading ? '150px' : 'auto',
          display: loading ? 'none' : 'block'
        }}
      />
      
      <div className="paypal-info">
        <div className="security-info">
          <i className="fas fa-shield-alt"></i>
          <span>Pembayaran aman dengan PayPal</span>
        </div>
        <div className="amount-info">
          <span>Total: {paypalService.formatCurrency(amount, currency)}</span>
        </div>
      </div>
    </div>
  );
};

export default PayPalButton;
import React, { useState } from 'react';
import './PaymentMethodSelector.css';
import PayPalButton from './PayPalButton';

const PaymentMethodSelector = ({ amount, onPaymentSuccess, onPaymentError }) => {
  const [selectedMethod, setSelectedMethod] = useState('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const paymentMethods = [
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '💳',
      description: 'Pembayaran aman dengan PayPal',
      type: 'instant'
    },
    {
      id: 'bri',
      name: 'Bank BRI',
      icon: '🏦',
      description: 'Transfer Bank BRI',
      type: 'manual',
      account: '109901076653502',
      accountName: 'Rahmad Atmadi'
    },
    {
      id: 'jago',
      name: 'Bank Jago',
      icon: '🏦',
      description: 'Transfer Bank Jago',
      type: 'manual',
      account: '101206706732',
      accountName: 'Rahmad Atmadi'
    },
    {
      id: 'dana',
      name: 'DANA',
      icon: '📱',
      description: 'E-wallet DANA',
      type: 'manual',
      account: '0895326914463',
      accountName: 'Rahmad Atmadi'
    },
    {
      id: 'ovo',
      name: 'OVO',
      icon: '📱',
      description: 'E-wallet OVO',
      type: 'manual',
      account: '0895326914463',
      accountName: 'Rahmad Atmadi'
    },
    {
      id: 'credit-card',
      name: 'Kartu Kredit/Debit',
      icon: '💳',
      description: 'Kartu kredit/debit umum',
      type: 'form'
    },
    {
      id: 'jago-credit-card',
      name: 'Kartu Bank Jago',
      icon: '💳',
      description: 'Kartu kredit/debit Bank Jago',
      type: 'form',
      cardDetails: {
        cardNumber: '4532 1234 5678 9012',
        expiryDate: '12/26',
        cvv: '123',
        cardholderName: 'Rahmad Atmadi'
      }
    }
  ];

  const selectedPaymentMethod = paymentMethods.find(method => method.id === selectedMethod);

  const handleMethodSelect = (methodId) => {
    setSelectedMethod(methodId);
    setShowAccountDetails(false);
  };

  const handleManualPayment = () => {
    setShowAccountDetails(true);
  };

  const handleConfirmPayment = async () => {
    console.log('handleConfirmPayment called with:', { selectedMethod, amount });
    
    if (!selectedMethod || !amount) {
      alert('Silakan pilih metode pembayaran dan masukkan jumlah');
      return;
    }

    if (amount < 50000) {
      alert('Jumlah minimum deposit adalah Rp 50.000');
      return;
    }

    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Token found:', !!token);
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'null');
      
      if (!token) {
        alert('Silakan login terlebih dahulu');
        setIsProcessing(false);
        return;
      }

      // Map frontend method IDs to backend method IDs
      const methodMapping = {
        'bri': 'bri_transfer',
        'jago': 'jago_transfer',
        'dana': 'dana',
        'ovo': 'ovo',
        'credit-card': 'credit_card',
        'jago-credit-card': 'jago_credit_card',
        'paypal': 'paypal'
      };
      
      const backendMethod = methodMapping[selectedMethod] || selectedMethod;
      console.log('Mapped method:', selectedMethod, '->', backendMethod);

      // Prepare payment details based on method
      let paymentDetails = {};
      
      switch (backendMethod) {
        case 'bri_transfer':
        case 'jago_transfer':
          paymentDetails = {
            accountNumber: '1234567890' // This should be collected from user input
          };
          break;
        case 'dana':
        case 'ovo':
          paymentDetails = {
            phoneNumber: '081234567890' // This should be collected from user input
          };
          break;
        case 'credit_card':
        case 'jago_credit_card':
          paymentDetails = {
            cardNumber: '4532123456789012', // This should be collected from user input
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
            cardholderName: 'John Doe'
          };
          break;
        default:
          paymentDetails = {};
      }

      const requestBody = {
        amount: parseInt(amount),
        method: backendMethod,
        currency: 'IDR',
        paymentDetails: paymentDetails
      };
      console.log('Request body:', requestBody);
      console.log('About to send fetch request to:', '/api/payments/local-payment/create');

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseURL}/api/payments/local-payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Fetch request completed');

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setCurrentPaymentId(data.paymentId);
        setPaymentDetails(data.paymentDetails);
        
        if (selectedMethod === 'credit-card' || selectedMethod === 'jago-credit-card') {
          const cardType = selectedMethod === 'jago-credit-card' ? 'Bank Jago' : 'umum';
          alert(`Pembayaran kartu kredit ${cardType} akan diproses. Silakan tunggu konfirmasi.`);
          onPaymentSuccess({
            method: selectedMethod,
            amount: amount,
            paymentId: data.paymentId,
            status: 'pending'
          });
        } else {
          setShowConfirmation(true);
        }
        
      } else {
        console.error('Payment creation failed:', data);
        alert(data.error || 'Terjadi kesalahan saat membuat pembayaran');
        if (onPaymentError) {
          onPaymentError(data.error || 'Terjadi kesalahan saat membuat pembayaran');
        }
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      alert('Terjadi kesalahan saat memproses pembayaran: ' + error.message);
      if (onPaymentError) {
        onPaymentError('Terjadi kesalahan saat memproses pembayaran');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentConfirmation = async () => {
    if (!currentPaymentId) return;
    
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseURL}/api/payments/local-payment/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: currentPaymentId,
          proofImage: '',
          notes: 'Payment confirmed by user'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        onPaymentSuccess({
          method: selectedMethod,
          amount: amount,
          paymentId: currentPaymentId,
          status: 'processing'
        });
        
        setShowConfirmation(false);
        setCurrentPaymentId(null);
        setPaymentDetails(null);
        
      } else {
        alert(data.error || 'Terjadi kesalahan saat konfirmasi pembayaran');
      }
      
    } catch (error) {
      console.error('Payment confirmation error:', error);
      alert('Terjadi kesalahan saat konfirmasi pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Nomor rekening berhasil disalin!');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  return (
    <div className="payment-method-selector">
      <div className="payment-amount">
        <h3>Total Pembayaran: {formatCurrency(amount)}</h3>
      </div>

      <div className="payment-methods-grid">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-method-card ${
              selectedMethod === method.id ? 'selected' : ''
            }`}
            onClick={() => handleMethodSelect(method.id)}
          >
            <div className="method-icon">{method.icon}</div>
            <div className="method-info">
              <h4>{method.name}</h4>
              <p>{method.description}</p>
            </div>
            {selectedMethod === method.id && (
              <div className="selected-indicator">✓</div>
            )}
          </div>
        ))}
      </div>

      <div className="payment-form">
        {selectedMethod === 'paypal' && (
          <div className="paypal-section">
            <PayPalButton
              amount={amount}
              onSuccess={onPaymentSuccess}
              onError={onPaymentError}
              onCancel={() => console.log('PayPal payment cancelled')}
            />
          </div>
        )}

        {selectedPaymentMethod?.type === 'manual' && (
          <div className="manual-payment-section">
            {!showAccountDetails ? (
              <button
                className="show-details-btn"
                onClick={handleManualPayment}
              >
                Lihat Detail Pembayaran
              </button>
            ) : (
              <div className="account-details">
                <div className="detail-card">
                  <h4>Detail Pembayaran {selectedPaymentMethod.name}</h4>
                  <div className="account-info">
                    <div className="info-row">
                      <span className="label">Nomor Rekening/HP:</span>
                      <span className="value">
                        {selectedPaymentMethod.account}
                        <button
                          className="copy-btn"
                          onClick={() => copyToClipboard(selectedPaymentMethod.account)}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Nama Penerima:</span>
                      <span className="value">{selectedPaymentMethod.accountName}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Jumlah Transfer:</span>
                      <span className="value amount">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                  
                  <div className="payment-instructions">
                    <h5>Instruksi Pembayaran:</h5>
                    <ol>
                      <li>Transfer sesuai jumlah yang tertera</li>
                      <li>Simpan bukti transfer</li>
                      <li>Klik "Konfirmasi Pembayaran" di bawah</li>
                      <li>Upload bukti transfer jika diminta</li>
                    </ol>
                  </div>

                  <button
                    className="confirm-payment-btn"
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Memproses...' : 'Buat Pembayaran'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedMethod === 'credit-card' && (
          <div className="credit-card-section">
            <div className="card-form">
              <h4>Pembayaran Kartu Kredit/Debit</h4>
              <p className="security-note">
                🔒 Untuk keamanan, pembayaran kartu kredit akan diproses melalui gateway pembayaran yang aman.
              </p>
              <button 
                className="process-card-btn"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Memproses...' : 'Lanjutkan ke Gateway Pembayaran'}
              </button>
            </div>
          </div>
        )}

        {selectedMethod === 'jago-credit-card' && (
          <div className="jago-credit-card-section">
            <div className="card-form">
              <h4>Pembayaran Kartu Bank Jago</h4>
              <div className="card-details">
                <div className="card-visual">
                  <div className="card-number">**** **** **** 9012</div>
                  <div className="card-info">
                    <span>Exp: 12/26</span>
                    <span>CVV: ***</span>
                  </div>
                  <div className="card-holder">Rahmad Atmadi</div>
                </div>
                <div className="card-instructions">
                  <h5>Detail Kartu Bank Jago:</h5>
                  <div className="detail-item">
                    <span className="label">Nomor Kartu:</span>
                    <span className="value">4532 1234 5678 9012</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard('4532123456789012')}
                    >
                      📋
                    </button>
                  </div>
                  <div className="detail-item">
                    <span className="label">Tanggal Kedaluwarsa:</span>
                    <span className="value">12/26</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">CVV:</span>
                    <span className="value">123</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Nama Pemegang:</span>
                    <span className="value">Rahmad Atmadi</span>
                  </div>
                </div>
              </div>
              <p className="security-note">
                🔒 Gunakan detail kartu di atas untuk pembayaran yang aman.
              </p>
              <button 
                className="process-card-btn"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Memproses...' : 'Proses Pembayaran Kartu Jago'}
              </button>
            </div>
          </div>
        )}

        {showConfirmation && (
          <div className="payment-confirmation">
            <div className="confirmation-card">
              <h4>Konfirmasi Pembayaran</h4>
              <p>ID Pembayaran: <strong>{currentPaymentId}</strong></p>
              <p>Apakah Anda sudah melakukan transfer sesuai dengan detail di atas?</p>
              
              <div className="confirmation-buttons">
                <button
                  className="confirm-btn"
                  onClick={handlePaymentConfirmation}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Memproses...' : 'Ya, Sudah Transfer'}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isProcessing}
                >
                  Belum
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="payment-security-info">
        <div className="security-badges">
          <span className="badge">🔒 SSL Encrypted</span>
          <span className="badge">🛡️ Secure Payment</span>
          <span className="badge">✅ Verified Merchant</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
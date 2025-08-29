// Currency formatter
export const formatCurrency = (amount, currency = 'IDR', locale = 'id-ID') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'IDR' ? 'Rp 0' : '$0.00';
  }

  const numAmount = parseFloat(amount);
  
  if (currency === 'IDR') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

// Number formatter with thousand separators
export const formatNumber = (number, locale = 'id-ID') => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  const numValue = parseFloat(number);
  
  return new Intl.NumberFormat(locale).format(numValue);
};

// Compact number formatter (1K, 1M, etc.)
export const formatCompactNumber = (number, locale = 'id-ID') => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  const numValue = parseFloat(number);
  
  if (numValue < 1000) {
    return numValue.toString();
  }
  
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(numValue);
};

// Percentage formatter
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  
  const numValue = parseFloat(value);
  return `${numValue.toFixed(decimals)}%`;
};

// File size formatter
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Date formatter
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('id-ID', defaultOptions);
};

// Time formatter
export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return dateObj.toLocaleTimeString('id-ID', defaultOptions);
};

// DateTime formatter
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return dateObj.toLocaleString('id-ID', defaultOptions);
};

// Relative time formatter (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const dateObj = new Date(date);
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Baru saja';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} hari yang lalu`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} minggu yang lalu`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan yang lalu`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} tahun yang lalu`;
};

// Duration formatter (e.g., "2h 30m")
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  const parts = [];
  
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}d`);
  
  return parts.join(' ');
};

// Phone number formatter
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Indonesian phone number format
  if (cleaned.startsWith('62')) {
    // International format: +62 xxx xxxx xxxx
    const match = cleaned.match(/^(62)(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
  } else if (cleaned.startsWith('0')) {
    // Local format: 0xxx xxxx xxxx
    const match = cleaned.match(/^(0\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
  }
  
  return phoneNumber;
};

// Text truncation
export const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
};

// Capitalize first letter
export const capitalize = (text) => {
  if (!text) return '';
  
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Title case formatter
export const toTitleCase = (text) => {
  if (!text) return '';
  
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// URL formatter
export const formatUrl = (url) => {
  if (!url) return '';
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  
  return url;
};

// Social media handle formatter
export const formatSocialHandle = (handle, platform = 'instagram') => {
  if (!handle) return '';
  
  const cleaned = handle.replace(/^@/, '');
  
  switch (platform.toLowerCase()) {
    case 'instagram':
      return `@${cleaned}`;
    case 'twitter':
      return `@${cleaned}`;
    case 'tiktok':
      return `@${cleaned}`;
    case 'youtube':
      return cleaned;
    default:
      return `@${cleaned}`;
  }
};

// Order status formatter
export const formatOrderStatus = (status) => {
  const statusMap = {
    'pending': 'Menunggu',
    'processing': 'Diproses',
    'shipped': 'Dikirim',
    'delivered': 'Terkirim',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan',
    'refunded': 'Dikembalikan'
  };
  
  return statusMap[status?.toLowerCase()] || status;
};

// Payment status formatter
export const formatPaymentStatus = (status) => {
  const statusMap = {
    'pending': 'Menunggu',
    'processing': 'Diproses',
    'completed': 'Berhasil',
    'failed': 'Gagal',
    'cancelled': 'Dibatalkan',
    'refunded': 'Dikembalikan'
  };
  
  return statusMap[status?.toLowerCase()] || status;
};

// Priority formatter
export const formatPriority = (priority) => {
  const priorityMap = {
    'low': 'Rendah',
    'medium': 'Sedang',
    'high': 'Tinggi',
    'urgent': 'Mendesak'
  };
  
  return priorityMap[priority?.toLowerCase()] || priority;
};

export default {
  formatCurrency,
  formatNumber,
  formatCompactNumber,
  formatPercentage,
  formatFileSize,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  formatDuration,
  formatPhoneNumber,
  truncateText,
  capitalize,
  toTitleCase,
  formatUrl,
  formatSocialHandle,
  formatOrderStatus,
  formatPaymentStatus,
  formatPriority
};
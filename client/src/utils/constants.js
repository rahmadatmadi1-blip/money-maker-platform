// Application constants

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },
  USERS: {
    PROFILE: '/users/profile',
    SETTINGS: '/users/settings',
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/users/avatar',
  },
  DASHBOARD: {
    ANALYTICS: '/analytics/dashboard',
    ACTIVITIES: '/analytics/activities',
    STATS: '/analytics/stats',
  },
  AFFILIATE: {
    LINKS: '/affiliate/links',
    STATS: '/affiliate/stats',
    COMMISSIONS: '/affiliate/commissions',
  },
  ECOMMERCE: {
    PRODUCTS: '/ecommerce/products',
    ORDERS: '/ecommerce/orders',
    CATEGORIES: '/ecommerce/categories',
  },
  PAYMENTS: {
    TRANSACTIONS: '/payments/transactions',
    WITHDRAW: '/payments/withdraw',
    METHODS: '/payments/methods',
    BALANCE: '/payments/balance',
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    READ: '/notifications/read',
    READ_ALL: '/notifications/read-all',
  },
  MARKETPLACE: {
    ITEMS: '/marketplace',
    CATEGORIES: '/marketplace/categories',
    ORDERS: '/marketplace/orders',
  },
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Notification Categories
export const NOTIFICATION_CATEGORIES = {
  EARNINGS: 'earnings',
  WITHDRAWALS: 'withdrawals',
  MARKETING: 'marketing',
  SYSTEM: 'system',
  SECURITY: 'security',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

// Product Status
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
  ARCHIVED: 'archived',
};

// Affiliate Link Status
export const AFFILIATE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
};

// Time Ranges
export const TIME_RANGES = {
  TODAY: '1d',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  YEAR: '365d',
  ALL_TIME: 'all',
};

// Chart Types
export const CHART_TYPES = {
  LINE: 'line',
  BAR: 'bar',
  PIE: 'pie',
  DOUGHNUT: 'doughnut',
  AREA: 'area',
};

// File Types
export const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  SPREADSHEET: ['xls', 'xlsx', 'csv'],
  ARCHIVE: ['zip', 'rar', '7z', 'tar', 'gz'],
};

// File Size Limits (in bytes)
export const FILE_SIZE_LIMITS = {
  AVATAR: 2 * 1024 * 1024, // 2MB
  PRODUCT_IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  GENERAL: 25 * 1024 * 1024, // 25MB
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_PAGE_SIZE: 100,
};

// Validation Rules
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: false,
  },
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  PHONE: {
    PATTERN: /^[+]?[1-9][\d\s\-\(\)]{7,15}$/,
  },
};

// Currency Codes
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  CAD: 'CAD',
  AUD: 'AUD',
  CHF: 'CHF',
  CNY: 'CNY',
  INR: 'INR',
  BRL: 'BRL',
};

// Language Codes
export const LANGUAGES = {
  EN: 'en',
  ES: 'es',
  FR: 'fr',
  DE: 'de',
  IT: 'it',
  PT: 'pt',
  RU: 'ru',
  ZH: 'zh',
  JA: 'ja',
  KO: 'ko',
};

// Timezone Options
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  MEDIUM: 'MMM DD, YYYY',
  LONG: 'MMMM DD, YYYY',
  FULL: 'dddd, MMMM DD, YYYY',
  ISO: 'YYYY-MM-DD',
  TIME_12: 'hh:mm A',
  TIME_24: 'HH:mm',
  DATETIME_12: 'MM/DD/YYYY hh:mm A',
  DATETIME_24: 'MM/DD/YYYY HH:mm',
};

// Theme Options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// Social Media Platforms
export const SOCIAL_PLATFORMS = {
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  LINKEDIN: 'linkedin',
  YOUTUBE: 'youtube',
  TIKTOK: 'tiktok',
  PINTEREST: 'pinterest',
};

// Payment Methods
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  PAYPAL: 'paypal',
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
  CRYPTO: 'crypto',
};

// Commission Types
export const COMMISSION_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  TIERED: 'tiered',
};

// Content Types
export const CONTENT_TYPES = {
  BLOG_POST: 'blog_post',
  VIDEO: 'video',
  PODCAST: 'podcast',
  COURSE: 'course',
  EBOOK: 'ebook',
  WEBINAR: 'webinar',
};

// Marketplace Categories
export const MARKETPLACE_CATEGORIES = {
  DIGITAL_MARKETING: 'digital_marketing',
  WEB_DEVELOPMENT: 'web_development',
  GRAPHIC_DESIGN: 'graphic_design',
  CONTENT_WRITING: 'content_writing',
  SEO: 'seo',
  SOCIAL_MEDIA: 'social_media',
  CONSULTING: 'consulting',
  EDUCATION: 'education',
};

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Status Colors
export const STATUS_COLORS = {
  SUCCESS: '#28a745',
  WARNING: '#ffc107',
  DANGER: '#dc3545',
  INFO: '#17a2b8',
  PRIMARY: '#007bff',
  SECONDARY: '#6c757d',
  LIGHT: '#f8f9fa',
  DARK: '#343a40',
};

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
  XS: 0,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1400,
};

// Animation Durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_STATE: 'sidebar_state',
  RECENT_SEARCHES: 'recent_searches',
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Internal server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully.',
  CREATED: 'Item created successfully.',
  UPDATED: 'Item updated successfully.',
  DELETED: 'Item deleted successfully.',
  UPLOADED: 'File uploaded successfully.',
  SENT: 'Message sent successfully.',
  COPIED: 'Copied to clipboard.',
};

// Default Values
export const DEFAULTS = {
  AVATAR: '/images/default-avatar.png',
  PRODUCT_IMAGE: '/images/default-product.png',
  PAGE_SIZE: 10,
  CURRENCY: 'USD',
  LANGUAGE: 'en',
  TIMEZONE: 'UTC',
  THEME: 'light',
};
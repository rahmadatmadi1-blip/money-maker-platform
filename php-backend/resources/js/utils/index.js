// Utility functions for the application

// API utilities
export const api = {
    // Build query string from object
    buildQuery(params) {
        const query = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                query.append(key, params[key]);
            }
        });
        return query.toString();
    },
    
    // Handle API errors
    handleError(error) {
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            
            switch (status) {
                case 400:
                    return data.message || 'Bad request';
                case 401:
                    return 'Unauthorized. Please login again.';
                case 403:
                    return 'Access forbidden';
                case 404:
                    return 'Resource not found';
                case 422:
                    return data.message || 'Validation error';
                case 429:
                    return 'Too many requests. Please try again later.';
                case 500:
                    return 'Internal server error';
                default:
                    return data.message || 'An error occurred';
            }
        } else if (error.request) {
            // Network error
            return 'Network error. Please check your connection.';
        } else {
            // Other error
            return error.message || 'An unexpected error occurred';
        }
    },
    
    // Get error messages from validation response
    getValidationErrors(error) {
        if (error.response && error.response.status === 422) {
            return error.response.data.errors || {};
        }
        return {};
    },
};

// Date utilities
export const dateUtils = {
    // Format date
    format(date, format = 'YYYY-MM-DD') {
        return window.moment(date).format(format);
    },
    
    // Get relative time
    fromNow(date) {
        return window.moment(date).fromNow();
    },
    
    // Check if date is today
    isToday(date) {
        return window.moment(date).isSame(window.moment(), 'day');
    },
    
    // Check if date is this week
    isThisWeek(date) {
        return window.moment(date).isSame(window.moment(), 'week');
    },
    
    // Get start of day
    startOfDay(date) {
        return window.moment(date).startOf('day').toDate();
    },
    
    // Get end of day
    endOfDay(date) {
        return window.moment(date).endOf('day').toDate();
    },
    
    // Add days to date
    addDays(date, days) {
        return window.moment(date).add(days, 'days').toDate();
    },
    
    // Subtract days from date
    subtractDays(date, days) {
        return window.moment(date).subtract(days, 'days').toDate();
    },
};

// String utilities
export const stringUtils = {
    // Capitalize first letter
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Convert to title case
    titleCase(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },
    
    // Truncate string
    truncate(str, length = 100, suffix = '...') {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + suffix;
    },
    
    // Generate random string
    random(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // Slugify string
    slugify(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },
    
    // Extract initials
    initials(name) {
        if (!name) return '';
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .substring(0, 2);
    },
};

// Number utilities
export const numberUtils = {
    // Format currency
    formatCurrency(amount, currency = 'USD', locale = 'en-US') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
        }).format(amount);
    },
    
    // Format number with commas
    formatNumber(num, locale = 'en-US') {
        return new Intl.NumberFormat(locale).format(num);
    },
    
    // Format percentage
    formatPercentage(num, decimals = 2) {
        return `${(num * 100).toFixed(decimals)}%`;
    },
    
    // Abbreviate large numbers
    abbreviate(num) {
        if (num >= 1e9) {
            return (num / 1e9).toFixed(1) + 'B';
        } else if (num >= 1e6) {
            return (num / 1e6).toFixed(1) + 'M';
        } else if (num >= 1e3) {
            return (num / 1e3).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    // Generate random number
    random(min = 0, max = 100) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // Clamp number between min and max
    clamp(num, min, max) {
        return Math.min(Math.max(num, min), max);
    },
};

// Array utilities
export const arrayUtils = {
    // Remove duplicates
    unique(arr) {
        return [...new Set(arr)];
    },
    
    // Group array by key
    groupBy(arr, key) {
        return arr.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },
    
    // Sort array by key
    sortBy(arr, key, direction = 'asc') {
        return [...arr].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (direction === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });
    },
    
    // Chunk array into smaller arrays
    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    },
    
    // Shuffle array
    shuffle(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
};

// Object utilities
export const objectUtils = {
    // Deep clone object
    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Check if object is empty
    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    },
    
    // Pick specific keys from object
    pick(obj, keys) {
        const result = {};
        keys.forEach(key => {
            if (key in obj) {
                result[key] = obj[key];
            }
        });
        return result;
    },
    
    // Omit specific keys from object
    omit(obj, keys) {
        const result = { ...obj };
        keys.forEach(key => {
            delete result[key];
        });
        return result;
    },
    
    // Get nested property safely
    get(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    },
};

// Storage utilities
export const storageUtils = {
    // Local storage
    local: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error reading from localStorage:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error writing to localStorage:', error);
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from localStorage:', error);
            }
        },
        
        clear() {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }
        },
    },
    
    // Session storage
    session: {
        get(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error('Error reading from sessionStorage:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error('Error writing to sessionStorage:', error);
            }
        },
        
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing from sessionStorage:', error);
            }
        },
        
        clear() {
            try {
                sessionStorage.clear();
            } catch (error) {
                console.error('Error clearing sessionStorage:', error);
            }
        },
    },
};

// Validation utilities
export const validationUtils = {
    // Email validation
    isEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    // Phone validation
    isPhone(phone) {
        const re = /^[\+]?[1-9][\d]{0,15}$/;
        return re.test(phone.replace(/\s/g, ''));
    },
    
    // URL validation
    isUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },
    
    // Strong password validation
    isStrongPassword(password) {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    },
    
    // Credit card validation (Luhn algorithm)
    isCreditCard(number) {
        const num = number.replace(/\s/g, '');
        if (!/^\d+$/.test(num)) return false;
        
        let sum = 0;
        let isEven = false;
        
        for (let i = num.length - 1; i >= 0; i--) {
            let digit = parseInt(num[i]);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    },
};

// DOM utilities
export const domUtils = {
    // Scroll to element
    scrollTo(element, options = {}) {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                ...options,
            });
        }
    },
    
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    },
    
    // Download file
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
    
    // Get element position
    getElementPosition(element) {
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
        };
    },
};

// Export all utilities
export default {
    api,
    dateUtils,
    stringUtils,
    numberUtils,
    arrayUtils,
    objectUtils,
    storageUtils,
    validationUtils,
    domUtils,
};
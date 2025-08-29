// Import and configure plugins
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Configure Chart.js defaults
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.color = '#6B7280';
Chart.defaults.borderColor = '#E5E7EB';
Chart.defaults.backgroundColor = 'rgba(59, 130, 246, 0.1)';

// Chart.js responsive configuration
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// Export configured Chart for global use
window.Chart = Chart;

// Configure global chart options
const chartDefaults = {
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20,
            },
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: false,
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: '#9CA3AF',
            },
        },
        y: {
            grid: {
                color: '#F3F4F6',
            },
            ticks: {
                color: '#9CA3AF',
            },
        },
    },
};

// Apply default options to all chart types
Object.keys(Chart.defaults.datasets).forEach(type => {
    Chart.defaults.datasets[type] = {
        ...Chart.defaults.datasets[type],
        ...chartDefaults,
    };
});

// Export chart utilities
export const chartUtils = {
    // Generate color palette
    generateColors(count, opacity = 1) {
        const colors = [
            `rgba(59, 130, 246, ${opacity})`,   // Blue
            `rgba(16, 185, 129, ${opacity})`,   // Green
            `rgba(245, 158, 11, ${opacity})`,   // Yellow
            `rgba(239, 68, 68, ${opacity})`,    // Red
            `rgba(139, 92, 246, ${opacity})`,   // Purple
            `rgba(236, 72, 153, ${opacity})`,   // Pink
            `rgba(6, 182, 212, ${opacity})`,    // Cyan
            `rgba(34, 197, 94, ${opacity})`,    // Emerald
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    },
    
    // Format currency for charts
    formatCurrency(value, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(value);
    },
    
    // Format numbers with abbreviations
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K';
        }
        return value.toString();
    },
    
    // Create gradient
    createGradient(ctx, colorStart, colorEnd) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd);
        return gradient;
    },
};

// Export default chart configurations
export const chartConfigs = {
    line: {
        type: 'line',
        options: {
            ...chartDefaults,
            elements: {
                line: {
                    tension: 0.4,
                    borderWidth: 2,
                },
                point: {
                    radius: 4,
                    hoverRadius: 6,
                },
            },
        },
    },
    
    bar: {
        type: 'bar',
        options: {
            ...chartDefaults,
            elements: {
                bar: {
                    borderRadius: 4,
                },
            },
        },
    },
    
    doughnut: {
        type: 'doughnut',
        options: {
            ...chartDefaults,
            cutout: '70%',
            elements: {
                arc: {
                    borderWidth: 0,
                },
            },
        },
    },
    
    pie: {
        type: 'pie',
        options: {
            ...chartDefaults,
            elements: {
                arc: {
                    borderWidth: 0,
                },
            },
        },
    },
};

// Initialize plugins
export default function initializePlugins() {
    console.log('Plugins initialized successfully');
}
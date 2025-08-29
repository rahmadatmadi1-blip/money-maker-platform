import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useEarnings, useOrders, useAnalytics } from '../hooks/useSocket';
import { formatCurrency, formatNumber, formatCompactNumber } from '../utils/formatters';
import {
  selectEarnings,
  selectRecentEarnings,
  selectOrders,
  selectOrderStats,
  selectAnalytics,
  selectLinkVisitors
} from '../store/socketSlice';

const RealTimeStats = ({ className = '' }) => {
  const earnings = useSelector(selectEarnings);
  const recentEarnings = useSelector(selectRecentEarnings);
  const orders = useSelector(selectOrders);
  const orderStats = useSelector(selectOrderStats);
  const analytics = useSelector(selectAnalytics);
  const linkVisitors = useSelector(selectLinkVisitors);  
  const [previousStats, setPreviousStats] = useState({});
  const [changes, setChanges] = useState({});

  // Track changes for animations
  useEffect(() => {
    const currentStats = {
      totalEarnings: earnings?.total || 0,
      todayEarnings: earnings?.today || 0,
      totalOrders: orderStats?.total || 0,
      pendingOrders: orderStats?.pending || 0,
      visitors: analytics?.visitors || 0,
      conversions: analytics?.conversions || 0
    };

    if (Object.keys(previousStats).length > 0) {
      const newChanges = {};
      Object.keys(currentStats).forEach(key => {
        const current = currentStats[key];
        const previous = previousStats[key] || 0;
        if (current !== previous) {
          newChanges[key] = {
            value: current - previous,
            type: current > previous ? 'increase' : 'decrease'
          };
        }
      });
      setChanges(newChanges);
    }

    setPreviousStats(currentStats);
  }, [earnings, orderStats, analytics, previousStats]);

  // Get change indicator
  const getChangeIndicator = (key) => {
    const change = changes[key];
    if (!change) return null;

    const isPositive = change.type === 'increase';
    const Icon = isPositive ? ArrowUp : ArrowDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const bgClass = isPositive ? 'bg-green-100' : 'bg-red-100';

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgClass} ${colorClass} ml-2`}>
        <Icon className="w-3 h-3 mr-1" />
        {Math.abs(change.value)}
        {change.percentage > 0 && (
          <span className="ml-1">({change.percentage}%)</span>
        )}
      </div>
    );
  };

  // Animation for value changes
  const AnimatedValue = ({ value, formatter = (v) => v, changeKey }) => {
    const [displayValue, setDisplayValue] = useState(value);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
      if (value !== displayValue) {
        setIsAnimating(true);
        const timer = setTimeout(() => {
          setDisplayValue(value);
          setIsAnimating(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }, [value, displayValue]);

    return (
      <div className="flex items-center">
        <span className={`transition-all duration-300 ${isAnimating ? 'scale-110 text-blue-600' : ''}`}>
          {formatter(displayValue)}
        </span>
        {getChangeIndicator(changeKey)}
      </div>
    );
  };

  const stats = [
    {
      title: 'Total Earnings',
      value: earnings?.total || 0,
      formatter: formatCurrency,
      icon: DollarSign,
      color: 'bg-green-500',
      changeKey: 'totalEarnings',
      subtitle: `Hari ini: ${formatCurrency(earnings?.today || 0)}`
    },
    {
      title: 'Earnings Bulan Ini',
      value: earnings?.thisMonth || 0,
      formatter: formatCurrency,
      icon: TrendingUp,
      color: 'bg-blue-500',
      changeKey: 'monthlyEarnings',
      subtitle: `Pending: ${formatCurrency(earnings?.pending || 0)}`
    },
    {
      title: 'Total Orders',
      value: orderStats?.total || 0,
      formatter: formatNumber,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      changeKey: 'totalOrders',
      subtitle: `Pending: ${orderStats?.pending || 0} | Selesai: ${orderStats?.completed || 0}`
    },
    {
      title: 'Visitors Hari Ini',
      value: analytics?.visitors || 0,
      formatter: formatNumber,
      icon: Users,
      color: 'bg-orange-500',
      changeKey: 'visitors',
      subtitle: `Page Views: ${formatNumber(analytics?.pageViews || 0)}`
    },
    {
      title: 'Conversion Rate',
      value: (analytics?.visitors || 0) > 0 ? (((analytics?.conversions || 0) / (analytics?.visitors || 1)) * 100).toFixed(1) : 0,
      formatter: (v) => `${v}%`,
      icon: MousePointer,
      color: 'bg-pink-500',
      changeKey: 'conversions',
      subtitle: `${analytics?.conversions || 0} conversions`
    },
    {
      title: 'Revenue Hari Ini',
      value: analytics?.revenue || 0,
      formatter: formatCurrency,
      icon: Activity,
      color: 'bg-indigo-500',
      changeKey: 'revenue',
      subtitle: 'Real-time tracking'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                      <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <div className="mt-1">
                        <AnimatedValue
                          value={stat.value}
                          formatter={stat.formatter}
                          changeKey={stat.changeKey}
                        />
                      </div>
                      {stat.subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Link Visitors Real-time */}
      {linkVisitors && Object.keys(linkVisitors).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-500" />
              Link Visitors (Real-time)
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live
            </div>
          </div>
          
          <div className="space-y-3">
            {Object.entries(linkVisitors).map(([linkId, visitors]) => (
              <div key={linkId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    Link #{linkId.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">Affiliate Link</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900">{formatNumber(visitors)}</p>
                  <p className="text-xs text-gray-500">visitors</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Status Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ShoppingCart className="w-5 h-5 mr-2 text-purple-500" />
          Order Status Breakdown
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: orderStats?.pending || 0, color: 'bg-yellow-500' },
            { label: 'Processing', value: orderStats?.processing || 0, color: 'bg-blue-500' },
            { label: 'Completed', value: orderStats?.completed || 0, color: 'bg-green-500' },
            { label: 'Cancelled', value: orderStats?.cancelled || 0, color: 'bg-red-500' }
          ].map((status, index) => (
            <div key={index} className="text-center">
              <div className={`w-12 h-12 ${status.color} bg-opacity-10 rounded-lg flex items-center justify-center mx-auto mb-2`}>
                <span className={`text-lg font-bold ${status.color.replace('bg-', 'text-')}`}>
                  {status.value}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600">{status.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Real-time Updates Active</p>
              <p className="text-xs text-gray-600">Data diperbarui secara otomatis</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Last update:</p>
            <p className="text-xs font-medium text-gray-700">
              {new Date().toLocaleTimeString('id-ID')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeStats;
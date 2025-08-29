import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePerformanceMonitor } from '../../hooks/usePerformance';
import './PerformanceMonitor.css';

const PerformanceMonitor = ({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  showMetrics = ['fps', 'memory', 'timing'],
  updateInterval = 1000,
  onPerformanceIssue,
  thresholds = {
    fps: 30,
    memory: 50, // MB
    timing: 100 // ms
  }
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    timing: 0,
    renderCount: 0,
    lastUpdate: Date.now()
  });

  const performanceData = usePerformanceMonitor({
    enabled,
    onPerformanceIssue
  });

  // FPS calculation
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTime;
    
    if (delta >= 1000) {
      const fps = Math.round((frameCount * 1000) / delta);
      setMetrics(prev => ({ ...prev, fps }));
      setFrameCount(0);
      setLastTime(now);
      
      // Check for performance issues
      if (fps < thresholds.fps && onPerformanceIssue) {
        onPerformanceIssue('fps', fps, thresholds.fps);
      }
    }
    
    setFrameCount(prev => prev + 1);
  }, [frameCount, lastTime, thresholds.fps, onPerformanceIssue]);

  // Memory usage calculation
  const calculateMemory = useCallback(() => {
    if (performance.memory) {
      const memory = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      setMetrics(prev => ({ ...prev, memory }));
      
      // Check for memory issues
      if (memory > thresholds.memory && onPerformanceIssue) {
        onPerformanceIssue('memory', memory, thresholds.memory);
      }
    }
  }, [thresholds.memory, onPerformanceIssue]);

  // Render timing calculation
  const calculateTiming = useCallback(() => {
    const timing = performanceData.renderTime || 0;
    setMetrics(prev => ({ ...prev, timing, renderCount: prev.renderCount + 1 }));
    
    // Check for timing issues
    if (timing > thresholds.timing && onPerformanceIssue) {
      onPerformanceIssue('timing', timing, thresholds.timing);
    }
  }, [performanceData.renderTime, thresholds.timing, onPerformanceIssue]);

  // Update metrics periodically
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      calculateFPS();
      calculateMemory();
      calculateTiming();
      setMetrics(prev => ({ ...prev, lastUpdate: Date.now() }));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval, calculateFPS, calculateMemory, calculateTiming]);

  // Animation frame for FPS calculation
  useEffect(() => {
    if (!enabled || !showMetrics.includes('fps')) return;

    let animationId;
    const animate = () => {
      calculateFPS();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [enabled, showMetrics, calculateFPS]);

  // Keyboard shortcut to toggle visibility
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Format metrics for display
  const formattedMetrics = useMemo(() => {
    return {
      fps: `${metrics.fps} FPS`,
      memory: `${metrics.memory} MB`,
      timing: `${metrics.timing.toFixed(1)} ms`,
      renderCount: `${metrics.renderCount} renders`
    };
  }, [metrics]);

  // Get status color based on thresholds
  const getStatusColor = useCallback((metric, value) => {
    const threshold = thresholds[metric];
    if (!threshold) return 'var(--success-color, #28a745)';
    
    switch (metric) {
      case 'fps':
        return value >= threshold ? 'var(--success-color, #28a745)' : 'var(--danger-color, #dc3545)';
      case 'memory':
      case 'timing':
        return value <= threshold ? 'var(--success-color, #28a745)' : 'var(--danger-color, #dc3545)';
      default:
        return 'var(--info-color, #17a2b8)';
    }
  }, [thresholds]);

  if (!enabled || !isVisible) {
    return (
      <button
        className="performance-monitor-toggle"
        onClick={() => setIsVisible(true)}
        title="Show Performance Monitor (Ctrl+Shift+P)"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          display: enabled ? 'block' : 'none'
        }}
      >
        <i className="fas fa-chart-line"></i>
      </button>
    );
  }

  return (
    <div 
      className={`performance-monitor ${position} ${isMinimized ? 'minimized' : 'expanded'}`}
      style={{ zIndex: 9999 }}
    >
      <div className="performance-monitor-header">
        <div className="performance-monitor-title">
          <i className="fas fa-tachometer-alt"></i>
          <span>Performance</span>
        </div>
        <div className="performance-monitor-controls">
          <button
            className="minimize-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <i className={`fas fa-chevron-${isMinimized ? 'up' : 'down'}`}></i>
          </button>
          <button
            className="close-btn"
            onClick={() => setIsVisible(false)}
            title="Close (Ctrl+Shift+P)"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="performance-monitor-content">
          {showMetrics.map(metric => (
            <div key={metric} className="performance-metric">
              <div className="metric-label">
                {metric.toUpperCase()}
              </div>
              <div 
                className="metric-value"
                style={{ color: getStatusColor(metric, metrics[metric]) }}
              >
                {formattedMetrics[metric]}
              </div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill"
                  style={{
                    width: `${Math.min(100, (metrics[metric] / (thresholds[metric] || 100)) * 100)}%`,
                    backgroundColor: getStatusColor(metric, metrics[metric])
                  }}
                ></div>
              </div>
            </div>
          ))}
          
          <div className="performance-info">
            <small>
              Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString()}
            </small>
          </div>
          
          {performanceData.issues.length > 0 && (
            <div className="performance-issues">
              <div className="issues-title">
                <i className="fas fa-exclamation-triangle"></i>
                Issues Detected
              </div>
              {performanceData.issues.slice(-3).map((issue, index) => (
                <div key={index} className="issue-item">
                  <span className="issue-type">{issue.type}:</span>
                  <span className="issue-message">{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export with memo for performance
export default React.memo(PerformanceMonitor);

// Export hook for performance monitoring
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    timing: 0,
    renderCount: 0
  });

  const updateMetrics = useCallback((newMetrics) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
  }, []);

  return { metrics, updateMetrics };
};
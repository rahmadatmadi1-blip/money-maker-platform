import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CloudDone,
  CloudOff,
  Speed,
  Storage,
  Refresh,
  Delete,
  Settings,
  Analytics,
  Warning,
  CheckCircle,
  Error,
  Info,
  TrendingUp,
  Memory,
  NetworkCheck
} from '@mui/icons-material';
import { useCDN, usePerformanceMonitoring } from '../../hooks/useCDN';

const CDNManager = () => {
  const {
    isServiceWorkerReady,
    cacheSize,
    isOnline,
    cdnEnabled,
    getCacheSize,
    clearCache,
    preloadUrls,
    warmupCache,
    formatCacheSize,
    formatBytes
  } = useCDN();

  const { metrics, performanceScore, isGoodPerformance } = usePerformanceMonitoring();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preloadDialog, setPreloadDialog] = useState(false);
  const [preloadUrls, setPreloadUrlsState] = useState('');
  const [cdnStats, setCdnStats] = useState({
    hitRate: 0,
    bandwidth: 0,
    requests: 0,
    errors: 0
  });
  const [cacheEntries, setCacheEntries] = useState([]);

  // Fetch CDN statistics
  useEffect(() => {
    fetchCDNStats();
    fetchCacheEntries();
  }, []);

  const fetchCDNStats = async () => {
    try {
      // Simulate CDN stats - in real app, fetch from your CDN provider's API
      setCdnStats({
        hitRate: Math.random() * 100,
        bandwidth: Math.random() * 1000,
        requests: Math.floor(Math.random() * 10000),
        errors: Math.floor(Math.random() * 100)
      });
    } catch (error) {
      console.error('Failed to fetch CDN stats:', error);
    }
  };

  const fetchCacheEntries = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const entries = [];
        
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          
          for (const request of requests.slice(0, 10)) { // Limit to 10 per cache
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              entries.push({
                url: request.url,
                cache: cacheName,
                size: blob.size,
                type: response.headers.get('content-type') || 'unknown',
                lastModified: response.headers.get('last-modified') || 'unknown'
              });
            }
          }
        }
        
        setCacheEntries(entries);
      }
    } catch (error) {
      console.error('Failed to fetch cache entries:', error);
    }
  };

  const handleClearCache = async (cacheName = null) => {
    setLoading(true);
    try {
      await clearCache(cacheName);
      await fetchCacheEntries();
      await getCacheSize();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreloadUrls = async () => {
    if (!preloadUrls.trim()) return;
    
    setLoading(true);
    try {
      const urls = preloadUrls.split('\n').filter(url => url.trim());
      await preloadUrls(urls);
      await fetchCacheEntries();
      await getCacheSize();
      setPreloadDialog(false);
      setPreloadUrlsState('');
    } catch (error) {
      console.error('Failed to preload URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarmupCache = async () => {
    setLoading(true);
    try {
      await warmupCache();
      await fetchCDNStats();
    } catch (error) {
      console.error('Failed to warmup cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'good') return 'success';
    if (status === 'warning') return 'warning';
    return 'error';
  };

  const getPerformanceStatus = () => {
    if (performanceScore >= 90) return 'good';
    if (performanceScore >= 70) return 'warning';
    return 'poor';
  };

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        CDN & Performance Manager
      </Typography>

      {/* Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    CDN Status
                  </Typography>
                  <Typography variant="h6">
                    {cdnEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Box>
                {cdnEnabled ? <CloudDone color="success" /> : <CloudOff color="error" />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Cache Size
                  </Typography>
                  <Typography variant="h6">
                    {formatCacheSize}
                  </Typography>
                </Box>
                <Storage color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Performance Score
                  </Typography>
                  <Typography variant="h6">
                    {performanceScore}/100
                  </Typography>
                </Box>
                <Speed color={getStatusColor(getPerformanceStatus())} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Connection
                  </Typography>
                  <Typography variant="h6">
                    {isOnline ? 'Online' : 'Offline'}
                  </Typography>
                </Box>
                <NetworkCheck color={isOnline ? 'success' : 'error'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Service Worker Status */}
      {!isServiceWorkerReady && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Service Worker is not ready. Some caching features may not work properly.
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" />
          <Tab label="Cache Management" />
          <Tab label="Performance" />
          <Tab label="Settings" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    CDN Statistics
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><TrendingUp /></ListItemIcon>
                      <ListItemText 
                        primary="Hit Rate" 
                        secondary={`${cdnStats.hitRate.toFixed(1)}%`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Memory /></ListItemIcon>
                      <ListItemText 
                        primary="Bandwidth Used" 
                        secondary={`${cdnStats.bandwidth.toFixed(1)} MB`} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Analytics /></ListItemIcon>
                      <ListItemText 
                        primary="Total Requests" 
                        secondary={cdnStats.requests.toLocaleString()} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Error /></ListItemIcon>
                      <ListItemText 
                        primary="Errors" 
                        secondary={cdnStats.errors.toLocaleString()} 
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={handleWarmupCache}
                      disabled={loading}
                      fullWidth
                    >
                      Warmup CDN Cache
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Storage />}
                      onClick={() => setPreloadDialog(true)}
                      disabled={loading}
                      fullWidth
                    >
                      Preload URLs
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleClearCache()}
                      disabled={loading}
                      fullWidth
                    >
                      Clear All Cache
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Cache Management Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cache Entries ({cacheEntries.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchCacheEntries}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>URL</TableCell>
                  <TableCell>Cache</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Last Modified</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cacheEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {entry.url.length > 50 ? `${entry.url.substring(0, 50)}...` : entry.url}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={entry.cache} size="small" />
                    </TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell>{formatBytes(entry.size)}</TableCell>
                    <TableCell>{entry.lastModified}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Core Web Vitals
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="First Contentful Paint (FCP)" 
                        secondary={metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'Measuring...'} 
                      />
                      <Chip 
                        label={metrics.fcp > 1800 ? 'Poor' : metrics.fcp > 1000 ? 'Good' : 'Excellent'}
                        color={metrics.fcp > 1800 ? 'error' : metrics.fcp > 1000 ? 'warning' : 'success'}
                        size="small"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Largest Contentful Paint (LCP)" 
                        secondary={metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'Measuring...'} 
                      />
                      <Chip 
                        label={metrics.lcp > 4000 ? 'Poor' : metrics.lcp > 2500 ? 'Good' : 'Excellent'}
                        color={metrics.lcp > 4000 ? 'error' : metrics.lcp > 2500 ? 'warning' : 'success'}
                        size="small"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="First Input Delay (FID)" 
                        secondary={metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'Measuring...'} 
                      />
                      <Chip 
                        label={metrics.fid > 300 ? 'Poor' : metrics.fid > 100 ? 'Good' : 'Excellent'}
                        color={metrics.fid > 300 ? 'error' : metrics.fid > 100 ? 'warning' : 'success'}
                        size="small"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Cumulative Layout Shift (CLS)" 
                        secondary={metrics.cls ? metrics.cls.toFixed(3) : 'Measuring...'} 
                      />
                      <Chip 
                        label={metrics.cls > 0.25 ? 'Poor' : metrics.cls > 0.1 ? 'Good' : 'Excellent'}
                        color={metrics.cls > 0.25 ? 'error' : metrics.cls > 0.1 ? 'warning' : 'success'}
                        size="small"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Score
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h3" color={getStatusColor(getPerformanceStatus())}>
                      {performanceScore}/100
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={performanceScore} 
                      color={getStatusColor(getPerformanceStatus())}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {isGoodPerformance ? 
                      'Your application has excellent performance!' : 
                      'Consider optimizing your application for better performance.'
                    }
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CDN Configuration
              </Typography>
              <List>
                <ListItem>
                  <FormControlLabel
                    control={<Switch checked={cdnEnabled} disabled />}
                    label="CDN Enabled"
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    Controlled by REACT_APP_CDN_ENABLED environment variable
                  </Typography>
                </ListItem>
                <ListItem>
                  <FormControlLabel
                    control={<Switch checked={isServiceWorkerReady} disabled />}
                    label="Service Worker Active"
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
                    Provides offline support and advanced caching
                  </Typography>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>

      {/* Preload URLs Dialog */}
      <Dialog open={preloadDialog} onClose={() => setPreloadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Preload URLs</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="URLs (one per line)"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={preloadUrls}
            onChange={(e) => setPreloadUrlsState(e.target.value)}
            placeholder="/api/users\n/api/products\n/static/images/logo.png"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreloadDialog(false)}>Cancel</Button>
          <Button onClick={handlePreloadUrls} variant="contained" disabled={loading}>
            Preload
          </Button>
        </DialogActions>
      </Dialog>

      {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
    </Box>
  );
};

export default CDNManager;
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fade,
  Grow,
  Slide,
  useTheme,
  alpha
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  Devices as DevicesIcon,
  Timeline as TimelineIcon,
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { api } from '../utils/api';
import { logger } from '../utils/logger';

const Statistics = () => {
  const theme = useTheme();
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsView, setAnalyticsView] = useState('overview'); // overview, clicks, location, device, timeline
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.getAllUrls();
      
      if (result.success) {
        setUrls(result.data);
        logger.info('URLs fetched successfully', { count: result.data.length });
      } else {
        setError(result.error);
        logger.error('Failed to fetch URLs', { error: result.error });
      }
    } catch (error) {
      setError('An unexpected error occurred');
      logger.error('Unexpected error fetching URLs', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUrls = async () => {
    setRefreshing(true);
    await fetchUrls();
    setRefreshing(false);
  };

  const fetchUrlDetails = async (shortcode) => {
    try {
      setDetailsLoading(true);
      
      const result = await api.getUrlStats(shortcode);
      
      if (result.success) {
        setSelectedUrl(result.data);
        setDialogOpen(true);
        logger.info('URL details fetched', { shortcode, totalClicks: result.data.totalClicks });
      } else {
        logger.error('Failed to fetch URL details', { shortcode, error: result.error });
      }
    } catch (error) {
      logger.error('Unexpected error fetching URL details', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      logger.info('URL copied to clipboard', { url: text });
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
    }
  };

  const handleDeleteUrl = async (shortcode, originalUrl) => {
    if (!shortcode) {
      logger.error('Cannot delete: shortcode is missing');
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete this URL?\n\n${originalUrl}\n\nThis action cannot be undone and will remove all associated analytics data from the database.`
    );

    if (!confirmed) return;

    setDeleting(prev => ({ ...prev, [shortcode]: true }));

    try {
      const result = await api.deleteUrl(shortcode);

      if (result.success) {
        // Remove from urls state
        setUrls(prev => prev.filter(url => url.shortcode !== shortcode));
        
        // Close dialog if this URL was being viewed
        if (selectedUrl && selectedUrl.shortcode === shortcode) {
          closeDialog();
        }

        logger.info('URL deleted successfully from database', { shortcode, originalUrl });
        
      } else {
        logger.error('Failed to delete URL from database', { shortcode, error: result.error });
        alert(`Failed to delete URL: ${result.error}`);
      }

    } catch (error) {
      logger.error('Error deleting URL from database', error);
      alert('An unexpected error occurred while deleting the URL.');
    } finally {
      setDeleting(prev => ({ ...prev, [shortcode]: false }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeRemaining = (expiryString) => {
    const now = new Date();
    const expiry = new Date(expiryString);
    const diff = expiry - now;
    
    if (diff <= 0) {
      return 'Expired';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedUrl(null);
    setAnalyticsView('overview');
  };

  const handleTabChange = (event, newValue) => {
    setAnalyticsView(newValue);
  };

  // Helper function to render analytics data
  const renderAnalyticsContent = () => {
    if (!selectedUrl) return null;

    switch (analyticsView) {
      case 'overview':
        return renderOverviewTab();
      case 'clicks':
        return renderClicksTab();
      case 'location':
        return renderLocationTab();
      case 'device':
        return renderDeviceTab();
      case 'timeline':
        return renderTimelineTab();
      default:
        return renderOverviewTab();
    }
  };

  const renderOverviewTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {selectedUrl.totalClicks || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Clicks
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {selectedUrl.analytics?.locationStats?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unique Locations
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {selectedUrl.analytics?.deviceStats?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Device Types
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center' }}>
              <Chip
                label={selectedUrl.isExpired ? 'Expired' : 'Active'}
                color={selectedUrl.isExpired ? 'error' : 'success'}
                variant="filled"
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Status
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          URL Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Created:
            </Typography>
            <Typography variant="body1">
              {formatDate(selectedUrl.createdAt)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Expires:
            </Typography>
            <Typography variant="body1">
              {formatDate(selectedUrl.expiresAt)}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );

  const renderClicksTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Click History ({selectedUrl.totalClicks} total clicks)
      </Typography>
      
      {selectedUrl.clickDetails?.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No clicks recorded yet.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>Source</strong></TableCell>
                <TableCell><strong>Location</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedUrl.clickDetails?.map((click, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {formatDate(click.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={click.source}
                    >
                      {click.source}
                    </Typography>
                  </TableCell>
                  <TableCell>{click.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  const renderLocationTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Geographic Distribution
      </Typography>
      
      {selectedUrl.analytics?.locationStats?.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No location data available.
        </Typography>
      ) : (
        <List>
          {selectedUrl.analytics?.locationStats?.map((location, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <LocationIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={`${location._id.city || 'Unknown City'}, ${location._id.country || 'Unknown Country'}`}
                secondary={`${location.count} clicks`}
              />
              <Box sx={{ minWidth: 100 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(location.count / selectedUrl.totalClicks) * 100} 
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round((location.count / selectedUrl.totalClicks) * 100)}%
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  const renderDeviceTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Device & Browser Analytics
      </Typography>
      
      {selectedUrl.analytics?.deviceStats?.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No device data available.
        </Typography>
      ) : (
        <List>
          {selectedUrl.analytics?.deviceStats?.map((device, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <DevicesIcon color="secondary" />
              </ListItemIcon>
              <ListItemText
                primary={`${device._id.type} - ${device._id.browser} on ${device._id.os}`}
                secondary={`${device.count} clicks`}
              />
              <Box sx={{ minWidth: 100 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(device.count / selectedUrl.totalClicks) * 100} 
                  color="secondary"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round((device.count / selectedUrl.totalClicks) * 100)}%
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  const renderTimelineTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Traffic Sources
      </Typography>
      
      {selectedUrl.analytics?.refererStats?.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No referrer data available.
        </Typography>
      ) : (
        <List>
          {selectedUrl.analytics?.refererStats?.map((referer, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <BarChartIcon color="info" />
              </ListItemIcon>
              <ListItemText
                primary={referer._id === 'Direct' ? 'Direct Traffic' : referer._id}
                secondary={`${referer.count} clicks`}
              />
              <Box sx={{ minWidth: 100 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(referer.count / selectedUrl.totalClicks) * 100} 
                  color="info"
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {Math.round((referer.count / selectedUrl.totalClicks) * 100)}%
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchUrls}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Paper>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
      py: 4
    }}>
      <Fade in timeout={1000}>
        <Paper 
          elevation={8} 
          sx={{ 
            p: 6, 
            mb: 4,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            color: 'white',
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="6" cy="6" r="3"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 48, mr: 3, color: 'white' }} />
                <Box>
                  <Typography variant="h3" component="h1" fontWeight="bold" sx={{ color: 'white' }}>
                    📊 URL Analytics Dashboard
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300, mt: 1 }}>
                    ✨ Complete analytics for all URLs in the database (including expired URLs) ✨
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={refreshUrls}
                disabled={refreshing}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </Box>
          </Box>
        </Paper>
      </Fade>

      <Slide in direction="up" timeout={800}>
        <Paper elevation={6} sx={{ p: 4, borderRadius: 3, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          {/* Summary Statistics */}
          {urls.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={3}>
                <Grow in timeout={600}>
                  <Card sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="h3" sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {urls.length}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" fontWeight="medium">
                        📊 Total URLs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Grow in timeout={800}>
                  <Card sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                    border: `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.success.main, 0.15)}`,
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="h3" sx={{
                        background: `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {urls.filter(url => !url.isExpired).length}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" fontWeight="medium">
                        ✅ Active URLs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Grow in timeout={1000}>
                  <Card sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                    border: `2px solid ${alpha(theme.palette.error.main, 0.2)}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.error.main, 0.15)}`,
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="h3" sx={{
                        background: `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {urls.filter(url => url.isExpired).length}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" fontWeight="medium">
                        ⏰ Expired URLs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Grow in timeout={1200}>
                  <Card sx={{
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                    border: `2px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    borderRadius: 3,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px ${alpha(theme.palette.info.main, 0.15)}`,
                    }
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <Typography variant="h3" sx={{
                        background: `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold',
                        mb: 1
                      }}>
                        {urls.reduce((sum, url) => sum + (url.totalClicks || 0), 0)}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" fontWeight="medium">
                        🔗 Total Clicks
                      </Typography>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
          </Grid>
        )}

        {/* URL Selector for Detailed Analytics */}
        {urls.length > 0 && (
          <Card sx={{ mb: 4, bgcolor: 'background.default' }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select URL for Detailed Analytics</InputLabel>
                    <Select
                      value={selectedUrl?.shortcode || ''}
                      label="Select URL for Detailed Analytics"
                      onChange={(e) => {
                        if (e.target.value) {
                          fetchUrlDetails(e.target.value);
                        }
                      }}
                    >
                      <MenuItem value="">
                        <em>Choose a URL to view analytics</em>
                      </MenuItem>
                      {urls.map((url) => (
                        <MenuItem key={url.shortcode} value={url.shortcode}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body2" noWrap>
                                {url.originalUrl.length > 50 
                                  ? `${url.originalUrl.substring(0, 50)}...` 
                                  : url.originalUrl}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {url.shortLink} • {url.totalClicks} clicks
                              </Typography>
                            </Box>
                            <Chip
                              label={url.isExpired ? 'Expired' : 'Active'}
                              color={url.isExpired ? 'error' : 'success'}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    Select a URL from the dropdown to view detailed analytics including click patterns, 
                    geographic data, device information, and more.
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {urls.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No URLs found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create some shortened URLs to see statistics here.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {urls.map((url) => (
              <Grid item xs={12} key={url.shortcode}>
                <Card variant="outlined" sx={{ 
                  opacity: url.isExpired ? 0.6 : 1,
                  border: url.isExpired ? '1px solid #f44336' : undefined
                }}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Original URL:
                        </Typography>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            wordBreak: 'break-all',
                            fontWeight: 'medium'
                          }}
                        >
                          {url.originalUrl}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Short URL:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body1" 
                            color="primary"
                            sx={{ fontWeight: 'medium' }}
                          >
                            {url.shortLink}
                          </Typography>
                          <Tooltip title="Copy to clipboard">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(url.shortLink)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open in new tab">
                            <IconButton
                              size="small"
                              onClick={() => window.open(url.shortLink, '_blank')}
                              disabled={url.isExpired}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete URL and all analytics">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUrl(url.shortcode, url.originalUrl)}
                              disabled={deleting[url.shortcode]}
                              color="error"
                            >
                              {deleting[url.shortcode] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Status:
                        </Typography>
                        <Chip
                          label={url.isExpired ? 'Expired' : getTimeRemaining(url.expiresAt)}
                          color={url.isExpired ? "error" : "success"}
                          size="small"
                          variant="outlined"
                        />
                        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                          Created: {formatDate(url.createdAt)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Clicks:
                        </Typography>
                        <Typography variant="h6" color="primary" gutterBottom>
                          {url.totalClicks}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={detailsLoading ? <CircularProgress size={16} /> : <VisibilityIcon />}
                          onClick={() => fetchUrlDetails(url.shortcode)}
                          disabled={detailsLoading || url.totalClicks === 0}
                        >
                          View Details
                        </Button>
                      </Grid>
                      
                      <Grid item xs={12} md={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {url.isExpired && (
                            <Chip
                              label="EXPIRED"
                              color="error"
                              size="small"
                              variant="filled"
                            />
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        </Paper>
      </Slide>

      {/* URL Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              📊 Detailed Analytics
            </Typography>
            {selectedUrl && (
              <Chip
                label={`${selectedUrl.totalClicks || 0} total clicks`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedUrl && (
            <>
              {/* URL Header Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Analyzing:
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-all', mb: 1, fontWeight: 'medium' }}>
                  {selectedUrl.originalUrl}
                </Typography>
                <Typography variant="caption" color="primary">
                  {selectedUrl.shortcode ? `Short: ${selectedUrl.shortcode}` : 'Loading...'}
                </Typography>
              </Box>
              
              {/* Analytics Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                  value={analyticsView} 
                  onChange={handleTabChange} 
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab 
                    label="Overview" 
                    value="overview" 
                    icon={<AssessmentIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Click History" 
                    value="clicks" 
                    icon={<VisibilityIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Geographic" 
                    value="location" 
                    icon={<LocationIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Devices" 
                    value="device" 
                    icon={<DevicesIcon />} 
                    iconPosition="start"
                  />
                  <Tab 
                    label="Traffic Sources" 
                    value="timeline" 
                    icon={<TimelineIcon />} 
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              {/* Tab Content */}
              <Box sx={{ minHeight: 300 }}>
                {renderAnalyticsContent()}
              </Box>
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          {selectedUrl && (
            <Button 
              onClick={() => handleDeleteUrl(selectedUrl.shortcode, selectedUrl.originalUrl)}
              disabled={deleting[selectedUrl.shortcode]}
              startIcon={deleting[selectedUrl.shortcode] ? <CircularProgress size={16} /> : <DeleteIcon />}
              color="error"
              variant="outlined"
            >
              {deleting[selectedUrl.shortcode] ? 'Deleting...' : 'Delete URL'}
            </Button>
          )}
          <Button onClick={closeDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Statistics;
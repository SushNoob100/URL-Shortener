import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Grid,
  CircularProgress,
  Tooltip,
  Fade,
  Grow,
  Slide,
  useTheme,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Refresh as RefreshIcon,
  ClearAll as ClearAllIcon,
  Link as LinkIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { api } from '../utils/api';
import { logger } from '../utils/logger';

const URLShortener = () => {
  const [forms, setForms] = useState([{ id: 1, url: '', validity: '', shortcode: '' }]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [clearingExpired, setClearingExpired] = useState(false);

  // Load URL history from backend and localStorage on component mount
  useEffect(() => {
    loadUrlHistory();
  }, []);

  // Load URL history from backend and merge with localStorage
  const loadUrlHistory = async () => {
    setHistoryLoading(true);
    try {
      // Get URLs from backend
      const backendResult = await api.getAllUrls();
      
      if (backendResult.success) {
        // Transform backend data to match frontend format
        const backendUrls = backendResult.data.map(url => ({
          id: url.shortcode + '_' + Date.now(),
          originalUrl: url.originalUrl,
          shortLink: url.shortLink,
          expiry: url.expiresAt,
          timestamp: url.createdAt,
          shortcode: url.shortcode,
          totalClicks: url.totalClicks,
          isExpired: url.isExpired || new Date(url.expiresAt) < new Date(),
          isActive: url.isActive,
          source: 'backend'
        }));

        // Get localStorage URLs (for any URLs created in this session but not yet in backend)
        const localUrls = getLocalStorageUrls();
        
        // Merge and deduplicate (backend takes priority)
        const allUrls = mergeUrlHistory(backendUrls, localUrls);
        
        setResults(allUrls);
        logger.info('URL history loaded', { 
          backendCount: backendUrls.length, 
          localCount: localUrls.length,
          totalCount: allUrls.length 
        });
      } else {
        // If backend fails, fall back to localStorage only
        const localUrls = getLocalStorageUrls();
        setResults(localUrls);
        logger.warn('Backend unavailable, using localStorage only', { 
          error: backendResult.error,
          localCount: localUrls.length 
        });
      }
    } catch (error) {
      // If everything fails, try localStorage
      const localUrls = getLocalStorageUrls();
      setResults(localUrls);
      logger.error('Error loading URL history', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Get URLs from localStorage
  const getLocalStorageUrls = () => {
    try {
      const stored = localStorage.getItem('urlShortenerHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Add expiry status to stored URLs
        return parsed.map(url => ({
          ...url,
          isExpired: new Date(url.expiry) < new Date(),
          source: 'local'
        }));
      }
    } catch (error) {
      logger.error('Error reading localStorage', error);
    }
    return [];
  };

  // Save URLs to localStorage
  const saveToLocalStorage = (urls) => {
    try {
      // Only save recent URLs (last 50) to avoid localStorage bloat
      const recentUrls = urls.slice(0, 50);
      localStorage.setItem('urlShortenerHistory', JSON.stringify(recentUrls));
    } catch (error) {
      logger.error('Error saving to localStorage', error);
    }
  };

  // Merge backend and local URLs, removing duplicates
  const mergeUrlHistory = (backendUrls, localUrls) => {
    const backendShortcodes = new Set(backendUrls.map(url => url.shortcode));
    
    // Filter out local URLs that exist in backend
    const uniqueLocalUrls = localUrls.filter(url => 
      url.shortcode && !backendShortcodes.has(url.shortcode)
    );
    
    // Combine and sort by timestamp (newest first)
    const combined = [...backendUrls, ...uniqueLocalUrls];
    return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Refresh URL history from backend
  const refreshHistory = async () => {
    setRefreshing(true);
    await loadUrlHistory();
    setRefreshing(false);
  };

  // Clear expired URLs from localStorage and UI
  const clearExpiredUrls = async () => {
    const expiredUrls = results.filter(url => url.isExpired);
    
    if (expiredUrls.length === 0) {
      alert('No expired URLs found to clear.');
      return;
    }

    // Confirm clearing
    const confirmed = window.confirm(
      `Are you sure you want to clear ${expiredUrls.length} expired URL${expiredUrls.length > 1 ? 's' : ''}?\n\nThis will remove them from your local history. URLs stored in the database will remain until their automatic cleanup.`
    );

    if (!confirmed) return;

    setClearingExpired(true);

    try {
      // Filter out expired URLs from results
      const activeUrls = results.filter(url => !url.isExpired);
      
      // Update the UI state
      setResults(activeUrls);
      
      // Update localStorage with only active URLs
      saveToLocalStorage(activeUrls);
      
      logger.info('Expired URLs cleared from local history', { 
        clearedCount: expiredUrls.length,
        remainingCount: activeUrls.length 
      });

      // Show success message
      alert(`Successfully cleared ${expiredUrls.length} expired URL${expiredUrls.length > 1 ? 's' : ''} from local history.`);
      
    } catch (error) {
      logger.error('Error clearing expired URLs', error);
      alert('An error occurred while clearing expired URLs.');
    } finally {
      setClearingExpired(false);
    }
  };

  // Validation functions
  const isValidUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  const validateForm = (form) => {
    const errors = {};

    if (!form.url) {
      errors.url = 'URL is required';
    } else if (!isValidUrl(form.url)) {
      errors.url = 'Please enter a valid URL with http:// or https://';
    }

    if (form.validity && (isNaN(form.validity) || form.validity <= 0 || form.validity > 525600)) {
      errors.validity = 'Validity must be between 1 and 525600 minutes';
    }

    if (form.shortcode && !/^[a-zA-Z0-9]+$/.test(form.shortcode)) {
      errors.shortcode = 'Shortcode must contain only alphanumeric characters';
    }

    if (form.shortcode && (form.shortcode.length < 3 || form.shortcode.length > 20)) {
      errors.shortcode = 'Shortcode must be between 3 and 20 characters';
    }

    return errors;
  };

  const addForm = () => {
    if (forms.length < 5) {
      const newId = Math.max(...forms.map(f => f.id)) + 1;
      setForms([...forms, { id: newId, url: '', validity: '', shortcode: '' }]);
      logger.info('New form added', { totalForms: forms.length + 1 });
    }
  };

  const removeForm = (id) => {
    if (forms.length > 1) {
      setForms(forms.filter(f => f.id !== id));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
      logger.info('Form removed', { formId: id, remainingForms: forms.length - 1 });
    }
  };

  const updateForm = (id, field, value) => {
    setForms(forms.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
    
    // Clear errors for this field when user starts typing
    if (errors[id] && errors[id][field]) {
      setErrors(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: null
        }
      }));
    }
  };

  const handleSubmit = async (form) => {
    const formErrors = validateForm(form);
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(prev => ({ ...prev, [form.id]: formErrors }));
      logger.warn('Form validation failed', { formId: form.id, errors: formErrors });
      return;
    }

    setLoading(prev => ({ ...prev, [form.id]: true }));
    setErrors(prev => ({ ...prev, [form.id]: {} }));

    try {
      const payload = {
        url: form.url,
        ...(form.validity && { validity: parseInt(form.validity) }),
        ...(form.shortcode && { shortcode: form.shortcode })
      };

      const result = await api.createShortUrl(payload);
      
      if (result.success) {
        const newResult = {
          id: Date.now(),
          originalUrl: form.url,
          shortLink: result.data.shortLink,
          expiry: result.data.expiry,
          timestamp: new Date().toISOString(),
          shortcode: result.data.shortcode,
          totalClicks: 0,
          isExpired: false,
          isActive: true,
          source: 'local'
        };
        
        const updatedResults = [newResult, ...results];
        setResults(updatedResults);
        
        // Save to localStorage
        saveToLocalStorage(updatedResults);
        
        // Clear the form
        updateForm(form.id, 'url', '');
        updateForm(form.id, 'validity', '');
        updateForm(form.id, 'shortcode', '');
        
        logger.info('Short URL created successfully', {
          formId: form.id,
          shortLink: result.data.shortLink
        });
      } else {
        setErrors(prev => ({
          ...prev,
          [form.id]: { submit: result.error }
        }));
        
        logger.error('Failed to create short URL', {
          formId: form.id,
          error: result.error,
          code: result.code
        });
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [form.id]: { submit: 'An unexpected error occurred' }
      }));
      
      logger.error('Unexpected error during URL creation', error);
    } finally {
      setLoading(prev => ({ ...prev, [form.id]: false }));
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
      `Are you sure you want to delete this URL?\n\n${originalUrl}\n\nThis action cannot be undone and will remove all associated analytics data.`
    );

    if (!confirmed) return;

    setDeleting(prev => ({ ...prev, [shortcode]: true }));

    try {
      const result = await api.deleteUrl(shortcode);

      if (result.success) {
        // Remove from results state
        setResults(prev => prev.filter(url => url.shortcode !== shortcode));
        
        // Update localStorage
        const updatedResults = results.filter(url => url.shortcode !== shortcode);
        saveToLocalStorage(updatedResults);

        logger.info('URL deleted successfully', { shortcode, originalUrl });
        
        // Optional: Show success message
        // You could add a snackbar here if you want
        
      } else {
        logger.error('Failed to delete URL', { shortcode, error: result.error });
        alert(`Failed to delete URL: ${result.error}`);
      }

    } catch (error) {
      logger.error('Error deleting URL', error);
      alert('An unexpected error occurred while deleting the URL.');
    } finally {
      setDeleting(prev => ({ ...prev, [shortcode]: false }));
    }
  };

  const formatExpiry = (expiryString) => {
    const expiry = new Date(expiryString);
    return expiry.toLocaleString();
  };

  const isExpired = (expiryString) => {
    return new Date(expiryString) < new Date();
  };

  const theme = useTheme();

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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <LinkIcon sx={{ fontSize: 48, mr: 2, color: 'white' }} />
              <Typography variant="h3" component="h1" fontWeight="bold" align="center">
                URL Shortener
              </Typography>
            </Box>
            <Typography variant="h6" align="center" sx={{ opacity: 0.9, fontWeight: 300 }}>
              ✨ Create beautiful, shortened URLs with advanced analytics ✨
            </Typography>
            <Typography variant="body1" align="center" sx={{ mt: 2, opacity: 0.8 }}>
              Create up to 5 shortened URLs simultaneously • Default validity is 30 minutes
            </Typography>
          </Box>
        </Paper>
      </Fade>

      <Slide in direction="up" timeout={800}>
        <Paper elevation={6} sx={{ p: 4, mb: 4, borderRadius: 3, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)' }}>
          <Box sx={{ mt: 2 }}>
          {forms.map((form, index) => (
            <Grow in timeout={600 + index * 200} key={form.id}>
              <Card 
                sx={{ 
                  mb: 3, 
                  borderRadius: 3,
                  background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                  border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      color: 'white',
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <LinkIcon sx={{ mr: 1, fontSize: 20 }} />
                      <Typography variant="h6" fontWeight="bold">
                        Form {index + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                  {forms.length > 1 && (
                    <IconButton
                      onClick={() => removeForm(form.id)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="URL to shorten *"
                      placeholder="https://example.com/very/long/url"
                      value={form.url}
                      onChange={(e) => updateForm(form.id, 'url', e.target.value)}
                      error={!!errors[form.id]?.url}
                      helperText={errors[form.id]?.url}
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Validity (minutes)"
                      placeholder="30"
                      type="number"
                      value={form.validity}
                      onChange={(e) => updateForm(form.id, 'validity', e.target.value)}
                      error={!!errors[form.id]?.validity}
                      helperText={errors[form.id]?.validity || 'Default: 30 minutes'}
                      variant="outlined"
                      inputProps={{ min: 1, max: 525600 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Custom shortcode (optional)"
                      placeholder="mycode123"
                      value={form.shortcode}
                      onChange={(e) => updateForm(form.id, 'shortcode', e.target.value)}
                      error={!!errors[form.id]?.shortcode}
                      helperText={errors[form.id]?.shortcode || '3-20 alphanumeric characters'}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>

                {errors[form.id]?.submit && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {errors[form.id].submit}
                  </Alert>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={() => handleSubmit(form)}
                    disabled={loading[form.id] || !form.url}
                    startIcon={loading[form.id] ? <CircularProgress size={20} /> : null}
                    size="large"
                  >
                    {loading[form.id] ? 'Creating...' : 'Shorten URL'}
                  </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          ))}

          {forms.length < 5 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addForm}
                size="large"
              >
                Add Another Form ({forms.length}/5)
              </Button>
            </Box>
          )}
          </Box>
        </Paper>
      </Slide>

      {(results.length > 0 || historyLoading) && (
        <Fade in timeout={1200}>
          <Paper 
            elevation={8} 
            sx={{ 
              p: 4, 
              borderRadius: 4,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              mb: 4,
              p: 2,
              borderRadius: 2,
              background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 2, color: theme.palette.primary.main, fontSize: 32 }} />
                <Typography variant="h4" sx={{ 
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 'bold'
                }}>
                  URL History ({results.length})
                </Typography>
              </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={clearExpiredUrls}
                disabled={clearingExpired || historyLoading || results.filter(url => url.isExpired).length === 0}
                startIcon={clearingExpired ? <CircularProgress size={20} /> : <ClearAllIcon />}
                size="small"
                color="warning"
              >
                {clearingExpired 
                  ? 'Clearing...' 
                  : `Clear Expired (${results.filter(url => url.isExpired).length})`
                }
              </Button>
              <Button
                variant="outlined"
                onClick={refreshHistory}
                disabled={refreshing || historyLoading}
                startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                size="small"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
          </Box>

          {historyLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress size={60} />
              <Typography variant="body1" sx={{ ml: 2 }}>
                Loading URL history...
              </Typography>
            </Box>
          ) : results.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No URLs found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first shortened URL above to see it here.
              </Typography>
            </Box>
          ) : null}
          
          {results.length > 0 && (
            <Box sx={{ mt: 4 }}>
              {results.map((result, index) => (
                <Grow in timeout={800 + index * 100} key={result.id}>
                  <Card 
                    sx={{ 
                      mb: 3,
                      borderRadius: 3,
                      background: result.isExpired 
                        ? 'linear-gradient(145deg, #ffebee 0%, #f3e5f5 100%)'
                        : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                      border: result.isExpired 
                        ? `2px solid ${alpha(theme.palette.error.main, 0.3)}`
                        : `2px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      transition: 'all 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: result.isExpired
                          ? `0 8px 25px ${alpha(theme.palette.error.main, 0.2)}`
                          : `0 8px 25px ${alpha(theme.palette.success.main, 0.2)}`,
                      },
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: result.isExpired 
                          ? `linear-gradient(180deg, ${theme.palette.error.main}, ${theme.palette.error.light})`
                          : `linear-gradient(180deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                      }
                    }}
                  >
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
                            mb: 1,
                            fontWeight: 'medium'
                          }}
                        >
                          {result.originalUrl}
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
                            {result.shortLink}
                          </Typography>
                          <Tooltip title="Copy to clipboard">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(result.shortLink)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open in new tab">
                            <IconButton
                              size="small"
                              onClick={() => window.open(result.shortLink, '_blank')}
                              disabled={result.isExpired}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {result.shortcode && (
                            <Tooltip title="Delete URL">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteUrl(result.shortcode, result.originalUrl)}
                                disabled={deleting[result.shortcode]}
                                color="error"
                              >
                                {deleting[result.shortcode] ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <DeleteIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={3}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Status:
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip
                            label={result.isExpired ? 'Expired' : 'Active'}
                            color={result.isExpired ? "error" : "success"}
                            size="small"
                            variant={result.isExpired ? "filled" : "outlined"}
                          />
                          {result.totalClicks !== undefined && (
                            <Chip
                              label={`${result.totalClicks} clicks`}
                              color="info"
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Created: {formatExpiry(result.timestamp)}
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Expires:
                        </Typography>
                        <Typography variant="body2" color={result.isExpired ? "error" : "text.primary"}>
                          {formatExpiry(result.expiry)}
                        </Typography>
                        {result.source && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Source: {result.source}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                </Grow>
              ))}
            </Box>
          )}
          </Paper>
        </Fade>
      )}
    </Box>
  );
};

export default URLShortener;
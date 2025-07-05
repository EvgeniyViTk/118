import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { BotService } from '../services/BotService';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [isPaused, setIsPaused] = useState(false);
  const [clearDialog, setClearDialog] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    loadLogs();
    
    // Subscribe to real-time updates
    const unsubscribe = BotService.onDataChange((data) => {
      setLogs(data.logs || []);
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoRefresh && !isPaused) {
      intervalRef.current = setInterval(() => {
        loadLogs();
      }, refreshInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, isPaused, refreshInterval]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, levelFilter]);

  useEffect(() => {
    scrollToBottom();
  }, [filteredLogs]);

  const loadLogs = async () => {
    try {
      const logsData = BotService.getLogs();
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filter by level
    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level.toLowerCase() === levelFilter.toLowerCase());
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.level.toLowerCase().includes(searchLower) ||
        log.timestamp.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
  };

  const scrollToBottom = () => {
    if (logsEndRef.current && autoRefresh && !isPaused) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearLogs = () => {
    // In a real implementation, this would clear logs on the server
    setLogs([]);
    setClearDialog(false);
  };

  const handleExport = () => {
    const logText = filteredLogs.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot_logs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'error';
      case 'warning':
      case 'warn':
        return 'warning';
      case 'info':
        return 'info';
      case 'debug':
        return 'default';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  const getLevelIcon = (level) => {
    switch (level.toLowerCase()) {
      case 'error':
        return '❌';
      case 'warning':
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      case 'success':
        return '✅';
      default:
        return '📝';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLogCounts = () => {
    const counts = {
      total: logs.length,
      error: logs.filter(log => log.level.toLowerCase() === 'error').length,
      warning: logs.filter(log => log.level.toLowerCase() === 'warning' || log.level.toLowerCase() === 'warn').length,
      info: logs.filter(log => log.level.toLowerCase() === 'info').length,
      debug: logs.filter(log => log.level.toLowerCase() === 'debug').length,
    };
    return counts;
  };

  const logCounts = getLogCounts();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Logs
        </Typography>
        <Box>
          <IconButton
            onClick={() => setIsPaused(!isPaused)}
            color={isPaused ? 'error' : 'success'}
            sx={{ mr: 1 }}
          >
            {isPaused ? <PlayIcon /> : <PauseIcon />}
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadLogs}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<DeleteIcon />}
            onClick={() => setClearDialog(true)}
            color="error"
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Log Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                {logCounts.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                {logCounts.error}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Errors
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                {logCounts.warning}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Warnings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                {logCounts.info}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Info
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                {logCounts.debug}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Debug
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  endAdornment: searchTerm && (
                    <IconButton onClick={() => setSearchTerm('')} size="small">
                      <ClearIcon />
                    </IconButton>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Level</InputLabel>
                <Select
                  value={levelFilter}
                  label="Level"
                  onChange={(e) => setLevelFilter(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!autoRefresh}>
                <InputLabel>Refresh Rate</InputLabel>
                <Select
                  value={refreshInterval}
                  label="Refresh Rate"
                  onChange={(e) => setRefreshInterval(e.target.value)}
                >
                  <MenuItem value={1000}>1 second</MenuItem>
                  <MenuItem value={2000}>2 seconds</MenuItem>
                  <MenuItem value={5000}>5 seconds</MenuItem>
                  <MenuItem value={10000}>10 seconds</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Status */}
      <Box display="flex" alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredLogs.length} of {logs.length} logs
        </Typography>
        {isPaused && (
          <Chip
            label="Paused"
            color="warning"
            size="small"
            sx={{ ml: 2 }}
          />
        )}
        {autoRefresh && !isPaused && (
          <Chip
            label={`Auto-refresh: ${refreshInterval / 1000}s`}
            color="success"
            size="small"
            sx={{ ml: 2 }}
          />
        )}
      </Box>

      {/* Logs Display */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ maxHeight: 600, overflow: 'auto', bgcolor: 'background.paper' }}>
            {filteredLogs.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="text.secondary">
                  No logs found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {logs.length === 0 ? 'No logs available' : 'Try adjusting your filters'}
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {filteredLogs.map((log, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        py: 1,
                        px: 2,
                        borderLeft: 4,
                        borderLeftColor: `${getLevelColor(log.level)}.main`,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {getLevelIcon(log.level)}
                            </Typography>
                            <Chip
                              label={log.level}
                              size="small"
                              color={getLevelColor(log.level)}
                              sx={{ mr: 2, minWidth: 60 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {formatTimestamp(log.timestamp)}
                            </Typography>
                          </Box>
                          <IconButton size="small">
                            {expandedLog === index ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontFamily: 'monospace',
                            wordBreak: 'break-word',
                            whiteSpace: expandedLog === index ? 'pre-wrap' : 'nowrap',
                            overflow: expandedLog === index ? 'visible' : 'hidden',
                            textOverflow: expandedLog === index ? 'unset' : 'ellipsis',
                          }}
                        >
                          {log.message}
                        </Typography>
                        {expandedLog === index && (
                          <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Timestamp:</strong> {log.timestamp}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Level:</strong> {log.level}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              <strong>Message:</strong> {log.message}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </ListItem>
                    {index < filteredLogs.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
            <div ref={logsEndRef} />
          </Box>
        </CardContent>
      </Card>

      {/* Clear Logs Dialog */}
      <Dialog
        open={clearDialog}
        onClose={() => setClearDialog(false)}
      >
        <DialogTitle>Clear Logs</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Are you sure you want to clear all logs? This action cannot be undone.
          </Alert>
          <Typography variant="body1">
            This will permanently delete all {logs.length} log entries.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleClearLogs}
            variant="contained"
            color="error"
          >
            Clear All Logs
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Logs;
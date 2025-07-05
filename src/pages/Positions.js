import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  TrendingUp,
  TrendingDown,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import { BotService } from '../services/BotService';

const Positions = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('symbol');
  const [sortOrder, setSortOrder] = useState('asc');
  const [closeDialog, setCloseDialog] = useState({ open: false, position: null });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPositions();
    
    // Subscribe to real-time updates
    const unsubscribe = BotService.onDataChange((data) => {
      setPositions(data.positions || []);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadPositions = async () => {
    try {
      const positionsData = BotService.getPositions();
      setPositions(positionsData);
    } catch (error) {
      console.error('Error loading positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPositions();
    setRefreshing(false);
  };

  const handleClosePosition = (position) => {
    setCloseDialog({ open: false, position: null });
    // In a real implementation, you would close the position here
    console.log('Closing position:', position);
  };

  const handleExport = () => {
    const csv = convertToCSV(filteredAndSortedPositions);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `positions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    const headers = ['Symbol', 'Side', 'Type', 'Size', 'Entry Price', 'Current Price', 'PnL', 'PnL %', 'Timestamp'];
    const rows = data.map(position => [
      position.symbol,
      position.side,
      position.type,
      position.size,
      position.entryPrice,
      position.currentPrice,
      position.pnl,
      calculatePnlPercent(position),
      position.timestamp
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const calculatePnlPercent = (position) => {
    const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
    return position.side === 'short' ? -pnlPercent : pnlPercent;
  };

  const getPositionColor = (pnl) => {
    return pnl >= 0 ? 'success.main' : 'error.main';
  };

  const filteredAndSortedPositions = positions
    .filter(position => {
      if (filter === 'all') return true;
      if (filter === 'profitable') return position.pnl > 0;
      if (filter === 'losing') return position.pnl < 0;
      if (filter === 'long') return position.side === 'long';
      if (filter === 'short') return position.side === 'short';
      return true;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'pnl' || sortBy === 'size' || sortBy === 'entryPrice' || sortBy === 'currentPrice') {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const totalPnl = positions.reduce((sum, position) => sum + position.pnl, 0);
  const profitablePositions = positions.filter(pos => pos.pnl > 0);
  const losingPositions = positions.filter(pos => pos.pnl < 0);
  const longPositions = positions.filter(pos => pos.side === 'long');
  const shortPositions = positions.filter(pos => pos.side === 'short');

  const positionTypes = {
    regular: positions.filter(pos => pos.type === 'regular'),
    additional: positions.filter(pos => pos.type === 'additional'),
    counter: positions.filter(pos => pos.type === 'counter'),
  };

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
          Positions
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 1 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Total PnL
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: getPositionColor(totalPnl), fontWeight: 'bold' }}>
                    {formatCurrency(totalPnl)}
                  </Typography>
                </Box>
                <Assessment sx={{ color: getPositionColor(totalPnl), fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Active Positions
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {positions.length}
                  </Typography>
                </Box>
                <Timeline sx={{ color: 'primary.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Profitable
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                    {profitablePositions.length}
                  </Typography>
                </Box>
                <TrendingUp sx={{ color: 'success.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Losing
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                    {losingPositions.length}
                  </Typography>
                </Box>
                <TrendingDown sx={{ color: 'error.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Position Type Breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Position Distribution
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Regular Positions
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={positions.length > 0 ? (positionTypes.regular.length / positions.length) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2">
                  {positionTypes.regular.length} / {positions.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Additional Positions
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={positions.length > 0 ? (positionTypes.additional.length / positions.length) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2">
                  {positionTypes.additional.length} / {positions.length}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Counter Positions
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={positions.length > 0 ? (positionTypes.counter.length / positions.length) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                />
                <Typography variant="body2">
                  {positionTypes.counter.length} / {positions.length}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters and Sorting */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={filter}
                  label="Filter"
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <MenuItem value="all">All Positions</MenuItem>
                  <MenuItem value="profitable">Profitable</MenuItem>
                  <MenuItem value="losing">Losing</MenuItem>
                  <MenuItem value="long">Long</MenuItem>
                  <MenuItem value="short">Short</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="symbol">Symbol</MenuItem>
                  <MenuItem value="pnl">PnL</MenuItem>
                  <MenuItem value="size">Size</MenuItem>
                  <MenuItem value="entryPrice">Entry Price</MenuItem>
                  <MenuItem value="currentPrice">Current Price</MenuItem>
                  <MenuItem value="timestamp">Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={sortOrder}
                  label="Order"
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Positions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Position Details ({filteredAndSortedPositions.length} positions)
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell align="right">Entry Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">PnL</TableCell>
                  <TableCell align="right">PnL %</TableCell>
                  <TableCell align="right">Time</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedPositions.map((position) => {
                  const pnlPercent = calculatePnlPercent(position);
                  
                  return (
                    <TableRow key={position.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>
                        {position.symbol}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={position.side.toUpperCase()}
                          size="small"
                          color={position.side === 'long' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={position.type}
                          size="small"
                          variant="outlined"
                          color={position.type === 'regular' ? 'primary' : position.type === 'additional' ? 'secondary' : 'info'}
                        />
                      </TableCell>
                      <TableCell align="right">{position.size}</TableCell>
                      <TableCell align="right">{formatCurrency(position.entryPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: getPositionColor(position.pnl), fontWeight: 'medium' }}>
                          {formatCurrency(position.pnl)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ color: getPositionColor(position.pnl), fontWeight: 'medium' }}>
                          {formatPercent(pnlPercent)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {new Date(position.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Close Position">
                          <IconButton
                            size="small"
                            onClick={() => setCloseDialog({ open: true, position })}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {filteredAndSortedPositions.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography variant="h6" color="text.secondary">
                No positions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filter !== 'all' ? 'Try changing your filter settings' : 'No active positions at the moment'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Close Position Dialog */}
      <Dialog
        open={closeDialog.open}
        onClose={() => setCloseDialog({ open: false, position: null })}
      >
        <DialogTitle>Close Position</DialogTitle>
        <DialogContent>
          {closeDialog.position && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to close this position? This action cannot be undone.
              </Alert>
              <Typography variant="body1">
                <strong>Symbol:</strong> {closeDialog.position.symbol}
              </Typography>
              <Typography variant="body1">
                <strong>Side:</strong> {closeDialog.position.side.toUpperCase()}
              </Typography>
              <Typography variant="body1">
                <strong>Size:</strong> {closeDialog.position.size}
              </Typography>
              <Typography variant="body1">
                <strong>Current PnL:</strong> {formatCurrency(closeDialog.position.pnl)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseDialog({ open: false, position: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleClosePosition(closeDialog.position)}
            variant="contained"
            color="error"
          >
            Close Position
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Positions;
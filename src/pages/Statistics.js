import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  Timeline,
  Speed,
  ShowChart,
  PieChart,
  BarChart,
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar } from 'recharts';
import { BotService } from '../services/BotService';

const Statistics = () => {
  const [statistics, setStatistics] = useState({});
  const [positions, setPositions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
    
    // Subscribe to real-time updates
    const unsubscribe = BotService.onDataChange((data) => {
      setStatistics(data.statistics || {});
      setPositions(data.positions || []);
      setLogs(data.logs || []);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadStatistics = async () => {
    try {
      setStatistics(BotService.getStatistics());
      setPositions(BotService.getPositions());
      setLogs(BotService.getLogs());
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const handleExport = () => {
    const data = {
      statistics,
      positions,
      logs: logs.slice(0, 100), // Export last 100 logs
      exportTime: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot_statistics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    return `${percent.toFixed(2)}%`;
  };

  // Generate mock historical data for charts
  const generateHistoricalData = () => {
    const data = [];
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    
    for (let i = hours; i >= 0; i--) {
      const time = new Date(now - i * 60 * 60 * 1000);
      const baseValue = statistics.totalPnl || 0;
      const variation = (Math.random() - 0.5) * 100;
      
      data.push({
        time: time.toISOString().split('T')[1].slice(0, 5),
        pnl: baseValue + variation,
        trades: Math.floor(Math.random() * 10) + 1,
        winRate: Math.random() * 100,
      });
    }
    
    return data;
  };

  const historicalData = generateHistoricalData();

  // Calculate metrics
  const totalPnl = statistics.totalPnl || 0;
  const todayPnl = statistics.todayPnl || 0;
  const totalTrades = statistics.totalTrades || 0;
  const successfulTrades = statistics.successfulTrades || 0;
  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

  const profitablePositions = positions.filter(pos => pos.pnl > 0);
  const losingPositions = positions.filter(pos => pos.pnl < 0);
  const longPositions = positions.filter(pos => pos.side === 'long');
  const shortPositions = positions.filter(pos => pos.side === 'short');

  // Position type distribution
  const positionTypeData = [
    { name: 'Regular', value: positions.filter(pos => pos.type === 'regular').length, color: '#00d4aa' },
    { name: 'Additional', value: positions.filter(pos => pos.type === 'additional').length, color: '#ff6b6b' },
    { name: 'Counter', value: positions.filter(pos => pos.type === 'counter').length, color: '#2196f3' },
  ].filter(item => item.value > 0);

  // Symbol performance
  const symbolPerformance = positions.reduce((acc, pos) => {
    const symbol = pos.symbol;
    if (!acc[symbol]) {
      acc[symbol] = { symbol, pnl: 0, trades: 0, winRate: 0, wins: 0 };
    }
    acc[symbol].pnl += pos.pnl;
    acc[symbol].trades += 1;
    if (pos.pnl > 0) acc[symbol].wins += 1;
    return acc;
  }, {});

  Object.values(symbolPerformance).forEach(item => {
    item.winRate = item.trades > 0 ? (item.wins / item.trades) * 100 : 0;
  });

  const symbolData = Object.values(symbolPerformance)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 10);

  // Colors for charts
  const COLORS = ['#00d4aa', '#ff6b6b', '#2196f3', '#ff9800', '#9c27b0', '#4caf50', '#f44336', '#795548'];

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
          Statistics
        </Typography>
        <Box>
          <FormControl sx={{ minWidth: 120, mr: 1 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="24h">24 Hours</MenuItem>
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
            </Select>
          </FormControl>
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
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Total PnL
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: totalPnl >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                    {formatCurrency(totalPnl)}
                  </Typography>
                </Box>
                <AttachMoney sx={{ color: totalPnl >= 0 ? 'success.main' : 'error.main', fontSize: 32 }} />
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
                    Win Rate
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {formatPercent(winRate)}
                  </Typography>
                </Box>
                <Assessment sx={{ color: 'primary.main', fontSize: 32 }} />
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
                    Total Trades
                  </Typography>
                  <Typography variant="h5" component="div" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                    {totalTrades}
                  </Typography>
                </Box>
                <ShowChart sx={{ color: 'info.main', fontSize: 32 }} />
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
                  <Typography variant="h5" component="div" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                    {positions.length}
                  </Typography>
                </Box>
                <Timeline sx={{ color: 'warning.main', fontSize: 32 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* PnL Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PnL Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    dot={{ fill: '#00d4aa' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Position Type Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Position Types
              </Typography>
              {positionTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={positionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {positionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" color="text.secondary">
                    No position data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Metrics
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Win Rate</Typography>
                  <Typography variant="body2">{formatPercent(winRate)}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={winRate}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: winRate >= 60 ? 'success.main' : winRate >= 40 ? 'warning.main' : 'error.main',
                    },
                  }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      {profitablePositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Profitable
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: 'error.main' }}>
                      {losingPositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Losing
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Position Distribution
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Long Positions</Typography>
                  <Typography variant="body2">{longPositions.length}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={positions.length > 0 ? (longPositions.length / positions.length) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Short Positions</Typography>
                  <Typography variant="body2">{shortPositions.length}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={positions.length > 0 ? (shortPositions.length / positions.length) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, color: 'error.main' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Symbol Performance */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Symbol Performance (Top 10)
              </Typography>
              {symbolData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={symbolData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symbol" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="pnl" fill="#00d4aa" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height={300}>
                  <Typography variant="body2" color="text.secondary">
                    No symbol data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Symbols
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">PnL</TableCell>
                      <TableCell align="right">Win Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {symbolData.slice(0, 8).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.symbol}</TableCell>
                        <TableCell align="right">
                          <Typography sx={{ color: row.pnl >= 0 ? 'success.main' : 'error.main' }}>
                            {formatCurrency(row.pnl)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatPercent(row.winRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {symbolData.length === 0 && (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary">
                    No trading data available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Statistics;
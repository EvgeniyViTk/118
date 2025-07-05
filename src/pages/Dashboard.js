import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  ShowChart,
  Speed,
  AttachMoney,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import { BotService } from '../services/BotService';

const Dashboard = () => {
  const [data, setData] = useState({
    positions: [],
    statistics: {},
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState('stopped');

  useEffect(() => {
    // Load initial data
    loadData();

    // Subscribe to real-time updates
    const unsubscribe = BotService.onDataChange((newData) => {
      setData(newData);
    });

    const unsubscribeStatus = BotService.onStatusChange((status) => {
      setBotStatus(status);
    });

    return () => {
      unsubscribe();
      unsubscribeStatus();
    };
  }, []);

  const loadData = async () => {
    try {
      setData({
        positions: BotService.getPositions(),
        statistics: BotService.getStatistics(),
        logs: BotService.getLogs(),
      });
      setBotStatus(BotService.getStatus());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'primary.main', trend = null }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color: color, fontWeight: 'bold', mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                )}
                <Typography variant="body2" sx={{ color: trend > 0 ? 'success.main' : 'error.main' }}>
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

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

  const getPositionColor = (pnl) => {
    return pnl >= 0 ? 'success.main' : 'error.main';
  };

  const getBotStatusColor = () => {
    switch (botStatus) {
      case 'running':
        return 'success';
      case 'error':
        return 'error';
      case 'stopped':
        return 'default';
      default:
        return 'warning';
    }
  };

  const getBotStatusText = () => {
    switch (botStatus) {
      case 'running':
        return 'Running';
      case 'error':
        return 'Error';
      case 'stopped':
        return 'Stopped';
      case 'starting':
        return 'Starting...';
      case 'stopping':
        return 'Stopping...';
      default:
        return 'Unknown';
    }
  };

  const totalPnl = data.statistics.totalPnl || 0;
  const todayPnl = data.statistics.todayPnl || 0;
  const winRate = data.statistics.winRate || 0;
  const totalTrades = data.statistics.totalTrades || 0;
  const successfulTrades = data.statistics.successfulTrades || 0;

  const activePositions = data.positions.filter(pos => pos.pnl !== 0);
  const profitablePositions = activePositions.filter(pos => pos.pnl > 0);
  const losingPositions = activePositions.filter(pos => pos.pnl < 0);

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
          Dashboard
        </Typography>
        <Chip
          label={getBotStatusText()}
          color={getBotStatusColor()}
          sx={{ fontSize: '0.875rem', fontWeight: 'medium' }}
        />
      </Box>

      {botStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Bot encountered an error. Please check the logs for more details.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total PnL"
            value={formatCurrency(totalPnl)}
            subtitle="All time"
            icon={<AttachMoney sx={{ fontSize: 40 }} />}
            color={totalPnl >= 0 ? 'success.main' : 'error.main'}
            trend={totalPnl >= 0 ? 12.5 : -8.2}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's PnL"
            value={formatCurrency(todayPnl)}
            subtitle="24 hours"
            icon={<Timeline sx={{ fontSize: 40 }} />}
            color={todayPnl >= 0 ? 'success.main' : 'error.main'}
            trend={todayPnl >= 0 ? 5.3 : -2.1}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            subtitle={`${successfulTrades}/${totalTrades} trades`}
            icon={<Assessment sx={{ fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Positions"
            value={activePositions.length}
            subtitle={`${profitablePositions.length} profitable`}
            icon={<ShowChart sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>

        {/* Bot Status Overview */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Bot Status Overview
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Performance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {winRate.toFixed(1)}%
                  </Typography>
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
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      {profitablePositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Profitable
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: 'error.main' }}>
                      {losingPositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Losing
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center">
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      {activePositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Active
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {data.logs.slice(0, 5).map((log, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <Chip
                        label={log.level}
                        size="small"
                        color={log.level === 'ERROR' ? 'error' : log.level === 'WARNING' ? 'warning' : 'info'}
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                      {log.message}
                    </Typography>
                    {index < 4 && <Divider sx={{ mt: 1 }} />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Positions Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Positions
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activePositions.map((position) => {
                      const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
                      const adjustedPnlPercent = position.side === 'short' ? -pnlPercent : pnlPercent;
                      
                      return (
                        <TableRow key={position.id}>
                          <TableCell>{position.symbol}</TableCell>
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
                            />
                          </TableCell>
                          <TableCell align="right">{position.size}</TableCell>
                          <TableCell align="right">{formatCurrency(position.entryPrice)}</TableCell>
                          <TableCell align="right">{formatCurrency(position.currentPrice)}</TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: getPositionColor(position.pnl) }}>
                              {formatCurrency(position.pnl)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography sx={{ color: getPositionColor(position.pnl) }}>
                              {formatPercent(adjustedPnlPercent)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {activePositions.length === 0 && (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary">
                    No active positions
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

export default Dashboard;
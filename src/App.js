import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Assessment as AssessmentIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';

// Import pages
import Dashboard from './pages/Dashboard';
import Configuration from './pages/Configuration';
import Positions from './pages/Positions';
import Statistics from './pages/Statistics';
import Logs from './pages/Logs';

// Import services
import { BotService } from './services/BotService';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [botStatus, setBotStatus] = useState('stopped');
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    // Initialize bot service
    const initializeService = async () => {
      try {
        await BotService.initialize();
      } catch (error) {
        console.error('Failed to initialize bot service:', error);
      }
    };
    
    initializeService();
    
    // Subscribe to bot status changes
    const unsubscribe = BotService.onStatusChange((status) => {
      setBotStatus(status);
    });

    // Subscribe to notifications
    const unsubscribeNotifications = BotService.onNotification(() => {
      setNotifications(prev => prev + 1);
    });

    return () => {
      unsubscribe();
      unsubscribeNotifications();
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleStartBot = async () => {
    try {
      await BotService.startBot();
    } catch (error) {
      console.error('Error starting bot:', error);
    }
  };

  const handleStopBot = async () => {
    try {
      await BotService.stopBot();
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Configuration', icon: <SettingsIcon />, path: '/configuration' },
    { text: 'Positions', icon: <TrendingUpIcon />, path: '/positions' },
    { text: 'Statistics', icon: <AssessmentIcon />, path: '/statistics' },
    { text: 'Logs', icon: <AccountBalanceIcon />, path: '/logs' },
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Gate.io Bot
        </Typography>
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem 
            key={item.text} 
            button 
            component="a" 
            href={item.path}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(0, 212, 170, 0.1)',
              },
            }}
          >
            <ListItemIcon sx={{ color: 'primary.main' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const getBotStatusColor = () => {
    switch (botStatus) {
      case 'running':
        return 'success.main';
      case 'error':
        return 'error.main';
      case 'stopped':
        return 'grey.500';
      default:
        return 'warning.main';
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
      default:
        return 'Loading';
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2f4a 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Gate.io Trading Bot
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: getBotStatusColor(),
                  animation: botStatus === 'running' ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 },
                  },
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {getBotStatusText()}
              </Typography>
            </Box>

            <IconButton color="inherit">
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            {botStatus === 'stopped' ? (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartBot}
                sx={{ minWidth: 100 }}
              >
                Start
              </Button>
            ) : (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopBot}
                sx={{ minWidth: 100 }}
              >
                Stop
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: 250 }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: 250,
              border: 'none',
              background: 'linear-gradient(135deg, #1a1f3a 0%, #2a2f4a 100%)',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - 250px)` },
          mt: 8,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
}

export default App;
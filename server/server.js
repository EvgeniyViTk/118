const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Bot process and state
let botProcess = null;
let botStatus = 'stopped';
let botConfig = null;
let positions = [];
let statistics = {
  totalTrades: 0,
  successfulTrades: 0,
  totalPnl: 0,
  todayPnl: 0,
  winRate: 0,
};
let logs = [];

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

// Broadcast data to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Add log entry
function addLog(level, message) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  
  logs.unshift(logEntry);
  
  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000);
  }
  
  // Broadcast log update
  broadcast({
    type: 'log',
    data: logEntry,
  });
}

// Load configuration from file
function loadConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      botConfig = JSON.parse(configData);
      addLog('INFO', 'Configuration loaded from file');
    } else {
      botConfig = getDefaultConfig();
      saveConfig();
      addLog('INFO', 'Default configuration created');
    }
  } catch (error) {
    addLog('ERROR', `Error loading configuration: ${error.message}`);
    botConfig = getDefaultConfig();
  }
}

// Save configuration to file
function saveConfig() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));
    addLog('INFO', 'Configuration saved');
  } catch (error) {
    addLog('ERROR', `Error saving configuration: ${error.message}`);
  }
}

// Get default configuration
function getDefaultConfig() {
  return {
    apiKey: '',
    apiSecret: '',
    testnet: false,
    symbols: [
      'BTC_USDT', 'ETH_USDT', 'ADA_USDT', 'DOT_USDT', 'LINK_USDT',
      'BNB_USDT', 'SOL_USDT', 'MATIC_USDT', 'AVAX_USDT', 'ATOM_USDT'
    ],
    longLevels: [
      { percent: 1.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 1.5, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 2.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 2.5, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 3.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
    ],
    shortLevels: [
      { percent: -1.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -1.5, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -2.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -2.5, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -3.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
    ],
    additionalLongLevels: [
      { percent: 1.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 2.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: 3.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
    ],
    additionalShortLevels: [
      { percent: -1.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -2.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: -3.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
    ],
    counterLongLevels: [
      { percent: -1.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: -2.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
      { percent: -3.0, amount: 0.3, tpPercent: 2, slPercent: 1 },
    ],
    counterShortLevels: [
      { percent: 1.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: 2.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
      { percent: 3.0, amount: 0.3, tpPercent: -2, slPercent: 1 },
    ],
    globalTpThreshold: 100,
    useRealizedPnl: false,
    apiRateLimitDelay: 0.1,
    maxConcurrentSymbols: 1000,
  };
}

// Create Python config file
function createPythonConfig() {
  const pythonConfig = {
    'api_key': botConfig.apiKey,
    'api_secret': botConfig.apiSecret,
    'symbols': botConfig.symbols,
    'long_levels': botConfig.longLevels,
    'short_levels': botConfig.shortLevels,
    'additional_long_levels': botConfig.additionalLongLevels,
    'additional_short_levels': botConfig.additionalShortLevels,
    'counter_long_levels': botConfig.counterLongLevels,
    'counter_short_levels': botConfig.counterShortLevels,
    'global_tp_threshold': botConfig.globalTpThreshold,
    'use_realized_pnl': botConfig.useRealizedPnl,
    'api_rate_limit_delay': botConfig.apiRateLimitDelay,
    'max_concurrent_symbols': botConfig.maxConcurrentSymbols,
    'testnet': botConfig.testnet
  };
  
  try {
    const configPath = path.join(__dirname, 'python_config.json');
    fs.writeFileSync(configPath, JSON.stringify(pythonConfig, null, 2));
    return true;
  } catch (error) {
    addLog('ERROR', `Error creating Python config: ${error.message}`);
    return false;
  }
}

// Start Python bot
function startBot() {
  return new Promise((resolve, reject) => {
    if (botProcess) {
      return reject(new Error('Bot is already running'));
    }
    
    if (!botConfig.apiKey || !botConfig.apiSecret) {
      return reject(new Error('API credentials not configured'));
    }
    
    // Create Python config file
    if (!createPythonConfig()) {
      return reject(new Error('Failed to create Python configuration'));
    }
    
    addLog('INFO', 'Starting bot...');
    botStatus = 'starting';
    broadcast({ type: 'status', data: botStatus });
    
    // Start Python bot process
    const pythonScript = path.join(__dirname, '..', 'gate_bot_isolated.py');
    botProcess = spawn('python', [pythonScript], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    botProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addLog('INFO', `Bot: ${message}`);
        parseLogMessage(message);
      }
    });
    
    botProcess.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        addLog('ERROR', `Bot Error: ${message}`);
      }
    });
    
    botProcess.on('close', (code) => {
      addLog('INFO', `Bot process exited with code ${code}`);
      botStatus = 'stopped';
      botProcess = null;
      broadcast({ type: 'status', data: botStatus });
    });
    
    botProcess.on('error', (error) => {
      addLog('ERROR', `Bot process error: ${error.message}`);
      botStatus = 'error';
      botProcess = null;
      broadcast({ type: 'status', data: botStatus });
      reject(error);
    });
    
    // Wait for bot to start
    setTimeout(() => {
      if (botProcess) {
        botStatus = 'running';
        broadcast({ type: 'status', data: botStatus });
        addLog('INFO', 'Bot started successfully');
        resolve();
      } else {
        reject(new Error('Bot failed to start'));
      }
    }, 3000);
  });
}

// Stop Python bot
function stopBot() {
  return new Promise((resolve) => {
    if (!botProcess) {
      botStatus = 'stopped';
      broadcast({ type: 'status', data: botStatus });
      return resolve();
    }
    
    addLog('INFO', 'Stopping bot...');
    botStatus = 'stopping';
    broadcast({ type: 'status', data: botStatus });
    
    botProcess.kill('SIGTERM');
    
    setTimeout(() => {
      if (botProcess) {
        botProcess.kill('SIGKILL');
      }
      botProcess = null;
      botStatus = 'stopped';
      broadcast({ type: 'status', data: botStatus });
      addLog('INFO', 'Bot stopped');
      resolve();
    }, 5000);
  });
}

// Parse log messages for data extraction
function parseLogMessage(message) {
  // Extract position information
  if (message.includes('Position opened') || message.includes('Position closed')) {
    // Update positions data
    updatePositionsFromLog(message);
  }
  
  // Extract statistics
  if (message.includes('PNL:') || message.includes('Statistics:')) {
    updateStatisticsFromLog(message);
  }
}

// Update positions from log message
function updatePositionsFromLog(message) {
  // This would parse the log message and update positions
  // For demo purposes, we'll generate mock data
  generateMockPositions();
}

// Update statistics from log message
function updateStatisticsFromLog(message) {
  // This would parse the log message and update statistics
  // For demo purposes, we'll generate mock data
  statistics.totalTrades += Math.floor(Math.random() * 5);
  statistics.successfulTrades += Math.floor(Math.random() * 3);
  statistics.totalPnl += (Math.random() - 0.5) * 100;
  statistics.todayPnl += (Math.random() - 0.5) * 50;
  statistics.winRate = statistics.totalTrades > 0 ? (statistics.successfulTrades / statistics.totalTrades) * 100 : 0;
  
  broadcast({
    type: 'statistics',
    data: statistics,
  });
}

// Generate mock positions for demo
function generateMockPositions() {
  const symbols = botConfig.symbols.slice(0, 10);
  positions = [];
  
  for (let i = 0; i < Math.floor(Math.random() * 8) + 3; i++) {
    positions.push({
      id: i,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      side: Math.random() > 0.5 ? 'long' : 'short',
      size: Math.floor(Math.random() * 1000) + 100,
      entryPrice: Math.floor(Math.random() * 50000) + 1000,
      currentPrice: Math.floor(Math.random() * 50000) + 1000,
      pnl: (Math.random() - 0.5) * 1000,
      type: ['regular', 'additional', 'counter'][Math.floor(Math.random() * 3)],
      timestamp: new Date().toISOString(),
    });
  }
  
  broadcast({
    type: 'positions',
    data: positions,
  });
}

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: botStatus,
    uptime: botProcess ? process.uptime() : 0,
  });
});

app.get('/api/config', (req, res) => {
  res.json(botConfig);
});

app.post('/api/config', (req, res) => {
  try {
    botConfig = req.body;
    saveConfig();
    res.json({ success: true, message: 'Configuration saved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/start', async (req, res) => {
  try {
    await startBot();
    res.json({ success: true, message: 'Bot started successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/stop', async (req, res) => {
  try {
    await stopBot();
    res.json({ success: true, message: 'Bot stopped successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/positions', (req, res) => {
  res.json(positions);
});

app.get('/api/statistics', (req, res) => {
  res.json(statistics);
});

app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  res.json(logs.slice(0, limit));
});

app.post('/api/test-connection', (req, res) => {
  // This would test the API connection with the provided credentials
  // For demo purposes, we'll simulate success
  setTimeout(() => {
    res.json({ success: true, message: 'API connection successful' });
  }, 1000);
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  addLog('INFO', 'Client connected to WebSocket');
  
  // Send current data to new client
  ws.send(JSON.stringify({
    type: 'initial',
    data: {
      status: botStatus,
      positions,
      statistics,
      logs: logs.slice(0, 50),
    },
  }));
  
  ws.on('close', () => {
    addLog('INFO', 'Client disconnected from WebSocket');
  });
});

// Initialize server
loadConfig();
addLog('INFO', 'Server starting...');

// Generate some initial mock data
if (botConfig.symbols.length > 0) {
  generateMockPositions();
}

app.listen(PORT, () => {
  addLog('INFO', `Server running on port ${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:8080`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (botProcess) {
    await stopBot();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  if (botProcess) {
    await stopBot();
  }
  process.exit(0);
});
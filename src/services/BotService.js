class BotService {
  constructor() {
    this.status = 'stopped';
    this.config = null;
    this.positions = [];
    this.statistics = {
      totalTrades: 0,
      successfulTrades: 0,
      totalPnl: 0,
      todayPnl: 0,
      winRate: 0,
    };
    this.logs = [];
    this.statusListeners = [];
    this.notificationListeners = [];
    this.dataListeners = [];
    this.socket = null;
    this.maxLogs = 1000;
  }

  async initialize() {
    await this.loadConfig();
    this.setupWebSocket();
    this.loadStoredData();
  }

  setupWebSocket() {
    // Connect to real WebSocket server
    try {
      this.socket = new WebSocket('ws://localhost:8080');
      
      this.socket.onopen = () => {
        console.log('Connected to WebSocket server');
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed, attempting to reconnect...');
        setTimeout(() => this.setupWebSocket(), 5000);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket, falling back to simulation');
      this.simulateDataUpdates();
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'initial':
        this.status = data.data.status;
        this.positions = data.data.positions || [];
        this.statistics = data.data.statistics || this.statistics;
        this.logs = data.data.logs || [];
        this.notifyStatusListeners();
        this.notifyDataListeners();
        break;
      case 'status':
        this.status = data.data;
        this.notifyStatusListeners();
        break;
      case 'positions':
        this.positions = data.data;
        this.notifyDataListeners();
        break;
      case 'statistics':
        this.statistics = data.data;
        this.notifyDataListeners();
        break;
      case 'log':
        this.logs.unshift(data.data);
        if (this.logs.length > this.maxLogs) {
          this.logs = this.logs.slice(0, this.maxLogs);
        }
        this.notifyDataListeners();
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  simulateDataUpdates() {
    // Simulate real-time data updates when WebSocket is not available
    setInterval(() => {
      if (this.status === 'running') {
        this.updateSimulatedData();
      }
    }, 2000);
  }

  updateSimulatedData() {
    // Simulate position updates
    this.positions = this.generateMockPositions();
    
    // Simulate statistics updates
    this.statistics = {
      ...this.statistics,
      totalPnl: this.statistics.totalPnl + (Math.random() - 0.5) * 10,
      todayPnl: this.statistics.todayPnl + (Math.random() - 0.5) * 5,
    };

    // Add random log entries
    if (Math.random() < 0.1) {
      this.addLog('INFO', `Position opened: ${this.getRandomSymbol()} at ${new Date().toISOString()}`);
    }

    // Notify listeners
    this.notifyDataListeners();
  }

  generateMockPositions() {
    const symbols = ['BTC_USDT', 'ETH_USDT', 'ADA_USDT', 'DOT_USDT', 'LINK_USDT'];
    const positions = [];
    
    for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
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
    
    return positions;
  }

  getRandomSymbol() {
    const symbols = ['BTC_USDT', 'ETH_USDT', 'ADA_USDT', 'DOT_USDT', 'LINK_USDT'];
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  async loadConfig() {
    // Try to load from server first
    try {
      const response = await fetch('http://localhost:5000/api/config');
      if (response.ok) {
        const serverConfig = await response.json();
        this.config = serverConfig;
        localStorage.setItem('botConfig', JSON.stringify(serverConfig));
        return;
      }
    } catch (error) {
      console.log('Could not load config from server, using local storage');
    }
    
    // Fallback to local storage
    const savedConfig = localStorage.getItem('botConfig');
    if (savedConfig) {
      this.config = JSON.parse(savedConfig);
    } else {
      this.config = this.getDefaultConfig();
    }
  }

  getDefaultConfig() {
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

  loadStoredData() {
    const savedStats = localStorage.getItem('botStatistics');
    if (savedStats) {
      this.statistics = JSON.parse(savedStats);
    }

    const savedLogs = localStorage.getItem('botLogs');
    if (savedLogs) {
      this.logs = JSON.parse(savedLogs);
    }
  }

  async saveConfig(config) {
    this.config = config;
    localStorage.setItem('botConfig', JSON.stringify(config));
    
    // Also save to server
    try {
      const response = await fetch('http://localhost:5000/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save config to server');
      }
    } catch (error) {
      console.error('Error saving config to server:', error);
    }
  }

  saveStatistics() {
    localStorage.setItem('botStatistics', JSON.stringify(this.statistics));
  }

  saveLogs() {
    localStorage.setItem('botLogs', JSON.stringify(this.logs));
  }

  async startBot() {
    if (!this.config || !this.config.apiKey || !this.config.apiSecret) {
      throw new Error('API credentials not configured');
    }

    this.status = 'starting';
    this.notifyStatusListeners();

    try {
      const response = await fetch('http://localhost:5000/api/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start bot');
      }
      
      this.status = 'running';
      this.addLog('INFO', 'Bot started successfully');
      this.notifyStatusListeners();
      this.notifyNotificationListeners();
      
      return result;
    } catch (error) {
      this.status = 'error';
      this.addLog('ERROR', `Failed to start bot: ${error.message}`);
      this.notifyStatusListeners();
      throw error;
    }
  }

  async stopBot() {
    this.status = 'stopping';
    this.notifyStatusListeners();

    try {
      const response = await fetch('http://localhost:5000/api/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to stop bot');
      }
      
      this.status = 'stopped';
      this.addLog('INFO', 'Bot stopped successfully');
      this.notifyStatusListeners();
      this.notifyNotificationListeners();
      
      return result;
    } catch (error) {
      this.status = 'error';
      this.addLog('ERROR', `Failed to stop bot: ${error.message}`);
      this.notifyStatusListeners();
      throw error;
    }
  }

  async simulateApiCall() {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  addLog(level, message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only the last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    this.saveLogs();
  }

  getConfig() {
    return this.config;
  }

  getPositions() {
    return this.positions;
  }

  getStatistics() {
    return this.statistics;
  }

  getLogs() {
    return this.logs;
  }

  getStatus() {
    return this.status;
  }

  onStatusChange(callback) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
    };
  }

  onNotification(callback) {
    this.notificationListeners.push(callback);
    return () => {
      this.notificationListeners = this.notificationListeners.filter(listener => listener !== callback);
    };
  }

  onDataChange(callback) {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter(listener => listener !== callback);
    };
  }

  notifyStatusListeners() {
    this.statusListeners.forEach(callback => callback(this.status));
  }

  notifyNotificationListeners() {
    this.notificationListeners.forEach(callback => callback());
  }

  notifyDataListeners() {
    this.dataListeners.forEach(callback => callback({
      positions: this.positions,
      statistics: this.statistics,
      logs: this.logs,
    }));
  }

  // Validation methods
  validateApiCredentials(apiKey, apiSecret) {
    if (!apiKey || !apiSecret) {
      return { valid: false, error: 'API key and secret are required' };
    }
    
    if (apiKey.length < 10 || apiSecret.length < 10) {
      return { valid: false, error: 'API credentials appear to be invalid' };
    }
    
    return { valid: true };
  }

  validateLevelConfiguration(levels) {
    for (const level of levels) {
      if (typeof level.percent !== 'number' || level.percent === 0) {
        return { valid: false, error: 'Level percent must be a non-zero number' };
      }
      
      if (typeof level.amount !== 'number' || level.amount <= 0) {
        return { valid: false, error: 'Level amount must be a positive number' };
      }
      
      if (typeof level.tpPercent !== 'number' || level.tpPercent === 0) {
        return { valid: false, error: 'Take profit percent must be a non-zero number' };
      }
      
      if (typeof level.slPercent !== 'number' || level.slPercent <= 0) {
        return { valid: false, error: 'Stop loss percent must be a positive number' };
      }
    }
    
    return { valid: true };
  }

  async testApiConnection() {
    try {
      const response = await fetch('http://localhost:5000/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          apiSecret: this.config.apiSecret,
          testnet: this.config.testnet,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'API connection failed' };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const BotService = new BotService();
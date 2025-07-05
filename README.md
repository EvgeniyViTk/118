# Gate.io Trading Bot - Web Interface

Professional web interface for the Gate.io trading bot with advanced features and real-time monitoring.

## 🚀 Features

- **Beautiful Modern UI** - Clean, responsive design with dark theme
- **Real-time Monitoring** - Live updates of positions, statistics, and logs
- **Comprehensive Configuration** - Full bot configuration through web interface
- **Multiple Trading Strategies** - Support for regular, additional, and counter levels
- **Advanced Statistics** - Detailed performance analytics with charts
- **Risk Management** - Global take profit, individual stop losses, and position management
- **Symbol Management** - Easy selection and management of trading pairs
- **Log Monitoring** - Real-time log viewing with filtering and search
- **Export Functionality** - Export configurations, statistics, and logs

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd gate-trading-bot-web
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Install Python dependencies:
```bash
pip install gate-api asyncio decimal
```

### Frontend Setup

1. Install frontend dependencies:
```bash
npm install
```

2. Install additional chart dependencies:
```bash
npm install recharts
```

## 🏃 Running the Application

### Development Mode

1. Start the backend server:
```bash
cd server
npm run dev
```
The server will run on `http://localhost:5000`
WebSocket server will run on `ws://localhost:8080`

2. In a new terminal, start the frontend:
```bash
npm start
```
The frontend will run on `http://localhost:3000`

### Production Mode

1. Build the frontend:
```bash
npm run build
```

2. Start the backend server:
```bash
cd server
npm start
```

## 🔧 Configuration

### API Setup

1. Navigate to the **Configuration** page
2. Enter your Gate.io API credentials:
   - API Key
   - API Secret
   - Toggle testnet if needed
3. Click "Test Connection" to verify credentials
4. Save the configuration

### Trading Symbols

1. Go to the **Symbols** tab in Configuration
2. Select the cryptocurrency pairs you want to trade
3. The bot supports all major USDT pairs available on Gate.io

### Trading Levels

Configure different types of trading levels:

#### Regular Levels
- **Long Levels**: Buy orders when price increases
- **Short Levels**: Sell orders when price decreases

#### Additional Levels
- Similar to regular levels but execute only once
- Used for additional position sizing

#### Counter Levels
- **Counter Long**: Buy when price falls (contrarian approach)
- **Counter Short**: Sell when price rises (contrarian approach)

Each level includes:
- **Percent**: Price change percentage to trigger
- **Amount**: Position size in USDT
- **Take Profit**: Profit target percentage
- **Stop Loss**: Maximum loss percentage

### Global Settings

- **Global Take Profit**: Close all positions when total profit reaches threshold
- **API Rate Limit**: Delay between API calls
- **Max Concurrent Symbols**: Maximum symbols to trade simultaneously

## 📊 Using the Interface

### Dashboard
- Overview of bot status and performance
- Key statistics and metrics
- Recent trading activity
- Active positions summary

### Positions
- Real-time position monitoring
- Filtering and sorting options
- Individual position management
- Export position data

### Statistics
- Performance charts and analytics
- Win rate and profit metrics
- Symbol performance comparison
- Historical data visualization

### Logs
- Real-time log monitoring
- Filter by log level (Error, Warning, Info, Debug)
- Search functionality
- Auto-refresh with pause/play controls
- Export logs to file

## 🔒 Security

- API credentials are stored locally in browser
- Use IP restrictions on your Gate.io API key
- Only grant necessary permissions (futures trading)
- Regularly rotate API keys
- Use testnet for initial testing

## 🛠 Integration with Python Bot

The web interface integrates with the original Python trading bot:

1. The Node.js server manages the Python bot process
2. Configuration from web interface is passed to Python bot
3. Real-time data is captured from Python bot logs
4. Bot can be started/stopped through web interface

### Python Bot Features Supported

- ✅ Multiple symbol trading
- ✅ Long and short positions
- ✅ Regular, additional, and counter levels
- ✅ Individual take profit and stop loss
- ✅ Global take profit threshold
- ✅ Real-time position monitoring
- ✅ Comprehensive logging
- ✅ Risk management

## 📁 Project Structure

```
gate-trading-bot-web/
├── public/                 # React public files
├── src/                   # React source code
│   ├── components/        # Reusable components
│   ├── pages/            # Page components
│   ├── services/         # API services
│   └── utils/            # Utility functions
├── server/               # Node.js backend
│   ├── server.js         # Main server file
│   └── package.json      # Backend dependencies
├── gate_bot_isolated.py  # Original Python bot
└── README.md            # This file
```

## 🔧 Advanced Configuration

### Custom Symbols List

You can modify the available symbols in `src/pages/Configuration.js`:

```javascript
const availableSymbols = [
  'BTC_USDT', 'ETH_USDT', 'ADA_USDT',
  // Add your custom symbols here
];
```

### Chart Customization

Charts can be customized in `src/pages/Statistics.js` using the Recharts library.

### Theme Customization

The Material-UI theme can be modified in `src/index.js`.

## 🐛 Troubleshooting

### Common Issues

1. **Bot won't start**: Check API credentials and Python dependencies
2. **WebSocket connection failed**: Ensure port 8080 is available
3. **Frontend can't connect to backend**: Check if backend is running on port 5000
4. **Python bot errors**: Check Gate.io API status and account permissions

### Logs

Check logs in the following locations:
- Web interface: Logs page
- Backend server: Console output
- Python bot: `gate_bot_isolated.log` file

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## ⚠️ Disclaimer

This software is for educational purposes only. Trading cryptocurrencies involves substantial risk and may result in financial loss. Use at your own risk and always do your own research.

## 📞 Support

For support and questions:
- Check the logs for error messages
- Ensure all dependencies are installed correctly
- Verify API credentials and permissions
- Test with small amounts first

---

**Happy Trading! 🚀**
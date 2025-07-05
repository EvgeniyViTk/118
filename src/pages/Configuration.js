import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Chip,
  Autocomplete,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  TestTube as TestTubeIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { BotService } from '../services/BotService';

const Configuration = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [levelDialog, setLevelDialog] = useState({ open: false, level: null, type: '', index: -1 });

  // Available symbols for selection
  const availableSymbols = [
    'BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'ADA_USDT', 'SOL_USDT', 'DOT_USDT', 'LINK_USDT',
    'MATIC_USDT', 'AVAX_USDT', 'ATOM_USDT', 'LUNA_USDT', 'NEAR_USDT', 'FTM_USDT', 'ALGO_USDT',
    'VET_USDT', 'ICP_USDT', 'THETA_USDT', 'FIL_USDT', 'TRX_USDT', 'XLM_USDT', 'HBAR_USDT',
    'ORBS_USDT', 'BEL_USDT', 'ZRC_USDT', 'HIPPO_USDT', 'PFVS_USDT', 'D_USDT', 'MOVR_USDT',
    'ACE_USDT', 'ANIME_USDT', 'ALPHA_USDT', 'XCN_USDT', 'TON_USDT', 'FWOG_USDT', 'NFP_USDT',
    'MAJOR_USDT', 'ANKR_USDT', 'MTL_USDT', 'MEME_USDT', 'TSTBSC_USDT', 'PHA_USDT', 'MDT_USDT',
    'SUPRA_USDT', 'PERP_USDT', 'ZEREBRO_USDT', 'ETHFI_USDT', 'WEMIX_USDT', 'BR_USDT', 'CHESS_USDT',
    'REI_USDT', 'SLERF_USDT', 'SHIB_USDT', 'BSV_USDT', 'MUBARAK_USDT', 'KEKIUS_USDT', 'SFP_USDT',
    'AERO_USDT', 'JELLYJELLY_USDT', 'IDEX_USDT', 'XEM_USDT', 'ALICE_USDT', 'OG_USDT', 'BAKE_USDT',
    'HMSTR_USDT', 'CRO_USDT', 'MINA_USDT', 'AUDIO_USDT', 'DUCK_USDT', 'AVAAI_USDT', 'CATI_USDT',
    'ACH_USDT', 'MOODENGETH_USDT', 'IMX_USDT', 'HNT_USDT', 'ALT_USDT', 'DYM_USDT', 'USUAL_USDT',
    'XVS_USDT', 'BAND_USDT', 'NKN_USDT', 'ZETA_USDT', 'VANRY_USDT', 'ZK_USDT', 'SKYAI_USDT',
    'FB_USDT', 'ARK_USDT', 'BRETT_USDT', 'FIDA_USDT', 'STRK_USDT', 'CRV_USDT', 'FLM_USDT',
  ];

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const configData = BotService.getConfig();
      setConfig(configData);
    } catch (error) {
      showSnackbar('Error loading configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate configuration
      const validation = validateConfiguration();
      if (!validation.valid) {
        showSnackbar(validation.error, 'error');
        return;
      }

      BotService.saveConfig(config);
      showSnackbar('Configuration saved successfully', 'success');
    } catch (error) {
      showSnackbar('Error saving configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await BotService.testApiConnection();
      if (result.success) {
        showSnackbar('API connection successful', 'success');
      } else {
        showSnackbar(result.error || 'API connection failed', 'error');
      }
    } catch (error) {
      showSnackbar('Error testing connection', 'error');
    } finally {
      setTesting(false);
    }
  };

  const validateConfiguration = () => {
    if (!config.apiKey || !config.apiSecret) {
      return { valid: false, error: 'API credentials are required' };
    }

    if (config.symbols.length === 0) {
      return { valid: false, error: 'At least one symbol must be selected' };
    }

    // Validate levels
    const levelTypes = ['longLevels', 'shortLevels', 'additionalLongLevels', 'additionalShortLevels', 'counterLongLevels', 'counterShortLevels'];
    for (const levelType of levelTypes) {
      const validation = BotService.validateLevelConfiguration(config[levelType]);
      if (!validation.valid) {
        return { valid: false, error: `${levelType}: ${validation.error}` };
      }
    }

    return { valid: true };
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddLevel = (type) => {
    const newLevel = {
      percent: 0,
      amount: 0.3,
      tpPercent: type.includes('short') ? -2 : 2,
      slPercent: 1,
    };
    setLevelDialog({ open: true, level: newLevel, type, index: -1 });
  };

  const handleEditLevel = (level, type, index) => {
    setLevelDialog({ open: true, level: { ...level }, type, index });
  };

  const handleDeleteLevel = (type, index) => {
    const newConfig = { ...config };
    newConfig[type].splice(index, 1);
    setConfig(newConfig);
  };

  const handleSaveLevel = () => {
    const newConfig = { ...config };
    const { level, type, index } = levelDialog;
    
    if (index === -1) {
      newConfig[type].push(level);
    } else {
      newConfig[type][index] = level;
    }
    
    setConfig(newConfig);
    setLevelDialog({ open: false, level: null, type: '', index: -1 });
  };

  const LevelDialog = () => (
    <Dialog open={levelDialog.open} onClose={() => setLevelDialog({ open: false, level: null, type: '', index: -1 })}>
      <DialogTitle>
        {levelDialog.index === -1 ? 'Add Level' : 'Edit Level'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Percent (%)"
                type="number"
                fullWidth
                value={levelDialog.level?.percent || 0}
                onChange={(e) => setLevelDialog({
                  ...levelDialog,
                  level: { ...levelDialog.level, percent: parseFloat(e.target.value) || 0 }
                })}
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Amount (USDT)"
                type="number"
                fullWidth
                value={levelDialog.level?.amount || 0}
                onChange={(e) => setLevelDialog({
                  ...levelDialog,
                  level: { ...levelDialog.level, amount: parseFloat(e.target.value) || 0 }
                })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Take Profit (%)"
                type="number"
                fullWidth
                value={levelDialog.level?.tpPercent || 0}
                onChange={(e) => setLevelDialog({
                  ...levelDialog,
                  level: { ...levelDialog.level, tpPercent: parseFloat(e.target.value) || 0 }
                })}
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Stop Loss (%)"
                type="number"
                fullWidth
                value={levelDialog.level?.slPercent || 0}
                onChange={(e) => setLevelDialog({
                  ...levelDialog,
                  level: { ...levelDialog.level, slPercent: parseFloat(e.target.value) || 0 }
                })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setLevelDialog({ open: false, level: null, type: '', index: -1 })}>
          Cancel
        </Button>
        <Button onClick={handleSaveLevel} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  const LevelsTable = ({ levels, type, title }) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => handleAddLevel(type)}
          >
            Add Level
          </Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Percent (%)</TableCell>
                <TableCell>Amount (USDT)</TableCell>
                <TableCell>Take Profit (%)</TableCell>
                <TableCell>Stop Loss (%)</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {levels.map((level, index) => (
                <TableRow key={index}>
                  <TableCell>{level.percent}</TableCell>
                  <TableCell>{level.amount}</TableCell>
                  <TableCell>{level.tpPercent}</TableCell>
                  <TableCell>{level.slPercent}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEditLevel(level, type, index)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteLevel(type, index)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {levels.length === 0 && (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary">
              No levels configured. Click "Add Level" to get started.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (loading || !config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading configuration...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          Configuration
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<TestTubeIcon />}
            onClick={handleTestConnection}
            disabled={testing}
            sx={{ mr: 1 }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>
      </Box>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="API Settings" icon={<SecurityIcon />} />
        <Tab label="Symbols" icon={<SettingsIcon />} />
        <Tab label="Long Levels" icon={<TrendingUpIcon />} />
        <Tab label="Short Levels" icon={<TrendingDownIcon />} />
        <Tab label="Additional Levels" icon={<AddIcon />} />
        <Tab label="Counter Levels" icon={<TrendingUpIcon />} />
        <Tab label="Global Settings" icon={<SettingsIcon />} />
      </Tabs>

      {/* API Settings Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  API Credentials
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    label="API Key"
                    fullWidth
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    margin="normal"
                    type="password"
                    helperText="Your Gate.io API key"
                  />
                  <TextField
                    label="API Secret"
                    fullWidth
                    value={config.apiSecret}
                    onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                    margin="normal"
                    type="password"
                    helperText="Your Gate.io API secret"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.testnet}
                        onChange={(e) => setConfig({ ...config, testnet: e.target.checked })}
                      />
                    }
                    label="Use Testnet"
                    sx={{ mt: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Notice
                </Typography>
                <Alert severity="warning">
                  <Typography variant="body2">
                    Your API credentials are stored locally in your browser. Make sure to:
                  </Typography>
                  <ul>
                    <li>Only use this application on trusted devices</li>
                    <li>Enable IP restrictions on your API key</li>
                    <li>Only grant necessary permissions (futures trading)</li>
                    <li>Regularly rotate your API keys</li>
                  </ul>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Symbols Tab */}
      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trading Symbols
            </Typography>
            <Autocomplete
              multiple
              options={availableSymbols}
              value={config.symbols}
              onChange={(event, newValue) => setConfig({ ...config, symbols: newValue })}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select symbols to trade"
                  placeholder="Start typing to search symbols..."
                />
              )}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Selected {config.symbols.length} symbols. The bot will monitor and trade these pairs.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Long Levels Tab */}
      {activeTab === 2 && (
        <Box>
          <LevelsTable
            levels={config.longLevels}
            type="longLevels"
            title="Regular Long Levels"
          />
        </Box>
      )}

      {/* Short Levels Tab */}
      {activeTab === 3 && (
        <Box>
          <LevelsTable
            levels={config.shortLevels}
            type="shortLevels"
            title="Regular Short Levels"
          />
        </Box>
      )}

      {/* Additional Levels Tab */}
      {activeTab === 4 && (
        <Box>
          <LevelsTable
            levels={config.additionalLongLevels}
            type="additionalLongLevels"
            title="Additional Long Levels"
          />
          <LevelsTable
            levels={config.additionalShortLevels}
            type="additionalShortLevels"
            title="Additional Short Levels"
          />
        </Box>
      )}

      {/* Counter Levels Tab */}
      {activeTab === 5 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Counter levels work opposite to regular levels. When price falls (negative %), counter long positions are opened. When price rises (positive %), counter short positions are opened.
          </Alert>
          <LevelsTable
            levels={config.counterLongLevels}
            type="counterLongLevels"
            title="Counter Long Levels"
          />
          <LevelsTable
            levels={config.counterShortLevels}
            type="counterShortLevels"
            title="Counter Short Levels"
          />
        </Box>
      )}

      {/* Global Settings Tab */}
      {activeTab === 6 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Global Settings
                </Typography>
                <TextField
                  label="Global Take Profit Threshold (USDT)"
                  type="number"
                  fullWidth
                  value={config.globalTpThreshold}
                  onChange={(e) => setConfig({ ...config, globalTpThreshold: parseFloat(e.target.value) || 0 })}
                  margin="normal"
                  inputProps={{ step: 10, min: 0 }}
                  helperText="When total PnL reaches this threshold, all positions will be closed"
                />
                <TextField
                  label="API Rate Limit Delay (seconds)"
                  type="number"
                  fullWidth
                  value={config.apiRateLimitDelay}
                  onChange={(e) => setConfig({ ...config, apiRateLimitDelay: parseFloat(e.target.value) || 0 })}
                  margin="normal"
                  inputProps={{ step: 0.1, min: 0.1 }}
                  helperText="Delay between API calls to avoid rate limits"
                />
                <TextField
                  label="Max Concurrent Symbols"
                  type="number"
                  fullWidth
                  value={config.maxConcurrentSymbols}
                  onChange={(e) => setConfig({ ...config, maxConcurrentSymbols: parseInt(e.target.value) || 0 })}
                  margin="normal"
                  inputProps={{ step: 1, min: 1 }}
                  helperText="Maximum number of symbols to trade simultaneously"
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Advanced Options
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.useRealizedPnl}
                      onChange={(e) => setConfig({ ...config, useRealizedPnl: e.target.checked })}
                    />
                  }
                  label="Use Realized PnL"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Include realized PnL in global take profit calculations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <LevelDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Configuration;
const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initWebSocket } = require('./services/wsService');
const { query } = require('./db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const kioskRoutes = require('./routes/kioskRoutes');
const intakeRoutes = require('./routes/intakeRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded medical documents statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AYUSH / General OPD Case-Taking API (PS 047)'
  });
});

const systemController = require('./controllers/systemController');

// Public hospital listing (for kiosk and patient login picker)
app.get('/api/hospitals/public', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, address, contact_phone, registration_mode FROM hospitals ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dynamic hospital creation & provisioning (allows user to add hospitals anytime)
app.post('/api/hospitals/create', async (req, res) => {
  try {
    const { name, address, contact_phone, registration_mode } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Hospital name is required' });
    }
    const result = await query(
      `INSERT INTO hospitals (name, registration_mode, physical_presence_required, address, contact_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), registration_mode || 'admin_creates', true, address || 'Central OPD Facility', contact_phone || '+91 11 2345 6789']
    );
    res.status(201).json({
      success: true,
      message: 'Hospital created and provisioned with default departments and kiosk terminal!',
      hospital: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System Network & Tunnel Info (for Mobile QR code)
app.get('/api/system/network-info', systemController.getNetworkInfo);
app.post('/api/system/tunnel-url', systemController.setTunnelUrl);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Initialize Native WebSocket server on HTTP server
initWebSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(` MEDIKIOSK OPD BACKEND RUNNING ON http://localhost:${PORT}`);
  console.log(` Native WebSocket server listening on ws://localhost:${PORT}/ws`);
  console.log(`======================================================\n`);
});

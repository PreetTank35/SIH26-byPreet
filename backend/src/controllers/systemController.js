const os = require('os');

/**
 * GET /api/system/network-info
 * Returns local LAN IP addresses and tunnel information for mobile QR connection
 */
function getNetworkInfo(req, res) {
  try {
    const nets = os.networkInterfaces();
    const ips = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip loopback and non-IPv4 addresses
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }

    const primaryIp = ips[0] || '127.0.0.1';
    const clientPort = process.env.CLIENT_PORT || 5173;
    const tunnelUrl = process.env.TUNNEL_URL || null;

    res.json({
      localIp: primaryIp,
      allIps: ips,
      clientPort: Number(clientPort),
      tunnelUrl: tunnelUrl,
      recommendedMobileBaseUrl: tunnelUrl || `http://${primaryIp}:${clientPort}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getNetworkInfo
};

const os = require('os');

let customTunnelUrl = null;

/**
 * Auto-detects active ngrok tunnel via ngrok local client API (http://127.0.0.1:4040/api/tunnels)
 */
async function detectNgrokTunnel() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(600)
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.tunnels || !data.tunnels.length) return null;

    // Prefer https tunnel if available
    const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
    return (httpsTunnel || data.tunnels[0]).public_url;
  } catch {
    return null;
  }
}

/**
 * GET /api/system/network-info
 * Returns local LAN IP addresses and tunnel information for mobile QR connection
 */
async function getNetworkInfo(req, res) {
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

    // Check auto-detected ngrok
    const ngrokUrl = await detectNgrokTunnel();
    const envTunnel = process.env.NGROK_URL || process.env.TUNNEL_URL || null;
    const tunnelUrl = customTunnelUrl || ngrokUrl || envTunnel || null;

    let tunnelSource = 'lan';
    if (customTunnelUrl) tunnelSource = 'custom';
    else if (ngrokUrl) tunnelSource = 'ngrok_auto';
    else if (envTunnel) tunnelSource = 'env';

    res.json({
      localIp: primaryIp,
      allIps: ips,
      clientPort: Number(clientPort),
      tunnelUrl: tunnelUrl,
      tunnelSource: tunnelSource,
      ngrokDetected: !!ngrokUrl,
      recommendedMobileBaseUrl: tunnelUrl || `http://${primaryIp}:${clientPort}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/system/tunnel-url
 * Sets or clears a custom ngrok or cloud tunnel URL dynamically
 */
function setTunnelUrl(req, res) {
  const { url } = req.body || {};
  customTunnelUrl = url && typeof url === 'string' && url.trim() ? url.trim() : null;
  res.json({
    success: true,
    tunnelUrl: customTunnelUrl,
    message: customTunnelUrl ? `Tunnel URL updated to ${customTunnelUrl}` : 'Tunnel URL reset to auto'
  });
}

module.exports = {
  getNetworkInfo,
  setTunnelUrl
};


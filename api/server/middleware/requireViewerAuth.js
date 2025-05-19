const jwt = require('jsonwebtoken');
const { logger } = require('~/config');

const requireViewerAuth = (req, res, next) => {
  const token = req.cookies.viewer_token;

  if (!token) {
    return res.status(401).json({ message: 'Viewer authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'viewer') {
      logger.warn('[RequireViewerAuth] Token role mismatch for viewer', decoded);
      return res.status(403).json({ message: 'Forbidden: Invalid token role for viewer' });
    }
    req.viewer = decoded; // Attach viewer payload to request object
    next();
  } catch (err) {
    logger.error('[RequireViewerAuth] Invalid viewer token', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Viewer token expired' });
    }
    return res.status(401).json({ message: 'Invalid viewer token' });
  }
};

module.exports = requireViewerAuth; 
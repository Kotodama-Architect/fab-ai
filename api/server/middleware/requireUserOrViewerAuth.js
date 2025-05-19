const jwt = require('jsonwebtoken');
const passport = require('passport'); // To use the existing jwt strategy for users/admins
const { logger } = require('~/config');

// This is a simplified way to check. For a more robust solution,
// you might integrate viewer auth more deeply with Passport or have a shared JWT utility.
const requireUserOrViewerAuth = (req, res, next) => {
  // Try to authenticate as User/Admin first using passport
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      logger.error('[UserOrViewerAuth] Passport JWT Error:', err);
      return res.status(500).json({ message: 'Internal server error during authentication' });
    }
    if (user) {
      req.user = user; // Passport attaches user to req
      return next(); // User/Admin authenticated
    }

    // If User/Admin auth fails (no token, invalid token, etc.), try Viewer auth
    const viewerToken = req.cookies.viewer_token;
    if (!viewerToken) {
      // No user/admin token and no viewer token
      let message = 'Authentication required. Please login.';
      if (info && info.message) { // info might contain specific error from passport jwt strategy
         message = info.message; // e.g. 'No auth token' or 'jwt expired'
      }
      if (info && info.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please login again.'});
      }
      return res.status(401).json({ message });
    }

    try {
      const decodedViewer = jwt.verify(viewerToken, process.env.JWT_SECRET);
      if (decodedViewer.role === 'viewer') {
        req.viewer = decodedViewer; // Attach viewer payload
        return next(); // Viewer authenticated
      }
      logger.warn('[UserOrViewerAuth] Viewer token has invalid role:', decodedViewer.role);
      return res.status(403).json({ message: 'Forbidden: Invalid token role for viewer access' });
    } catch (viewerErr) {
      logger.error('[UserOrViewerAuth] Invalid viewer token:', viewerErr);
      if (viewerErr.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Viewer session expired. Please login again.' });
      }
      return res.status(401).json({ message: 'Invalid viewer token' });
    }
  })(req, res, next);
};

module.exports = requireUserOrViewerAuth; 
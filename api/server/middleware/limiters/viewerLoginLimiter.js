const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { removePorts, isEnabled } = require('~/server/utils');
const ioredisClient = require('~/cache/ioredisClient');
const { logViolation } = require('~/cache');
const { logger } = require('~/config');

const { VIEWER_LOGIN_WINDOW = 5, VIEWER_LOGIN_MAX = 7, LOGIN_VIOLATION_SCORE: score } = process.env;
const windowMs = VIEWER_LOGIN_WINDOW * 60 * 1000;
const max = VIEWER_LOGIN_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many viewer login attempts, please try again after ${windowInMinutes} minutes.`;

const handler = async (req, res) => {
  const type = 'viewer_logins'; // Changed type for logging
  const errorMessage = {
    type,
    max,
    windowInMinutes,
  };

  // Assuming logViolation can be reused or adapted if viewer violations need different scoring/handling
  await logViolation(req, res, type, errorMessage, score || 1); // Default score 1 if not specified
  return res.status(429).json({ message });
};

const limiterOptions = {
  windowMs,
  max,
  handler,
  keyGenerator: removePorts,
};

if (isEnabled(process.env.USE_REDIS) && ioredisClient) {
  logger.debug('Using Redis for viewer login rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'viewer_login_limiter:', // Changed prefix
  });
  limiterOptions.store = store;
}

const viewerLoginLimiter = rateLimit(limiterOptions);

module.exports = viewerLoginLimiter; 
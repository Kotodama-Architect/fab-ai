const createTTSLimiters = require('./ttsLimiters');
const createSTTLimiters = require('./sttLimiters');

const loginLimiter = require('./loginLimiter');
const importLimiters = require('./importLimiters');
const uploadLimiters = require('./uploadLimiters');
const registerLimiter = require('./registerLimiter');
const toolCallLimiter = require('./toolCallLimiter');
const messageLimiters = require('./messageLimiters');
const verifyEmailLimiter = require('./verifyEmailLimiter');
const resetPasswordLimiter = require('./resetPasswordLimiter');

const viewerLoginLimiter = require('./viewerLoginLimiter');
const viewerRegisterLimiter = require('./viewerRegisterLimiter');

module.exports = {
  ...uploadLimiters,
  ...importLimiters,
  ...messageLimiters,
  loginLimiter,
  registerLimiter,
  toolCallLimiter,
  createTTSLimiters,
  createSTTLimiters,
  verifyEmailLimiter,
  resetPasswordLimiter,
  viewerLoginLimiter,
  viewerRegisterLimiter,
};

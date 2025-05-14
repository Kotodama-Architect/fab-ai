const stripeService = require('~/app/services/custom/stripe.service');
const { logger } = require('~/config');

/**
 * Middleware to check if a user has an active subscription
 * If not, redirect them to the subscription page
 */
const requireSubscription = async (req, res, next) => {
  try {
    // Skip subscription check if not enabled or for admin users
    if (!process.env.ENABLE_SUBSCRIPTION_CHECK || req.user.role === 'ADMIN') {
      return next();
    }

    // Check if the user has an active subscription
    const hasSubscription = await stripeService.hasActiveSubscription(req.user);

    if (!hasSubscription) {
      // Return a 402 Payment Required status code with useful information
      return res.status(402).json({
        message: 'Active subscription required',
        subscription_required: true,
        status: req.user.stripeSubscriptionStatus || 'none',
        details: getSubscriptionErrorDetails(req.user.stripeSubscriptionStatus),
      });
    }

    next();
  } catch (error) {
    logger.error('Error in subscription check middleware:', error);
    next(error);
  }
};

/**
 * Get detailed information about why a subscription is not active
 * @param {string} status - Current subscription status
 * @returns {string} - Human-readable explanation
 */
function getSubscriptionErrorDetails(status) {
  switch (status) {
    case 'past_due':
      return 'Your subscription payment is past due. Please update your payment information.';
    case 'canceled':
      return 'Your subscription has been canceled. Please subscribe again to access this feature.';
    case 'unpaid':
      return 'We were unable to process your latest payment. Please update your payment information.';
    case 'incomplete':
      return 'Your subscription setup is incomplete. Please complete the subscription process.';
    case 'incomplete_expired':
      return 'Your subscription setup has expired. Please subscribe again to access this feature.';
    default:
      return 'You need an active subscription to access this feature.';
  }
}

module.exports = requireSubscription;

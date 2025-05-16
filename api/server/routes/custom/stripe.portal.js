const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const stripeService = require('~/app/services/custom/stripe.service');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Create a Stripe customer portal session
 * This endpoint creates a customer portal session and returns the URL
 */
router.post('/create-portal-session', requireJwtAuth, async (req, res) => {
  try {
    const user = req.user;

    // If the user doesn't have a Stripe customer ID, they haven't subscribed yet
    if (!user.stripeCustomerId) {
      return res.status(404).json({
        message: 'No subscription found',
        subscription_required: true,
      });
    }

    // Create a customer portal session
    const returnUrl =
      process.env.STRIPE_CUSTOMER_PORTAL_RETURN_URL ||
      `${process.env.APP_URL || process.env.CLIENT_URL}/settings`;

    const session = await stripeService.createCustomerPortalSession(user, returnUrl);

    // Return the URL to the frontend
    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating Stripe customer portal session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a checkout session for a new subscription
 * This endpoint creates a checkout session and returns the URL
 */
router.post('/create-checkout-session', requireJwtAuth, async (req, res) => {
  try {
    const user = req.user;
    const { invitationCode } = req.body;

    // Validate invitation code
    const requiredCode = process.env.SUBSCRIPTION_INVITATION_CODE;

    if (!requiredCode) {
      logger.warn('SUBSCRIPTION_INVITATION_CODE is not set in environment variables');
    } else if (!invitationCode || invitationCode !== requiredCode) {
      return res.status(403).json({
        error: 'Invalid invitation code',
        message: 'The invitation code provided is not valid',
      });
    }

    // Create success and cancel URLs
    const baseUrl = process.env.APP_URL || process.env.CLIENT_URL;
    const successUrl = `${baseUrl}/subscription/success`;
    const cancelUrl = `${baseUrl}/subscription/cancel`;

    // Create a checkout session
    const session = await stripeService.createCheckoutSession(
      user,
      successUrl,
      cancelUrl,
      invitationCode,
    );

    // Return the URL to the frontend
    res.json({ url: session.url });
  } catch (error) {
    logger.error('Error creating Stripe checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check the subscription status of the current user
 */
router.get('/subscription-status', requireJwtAuth, async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      logger.error('Error checking subscription status: User not found in request.');
      // requireJwtAuth should prevent this, but as an extra safeguard
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated.' });
    }

    // Check if the user has an active subscription
    const hasActiveSubscription = await stripeService.hasActiveSubscription(user);

    res.json({
      hasActiveSubscription,
      subscriptionStatus: user.stripeSubscriptionStatus || 'none',
    });
  } catch (error) {
    logger.error('Error checking subscription status in /subscription-status endpoint:', error); // Log the specific error location
    res.status(500).json({ error: 'Internal server error while checking subscription status' }); // More specific error message
  }
});

module.exports = router;

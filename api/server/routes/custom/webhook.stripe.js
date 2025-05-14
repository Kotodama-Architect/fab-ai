const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('~/app/services/custom/stripe.service');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Stripe webhook handler
 * This endpoint receives webhook events from Stripe
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.warn('Stripe webhook received without signature');
      return res.status(400).send('Missing Stripe signature');
    }

    // Verify the webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Log the event type for debugging
    logger.info(`Received Stripe event: ${event.type}`);

    // Handle the event
    const supportedEvents = [
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
    ];

    if (supportedEvents.includes(event.type)) {
      await stripeService.handleWebhookEvent(event);
      logger.info(`Successfully processed Stripe event: ${event.type}`);
    } else {
      logger.info(`Ignoring unhandled Stripe event type: ${event.type}`);
    }

    // Return a success response
    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

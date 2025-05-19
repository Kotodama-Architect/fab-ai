// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Removed global initialization
const User = require('~/models/User');
const { logger } = require('~/config');

/**
 * Stripe service for fab-ai project
 * Handles all interactions with the Stripe API
 */
class StripeService {
  constructor(apiKey, webhookSecret, priceId, successUrl, cancelUrl) {
    if (!apiKey) {
      throw new Error('StripeService: Missing apiKey');
    }
    if (!webhookSecret) {
      throw new Error('StripeService: Missing webhookSecret');
    }
    if (!priceId) {
      throw new Error('StripeService: Missing priceId');
    }
    if (!successUrl) {
      throw new Error('StripeService: Missing successUrl');
    }
    if (!cancelUrl) {
      throw new Error('StripeService: Missing cancelUrl');
    }

    this.stripe = require('stripe')(apiKey);
    this.webhookSecret = webhookSecret;
    this.priceId = priceId;
    this.successUrl = successUrl;
    this.cancelUrl = cancelUrl;
    logger.info('[StripeService] Initialized');
  }

  /**
   * Check if a user has an active subscription
   * @param {Object} user - User object
   * @returns {Promise<Boolean>} - Whether the user has an active subscription
   */
  async hasActiveSubscription(user) {
    try {
      // If the user doesn't have a subscription ID, they don't have an active subscription
      if (!user.stripeSubscriptionId) {
        return false;
      }

      // Retrieve the subscription from Stripe
      const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Check if the subscription status is active or trialing
      const validStatuses = ['active', 'trialing'];
      const isActive = validStatuses.includes(subscription.status);

      // Update the user's subscription status in the database if it's changed
      if (user.stripeSubscriptionStatus !== subscription.status) {
        await User.findByIdAndUpdate(user._id, {
          stripeSubscriptionStatus: subscription.status,
        });
      }

      return isActive;
    } catch (error) {
      // Handle specific Stripe errors
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        // Subscription doesn't exist anymore, update user record
        await User.findByIdAndUpdate(user._id, {
          stripeSubscriptionStatus: 'canceled',
        });
        logger.warn(
          `Subscription ${user.stripeSubscriptionId} for user ${user._id} no longer exists in Stripe. Marking as canceled.`,
        );
        return false;
      }

      logger.error(`Error checking subscription status for user ${user._id}:`, error);
      return false;
    }
  }

  /**
   * Create a Stripe checkout session for a new subscription
   * @param {Object} user - User object
   * @param {String} successUrl - URL to redirect to on successful checkout
   * @param {String} cancelUrl - URL to redirect to if checkout is canceled
   * @param {String} [invitationCode] - Optional invitation code provided by the user
   * @returns {Promise<Object>} - Checkout session
   */
  async createCheckoutSession(user, successUrl, cancelUrl, invitationCode) {
    try {
      // Check if the user already has a Stripe customer ID
      let customerId = user.stripeCustomerId;

      // If not, create a new Stripe customer
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: { userId: user._id.toString() },
        });

        customerId = customer.id;

        // Update the user with their new Stripe customer ID
        await User.findByIdAndUpdate(user._id, {
          stripeCustomerId: customerId,
        });
      }

      const metadata = {
        userId: user._id.toString(),
      };

      // We trust the invitationCode has been validated by the route middleware by this point.
      // If SUBSCRIPTION_INVITATION_CODE is set and the provided code matches,
      // or if SUBSCRIPTION_INVITATION_CODE is not set (meaning no code is required),
      // we can proceed.
      // If a code was required and it was invalid, the request should not have reached here.
      if (
        process.env.SUBSCRIPTION_INVITATION_CODE &&
        invitationCode === process.env.SUBSCRIPTION_INVITATION_CODE
      ) {
        metadata.invitationCodeUsed = invitationCode;
      }

      // Create a checkout session with the subscription product
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata,
        client_reference_id: user._id.toString(),
      });

      return { sessionId: session.id, sessionUrl: session.url };
    } catch (error) {
      logger.error(`Error creating checkout session for user ${user._id}:`, error);
      throw error;
    }
  }

  /**
   * Create a Stripe customer portal session
   * @param {Object} user - User object
   * @param {String} returnUrl - URL to return to after customer portal session
   * @returns {Promise<Object>} - Customer portal session
   */
  async createCustomerPortalSession(user, returnUrl) {
    try {
      if (!user.stripeCustomerId) {
        throw new Error('User does not have a Stripe customer ID');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      logger.error(`Error creating customer portal session for user ${user._id}:`, error);
      throw error;
    }
  }

  /**
   * Handle webhook events from Stripe
   * @param {Object} event - Stripe webhook event
   */
  async handleWebhookEvent(event) {
    logger.info(`[StripeService.handleWebhookEvent] Received event: ${event.id}, Type: ${event.type}`);
    const user = await this.getDbUserFromEvent(event);

    if (!user) {
      // It's possible the user is not yet in our DB if checkout.session.completed
      // is the first event we receive and client_reference_id was not properly set or is missing.
      // Or if a customer was created directly in Stripe and we don't have a mapping yet.
      // We should still mark the event as received to prevent reprocessing if we can identify it later.
      // However, without a user context, most events cannot be fully processed.
      if (event.type === 'checkout.session.completed' && event.data.object.customer) {
        // If it's a checkout completion and we have a Stripe customer ID,
        // we could potentially create a placeholder or try to match by email if metadata is missing/wrong.
        // For now, we log and skip if client_reference_id was not usable.
        logger.warn(
          `[StripeService.handleWebhookEvent] User not found for checkout.session.completed via client_reference_id for event ${event.id}. Stripe Customer: ${event.data.object.customer}. Further processing depends on matching this customer later.`,
        );
      } else if (event.data.object.customer) {
        logger.warn(
          `[StripeService.handleWebhookEvent] User not found by stripeCustomerId ${event.data.object.customer} for event ${event.id}, type ${event.type}. Skipping primary processing.`,
        );
      } else {
        logger.warn(
          `[StripeService.handleWebhookEvent] User not found and no customer ID available in event ${event.id}, type ${event.type}. Cannot process.`,
        );
      }
      // Consider if we should record these events somewhere for manual review if they can't be linked.
      // For now, we don't add to processedEventIds if no user is found, as there's no user record to update.
      // This means if the user is created/linked later, the event *might* be reprocessed if Stripe resends,
      // or we might miss it if Stripe doesn't resend and it was critical for initial setup.
      // This area might need more robust handling for orphaned events.
      return { received: true, message: 'User not found, event skipped for user-specific processing.' };
    }

    // Ensure processedEventIds array exists for the user
    if (!user.processedEventIds) {
        user.processedEventIds = [];
    }

    if (user.processedEventIds.includes(event.id)) {
      logger.info(`[StripeService.handleWebhookEvent] Event ${event.id} already processed for user ${user._id}.`);
      return { received: true, message: 'Event already processed.' };
    }

    let updateData = {};
    if (event.data.object.customer && !user.stripeCustomerId) {
        updateData.stripeCustomerId = event.data.object.customer;
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          updateData.hasActiveSubscription = true;
          updateData.stripeSubscriptionId = session.subscription;
          if (session.customer && (!user.stripeCustomerId || user.stripeCustomerId !== session.customer)) {
             updateData.stripeCustomerId = session.customer;
          }
          logger.info(`[StripeService.handleWebhookEvent] Checkout completed for user ${user._id}. Subscription ${session.subscription} active. Stripe Customer ID: ${session.customer}`);
        }
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        updateData.hasActiveSubscription = ['active', 'trialing'].includes(subscriptionUpdated.status);
        updateData.stripeSubscriptionId = subscriptionUpdated.id;
        if (subscriptionUpdated.customer && (!user.stripeCustomerId || user.stripeCustomerId !== subscriptionUpdated.customer)) {
           updateData.stripeCustomerId = subscriptionUpdated.customer;
        }
        logger.info(`[StripeService.handleWebhookEvent] Subscription ${subscriptionUpdated.id} for user ${user._id} updated. Status: ${subscriptionUpdated.status}, Active: ${updateData.hasActiveSubscription}`);
        break;
      case 'customer.subscription.deleted':
        const subscriptionDeleted = event.data.object;
        if (user.stripeSubscriptionId === subscriptionDeleted.id) {
            updateData.hasActiveSubscription = false;
            logger.info(`[StripeService.handleWebhookEvent] Tracked subscription ${subscriptionDeleted.id} for user ${user._id} deleted. Active set to false.`);
        } else {
            logger.info(`[StripeService.handleWebhookEvent] Untracked subscription ${subscriptionDeleted.id} deleted for customer ${subscriptionDeleted.customer}. User ${user._id} might have a different active subscription.`);
        }
        break;
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        if (invoice.subscription && invoice.paid) {
           const sub = await this.stripe.subscriptions.retrieve(invoice.subscription);
           if (['active', 'trialing'].includes(sub.status)) {
             updateData.hasActiveSubscription = true;
             if (user.stripeSubscriptionId !== sub.id) {
                updateData.stripeSubscriptionId = sub.id;
             }
             logger.info(`[StripeService.handleWebhookEvent] Invoice payment succeeded for user ${user._id}. Subscription ${sub.id} confirmed active.`);
           } else {
             logger.warn(`[StripeService.handleWebhookEvent] Invoice payment succeeded for sub ${sub.id} but status is ${sub.status}. User: ${user._id}`);
           }
        }
        break;
      case 'invoice.payment_failed':
        logger.warn(`[StripeService.handleWebhookEvent] Invoice payment failed for user ${user._id}. Subscription: ${event.data.object.subscription}. Current user status: ${user.hasActiveSubscription}. Will rely on subscription.updated/deleted events for final status.`);
        break;
      default:
        logger.info(`[StripeService.handleWebhookEvent] Unhandled event type: ${event.type}. Event ID: ${event.id}`);
        await User.updateOne({ _id: user._id }, { $addToSet: { processedEventIds: event.id } });
        return { received: true, message: `Unhandled event type: ${event.type}, marked as processed.` };
    }

    if (Object.keys(updateData).length > 0) {
      logger.info(`[StripeService.handleWebhookEvent] Updating user ${user._id} in DB with data:`, updateData);
      await User.updateOne({ _id: user._id }, { $set: updateData, $addToSet: { processedEventIds: event.id } });
    } else {
      logger.info(`[StripeService.handleWebhookEvent] No data updates for event ${event.id}, but marking as processed for user ${user._id}.`);
      await User.updateOne({ _id: user._id }, { $addToSet: { processedEventIds: event.id } });
    }
    
    logger.info(`[StripeService.handleWebhookEvent] Successfully processed event ${event.id} for user ${user._id}`);
    return { received: true, processed: true };
  }

  /**
   * Handle subscription update events
   * @private
   * @param {Object} subscription - Stripe subscription object
   */
  async _handleSubscriptionUpdate(subscription) {
    try {
      // Find the user by customer ID
      const user = await User.findOne({
        stripeCustomerId: subscription.customer,
      });

      if (user) {
        // Update the user's subscription status
        await User.findByIdAndUpdate(user._id, {
          stripeSubscriptionId: subscription.id,
          stripeSubscriptionStatus: subscription.status,
        });

        logger.info(`Subscription status updated to ${subscription.status} for user ${user._id}`);
      } else {
        logger.warn(
          `Could not find user for customer ID ${subscription.customer} during subscription update`,
        );
      }
    } catch (error) {
      logger.error('Error handling subscription update:', error);
      throw error;
    }
  }

  verifyWebhookSignature(rawBody, sig) {
    try {
      const event = this.stripe.webhooks.constructEvent(rawBody, sig, this.webhookSecret);
      return event;
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      throw new Error(`Webhook Error: ${err.message}`);
    }
  }

  async getDbUserFromEvent(event) {
    let user;
    if (event.type === 'checkout.session.completed' && event.data.object.client_reference_id) {
      logger.debug(`[StripeService.getDbUserFromEvent] Finding user by client_reference_id: ${event.data.object.client_reference_id}`);
      user = await User.findById(event.data.object.client_reference_id);
    } else if (event.data.object.customer) {
      logger.debug(`[StripeService.getDbUserFromEvent] Finding user by stripeCustomerId: ${event.data.object.customer}`);
      user = await User.findOne({ stripeCustomerId: event.data.object.customer });
    }
    if (user) {
      logger.debug(`[StripeService.getDbUserFromEvent] User found: ${user._id}`);
    } else {
      logger.warn(`[StripeService.getDbUserFromEvent] User not found for event type ${event.type}, ID ${event.id}`);
    }
    return user;
  }
}

const {
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_ID,
  STRIPE_SUCCESS_URL,
  STRIPE_CANCEL_URL,
} = process.env;

if (
  !STRIPE_API_KEY ||
  !STRIPE_WEBHOOK_SECRET ||
  !STRIPE_PRICE_ID
) {
  logger.warn(
    '[StripeService] Missing one or more required Stripe environment variables (STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID). Stripe functionality will be disabled or limited.',
  );
  module.exports = {
    hasActiveSubscription: async () => false,
    createCheckoutSession: async () => {
      throw new Error('Stripe not configured');
    },
    createCustomerPortalSession: async () => {
      throw new Error('Stripe not configured');
    },
    handleWebhookEvent: async () => {
      logger.warn('Stripe not configured, webhook ignored');
    },
    verifyWebhookSignature: () => false,
    getDbUserFromEvent: async () => null, // Ensure all methods expected by routes are present
    _handleSubscriptionUpdate: async () => {},
    isConfigured: false,
  };
} else {
  const serviceInstance = new StripeService(
    STRIPE_API_KEY,
    STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID,
    STRIPE_SUCCESS_URL || '', // Defaulting to empty string as routes provide specific URLs
    STRIPE_CANCEL_URL || '',  // Defaulting to empty string
  );
  serviceInstance.isConfigured = true;
  module.exports = serviceInstance;
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('~/models/User');
const { logger } = require('~/config');

/**
 * Stripe service for fab-ai project
 * Handles all interactions with the Stripe API
 */
class StripeService {
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
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

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
   * @returns {Promise<Object>} - Checkout session
   */
  async createCheckoutSession(user, successUrl, cancelUrl) {
    try {
      // Check if the user already has a Stripe customer ID
      let customerId = user.stripeCustomerId;

      // If not, create a new Stripe customer
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user._id.toString() },
        });

        customerId = customer.id;

        // Update the user with their new Stripe customer ID
        await User.findByIdAndUpdate(user._id, {
          stripeCustomerId: customerId,
        });
      }

      // Create a checkout session with the subscription product
      const session = await stripe.checkout.sessions.create({
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
        metadata: {
          userId: user._id.toString(),
        },
      });

      return session;
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

      const session = await stripe.billingPortal.sessions.create({
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
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.metadata.userId;

          // Update the user with their subscription information
          await User.findByIdAndUpdate(userId, {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            stripeSubscriptionStatus: 'active',
          });

          logger.info(`Subscription created for user ${userId}`);
          break;
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object;
          await this._handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object;
          await this._handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object;

          // Find the user by customer ID
          const user = await User.findOne({
            stripeCustomerId: subscription.customer,
          });

          if (user) {
            // Update the user's subscription status
            await User.findByIdAndUpdate(user._id, {
              stripeSubscriptionStatus: 'canceled',
            });

            logger.info(`Subscription canceled for user ${user._id}`);
          } else {
            logger.warn(
              `Could not find user for customer ID ${subscription.customer} during subscription cancellation`,
            );
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;

          // Only process subscription invoices
          if (invoice.subscription) {
            const user = await User.findOne({
              stripeSubscriptionId: invoice.subscription,
            });

            if (user) {
              // Update the user's subscription status to active if it's not already
              if (user.stripeSubscriptionStatus !== 'active') {
                await User.findByIdAndUpdate(user._id, {
                  stripeSubscriptionStatus: 'active',
                });

                logger.info(
                  `Subscription payment succeeded for user ${user._id}, status updated to active`,
                );
              }
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;

          // Only process subscription invoices
          if (invoice.subscription) {
            const user = await User.findOne({
              stripeSubscriptionId: invoice.subscription,
            });

            if (user) {
              // Update the user's subscription status to past_due
              await User.findByIdAndUpdate(user._id, {
                stripeSubscriptionStatus: 'past_due',
              });

              logger.info(
                `Subscription payment failed for user ${user._id}, status updated to past_due`,
              );
            }
          }
          break;
        }
      }
    } catch (error) {
      logger.error('Error handling webhook event:', error);
      throw error;
    }
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
}

module.exports = new StripeService();

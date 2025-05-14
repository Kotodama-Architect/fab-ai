import { Middleware } from '@reduxjs/toolkit/query';
import { handleSubscriptionRequired } from '~/utils/subscription';

/**
 * Middleware to handle API errors related to subscriptions
 * When a 402 status code is received, it redirects to the subscription page
 */
export const subscriptionErrorMiddleware: Middleware = () => (next) => (action) => {
  // Check if the action is a rejected action with a 402 status code
  if (action?.payload?.status === 402 && action?.payload?.data?.subscription_required) {
    // Handle subscription required error
    handleSubscriptionRequired(action.payload);
  }

  // Continue processing the action
  return next(action);
};

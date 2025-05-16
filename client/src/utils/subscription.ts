/**
 * Utility functions for subscription management
 */

import type { Router } from '@remix-run/router'; // Router型をインポート

/**
 * Handle API responses that indicate a subscription is required
 *
 * @param error The error response from an API call
 * @param router The react-router instance for navigation
 * @returns Boolean indicating if the error was handled (user redirected to subscription page)
 */
export const handleSubscriptionRequired = (error: any, router: Router): boolean => {
  if (error?.response?.status === 402 && error?.response?.data?.subscription_required) {
    console.warn('Subscription required, redirecting to /subscription:', error.response.data);
    const { message, status, details } = error.response.data;
    // Pass error details to the subscription page via state
    router.navigate('/subscription', {
      replace: true,
      state: { errorDetails: { message, status, details } },
    });
    return true;
  }
  return false;
};

/**
 * Get the URL to redirect to after successful subscription
 *
 * @returns The URL to redirect to, or null if none is stored
 */
export const getRedirectAfterSubscription = (): string | null => {
  return sessionStorage.getItem('redirectAfterSubscription');
};

/**
 * Clear the redirect URL after it's been used
 */
export const clearRedirectAfterSubscription = (): void => {
  sessionStorage.removeItem('redirectAfterSubscription');
};

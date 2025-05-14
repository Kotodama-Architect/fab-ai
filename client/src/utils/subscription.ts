/**
 * Utility functions for subscription management
 */

/**
 * Handle API responses that indicate a subscription is required
 *
 * @param error The error response from an API call
 * @returns Boolean indicating if the error was handled (user redirected to subscription page)
 */
export const handleSubscriptionRequired = (error: any): boolean => {
  if (error?.status === 402 && error?.data?.subscription_required) {
    // Get the base URL
    const baseUrl = window.location.origin;

    // Construct the URL with detailed error information if available
    let subscriptionUrl = `${baseUrl}/subscription`;

    if (error.data.details) {
      // URL encode the details for safe passage in the URL
      const encodedDetails = encodeURIComponent(error.data.details);
      subscriptionUrl += `?message=${encodedDetails}`;
    }

    // Store the current URL to redirect back after subscription
    sessionStorage.setItem('redirectAfterSubscription', window.location.pathname);

    // Redirect to subscription page
    window.location.href = subscriptionUrl;
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

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from '~/components/ui';
import { getRedirectAfterSubscription, clearRedirectAfterSubscription } from '~/utils/subscription';

/**
 * Component displayed when a user successfully subscribes
 * Redirects to the appropriate page after subscription is confirmed
 */
const SubscriptionSuccess = () => {
  // Get the redirect URL from session storage
  const redirectTo = getRedirectAfterSubscription() || '/';

  useEffect(() => {
    // Clear the redirect URL after getting it
    clearRedirectAfterSubscription();
  }, []);

  // If we have the URL, redirect immediately
  if (redirectTo) {
    return <Navigate to={redirectTo} replace={true} />;
  }

  // Otherwise show a loading spinner for a brief moment
  return (
    <div className="bg-token-main-surface-primary flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto mb-4 h-8 w-8" />
        <h1 className="mb-2 text-2xl font-semibold">Subscription Successful!</h1>
        <p className="text-gray-600">Redirecting you back to the application...</p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;

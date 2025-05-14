import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks';
import { useGetSubscriptionStatusQuery, useCreatePortalSessionMutation } from '~/data-provider';
import { Spinner } from '~/components/ui';

function SubscriptionManagement() {
  const { user } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  // Query to get subscription status
  const { data: subscriptionData, isLoading: isSubscriptionLoading } =
    useGetSubscriptionStatusQuery();

  // Mutation to create portal session
  const [createPortalSession] = useCreatePortalSessionMutation();

  // Handle click to open Stripe customer portal
  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await createPortalSession().unwrap();

      // Redirect to Stripe customer portal
      if (response?.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine subscription status display
  const getStatusDisplay = () => {
    if (!subscriptionData) {
      return 'Unknown';
    }

    if (subscriptionData.hasActiveSubscription) {
      // Map Stripe status to user-friendly display
      const statusMap: Record<string, string> = {
        active: 'Active',
        trialing: 'Trial',
        past_due: 'Past Due',
        canceled: 'Canceled',
        unpaid: 'Unpaid',
        incomplete: 'Incomplete',
        incomplete_expired: 'Expired',
      };
      return statusMap[subscriptionData.subscriptionStatus] || subscriptionData.subscriptionStatus;
    }

    return 'Inactive';
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      <div className="flex items-center justify-between pb-2">
        <div className="text-token-text-primary">
          <div className="font-semibold">Subscription</div>
          <div className="text-token-text-secondary text-xs">Manage your subscription</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-token-text-secondary text-sm">Status: </span>
          <span
            className={`text-sm font-medium ${
              subscriptionData?.hasActiveSubscription ? 'text-green-500' : 'text-yellow-500'
            }`}
          >
            {isSubscriptionLoading ? 'Loading...' : getStatusDisplay()}
          </span>
        </div>

        <button
          className="flex h-9 items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          onClick={handleManageSubscription}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              <span>Loading...</span>
            </>
          ) : (
            <span>Manage Subscription</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default React.memo(SubscriptionManagement);

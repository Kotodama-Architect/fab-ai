import React, { useState, useEffect } from 'react';
import { useAuthContext } from '~/hooks';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSubscriptionStatus, createPortalSession } from '~/services/stripe';
import { Spinner, Button } from '~/components/ui';
import { Trans, useTranslation } from 'react-i18next';
import { SystemRoles } from 'librechat-data-provider';
import { useGetSubscriptionStatusQuery, useCreateCheckoutSessionMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';

function SubscriptionManagement() {
  const { t } = useTranslation();
  const { user, token: authToken } = useAuthContext();
  const localize = useLocalize();

  // Query to get subscription status
  const {
    data: subscriptionStatus,
    isLoading: isSubscriptionLoading,
    error,
  } = useQuery(
    ['subscriptionStatus', authToken],
    () => getSubscriptionStatus(authToken),
    {
      enabled: !!authToken,
    },
  );

  const createPortalSession = useCreatePortalSessionMutation();
  const createCheckoutSession = useCreateCheckoutSessionMutation();

  const handleManageSubscription = async () => {
    try {
      if (user?.role === SystemRoles.ADMIN && !subscriptionStatus?.customerId) {
        // Admin has no Stripe customer ID yet, create a checkout session to add payment method
        // This checkout session could be for a nominal amount or a specific setup item if Stripe allows
        // For simplicity, we'll use the standard checkout session which might create a subscription.
        // Admin will not be *billed* for usage due to backend logic, but needs a payment method for some Stripe actions.
        const result = await createCheckoutSession.mutateAsync({}); // No specific items, relies on default price or setup mode
        if (result?.sessionUrl) {
          window.location.href = result.sessionUrl;
        }
      } else if (subscriptionStatus?.customerId) {
        // Existing customer (Admin or User) - go to portal
        const result = await createPortalSession.mutateAsync({});
        if (result?.portalUrl) {
          window.location.href = result.portalUrl;
        }
      } else {
        // Non-admin user without customerId - should be guided to subscribe (handled by SubscriptionRequired page or similar)
        // Or, if we want a subscribe button here for non-admins:
        const result = await createCheckoutSession.mutateAsync({});
        if (result?.sessionUrl) {
          window.location.href = result.sessionUrl;
        }
      }
    } catch (e) {
      console.error('Error handling subscription management:', e);
    }
  };

  // Determine subscription status display
  const getStatusDisplay = () => {
    if (!subscriptionStatus) {
      return t('com_ui_status_unknown', 'Unknown');
    }

    if (subscriptionStatus.isActive !== undefined) {
      if (subscriptionStatus.isActive) {
        const statusMap: Record<string, string> = {
          active: t('com_ui_status_active', 'Active'),
          trialing: t('com_ui_status_trialing', 'Trial'),
        };
        return statusMap[subscriptionStatus.status?.toLowerCase() ?? ''] || subscriptionStatus.status || t('com_ui_status_active', 'Active');
      } else {
        const inactiveStatusMap: Record<string, string> = {
          past_due: t('com_ui_status_past_due', 'Past Due'),
          canceled: t('com_ui_status_canceled', 'Canceled'),
          unpaid: t('com_ui_status_unpaid', 'Unpaid'),
          incomplete: t('com_ui_status_incomplete', 'Incomplete'),
          incomplete_expired: t('com_ui_status_incomplete_expired', 'Expired'),
        };
        return inactiveStatusMap[subscriptionStatus.status?.toLowerCase() ?? ''] || subscriptionStatus.status || t('com_ui_status_inactive', 'Inactive');
      }
    }
    return subscriptionStatus.status || t('com_ui_status_unknown', 'Unknown');
  };

  if (!user) {
    return null;
  }

  if (user.role === SystemRoles.ADMIN) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {localize('com_ui_subscription_management_admin_title')}
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {localize('com_ui_subscription_management_admin_description')}
        </p>
        {error && (
          <p className="mt-2 text-red-500">
            {localize('com_ui_error_subscription_status_fetch_admin', (error as Error).message || '')}
          </p>
        )}
        <Button
          className="mt-4"
          onClick={handleManageSubscription}
          disabled={createPortalSession.isLoading || createCheckoutSession.isLoading}
        >
          {subscriptionStatus?.customerId 
            ? localize('com_ui_subscription_manage_billing_stripe_portal') 
            : localize('com_ui_subscription_setup_payment_method')}
        </Button>
        {subscriptionStatus?.hasActiveSubscription && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              {localize('com_ui_subscription_admin_active_sub_note', subscriptionStatus.plan || 'Unknown Plan')}
            </p>
        )}
        {!subscriptionStatus?.hasActiveSubscription && subscriptionStatus?.status && (
           <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
             {localize('com_ui_subscription_admin_inactive_sub_note', subscriptionStatus.status)}
           </p>
        )}
      </div>
    );
  }

  if (isSubscriptionLoading && !subscriptionStatus) {
    return (
      <div className="flex h-20 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error && !isSubscriptionLoading) {
    return (
      <div className="text-token-text-error p-4 text-center">
        <Trans i18nKey="com_ui_error_subscription_status_fetch" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
        {localize('com_ui_subscription_management')}
      </h2>
      {subscriptionStatus?.hasActiveSubscription ? (
        <div className="mt-2">
          <p className="text-gray-600 dark:text-gray-300">
            {localize('com_ui_subscription_active_plan', subscriptionStatus.plan || 'N/A')}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {localize('com_ui_subscription_renews', subscriptionStatus.current_period_end ? new Date(subscriptionStatus.current_period_end).toLocaleDateString() : 'N/A')}
          </p>
          <Button className="mt-4" onClick={handleManageSubscription} disabled={createPortalSession.isLoading}>
            {localize('com_ui_subscription_manage_billing_stripe_portal')}
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-gray-600 dark:text-gray-300">
            {localize('com_ui_subscription_no_active_subscription')}
          </p>
          {/* 
            The primary way for non-admins to subscribe is via the SubscriptionRequired page when they hit a paywall.
            However, a button can be added here too if desired.
          */}
          <Button className="mt-4" onClick={handleManageSubscription} disabled={createCheckoutSession.isLoading}>
            {localize('com_ui_subscribe_now')}
          </Button>
          {subscriptionStatus?.status && subscriptionStatus.status !== 'canceled' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{localize('com_ui_subscription_status_notice', subscriptionStatus.status)}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(SubscriptionManagement);

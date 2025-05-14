import React, { useState, useEffect } from 'react';
import { useCreateCheckoutSessionMutation } from '~/data-provider';
import { Button, Spinner, Input } from '~/components/ui';
import { getRedirectAfterSubscription } from '~/utils/subscription';

/**
 * Component displayed when a user needs to subscribe
 */
const SubscriptionRequired = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [createCheckoutSession] = useCreateCheckoutSessionMutation();

  // Get error message from URL if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const messageParam = urlParams.get('message');
    if (messageParam) {
      setErrorMessage(decodeURIComponent(messageParam));
    }
  }, []);

  const handleSubscribe = async () => {
    try {
      setError('');

      // Don't proceed if invitation code is empty
      if (!invitationCode.trim()) {
        setError('Invitation code is required to subscribe');
        return;
      }

      setIsLoading(true);
      const response = await createCheckoutSession({
        invitationCode: invitationCode.trim(),
      }).unwrap();

      // Redirect to Stripe checkout
      if (response?.url) {
        // Get success redirect URL to use after payment
        const redirectPath = getRedirectAfterSubscription() || '/';

        // Add the redirect parameter to the Stripe session
        const checkoutUrl = new URL(response.url);
        checkoutUrl.searchParams.append('redirect_after', redirectPath);

        window.location.href = checkoutUrl.toString();
      } else {
        setError('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      if (error.status === 403) {
        setError('Invalid invitation code');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-token-main-surface-primary flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">Subscription Required</h1>
          <p className="mb-4 text-gray-600">
            To access this feature, you need an active subscription.
          </p>

          {errorMessage && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-amber-700">{errorMessage}</p>
            </div>
          )}

          <div className="mb-4 border-t border-gray-200 py-4">
            <h2 className="mb-2 text-lg font-semibold">Benefits of subscribing:</h2>
            <ul className="list-disc space-y-2 pl-5 text-left text-gray-600">
              <li>Full access to all AI models</li>
              <li>Unlimited conversations</li>
              <li>Priority support</li>
              <li>Advanced features</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-left text-sm font-medium text-gray-700">
              Invitation Code
            </label>
            <Input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              placeholder="Enter your invitation code"
              className="mb-2 w-full"
            />
            {error && <p className="text-left text-sm text-red-500">{error}</p>}
          </div>

          <Button
            className="w-full bg-blue-600 py-2 transition-colors hover:bg-blue-700"
            onClick={handleSubscribe}
            disabled={isLoading || !invitationCode.trim()}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                <span>Loading...</span>
              </>
            ) : (
              <span>Subscribe Now</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;

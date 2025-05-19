import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { useCreateCheckoutSessionMutation } from '~/data-provider';
import { Button, Spinner, Input } from '~/components/ui';
import { useLocalize, useAuthContext } from '~/hooks';

interface CreateCheckoutSessionData {
  invitationCode: string;
  token?: string;
}

/**
 * Component displayed when a user needs to subscribe
 */
const SubscriptionRequired = () => {
  const localize = useLocalize();
  const { t } = useTranslation();
  const location = useLocation();
  const { logout, token } = useAuthContext();

  const [isLoading, setIsLoading] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  useEffect(() => {
    if (location.state?.errorDetails?.details) {
      setApiErrorMessage(location.state.errorDetails.details);
    } else if (location.state?.errorDetails?.message) {
      setApiErrorMessage(location.state.errorDetails.message);
    }
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const { mutate: createCheckout, isLoading: isCheckoutLoading } = useCreateCheckoutSessionMutation({
    onSuccess: (data) => {
      if (data && data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      console.error('Create checkout session error:', err);
      const message =
        err?.response?.data?.message ||
        err.message ||
        t('com_ui_error_creating_checkout_session');
      setError(message);
      if (err?.response?.data?.message) {
        setApiErrorMessage(err.response.data.message);
      } else {
        setApiErrorMessage('');
      }
      setIsLoading(false);
    },
    onMutate: () => {
      setIsLoading(true);
      setError('');
      setApiErrorMessage('');
    },
  });

  const handleLogout = () => {
    logout('/login');
  };

  const handleSubscribe = async () => {
    if (!invitationCode.trim()) {
      setError(t('com_ui_invitation_code_required'));
      return;
    }
    createCheckout({ invitationCode, token });
  };

  const currentIsLoading = isLoading || isCheckoutLoading;

  return (
    <div className="bg-token-main-surface-primary flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">
            <Trans i18nKey="com_ui_subscription_required_title" />
          </h1>
          <p className="mb-4 text-gray-600">
            <Trans i18nKey="com_ui_subscription_required_description" />
          </p>

          {apiErrorMessage && (
            <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-amber-700">{apiErrorMessage}</p>
            </div>
          )}

          <div className="mb-4 border-t border-gray-200 py-4">
            <h2 className="mb-2 text-lg font-semibold">
              {t('com_ui_benefits_of_subscribing', 'Benefits of subscribing:')}
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-left text-gray-600">
              <li>{t('com_ui_benefit_full_access', 'Full access to all AI models')}</li>
              <li>{t('com_ui_benefit_unlimited_convos', 'Unlimited conversations')}</li>
              <li>{t('com_ui_benefit_priority_support', 'Priority support')}</li>
              <li>{t('com_ui_benefit_advanced_features', 'Advanced features')}</li>
            </ul>
          </div>

          <div className="mb-4">
            <label
              htmlFor="invitationCode"
              className="mb-1 block text-left text-sm font-medium text-gray-700"
            >
              <Trans i18nKey="com_ui_invitation_code" />
            </label>
            <Input
              id="invitationCode"
              type="text"
              value={invitationCode}
              onChange={(e) => {
                setInvitationCode(e.target.value);
                if (error) setError('');
              }}
              placeholder={localize('com_ui_enter_invitation_code')}
              className="mb-2 w-full"
            />
            {error && <p className="text-left text-sm text-red-500">{error}</p>}
          </div>

          <Button
            className="w-full bg-blue-600 py-2 transition-colors hover:bg-blue-700"
            onClick={handleSubscribe}
            disabled={currentIsLoading || !invitationCode.trim()}
          >
            {currentIsLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                <span>
                  <Trans i18nKey="com_ui_loading" />
                </span>
              </>
            ) : (
              <span>
                <Trans i18nKey="com_ui_subscribe" />
              </span>
            )}
          </Button>

          <div className="mt-4 text-center">
            <Button variant="outline" className="w-full py-2" onClick={handleLogout}>
              <Trans i18nKey="com_auth_login_elsewhere" defaults="Login with a different account" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionRequired;

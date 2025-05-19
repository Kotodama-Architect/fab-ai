import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { useLocalize } from '~/hooks';
import useViewerLoginMutation from '~/data-provider/Auth/useViewerLoginMutation';
// import store from '~/store'; // For setting viewer state, if needed. Will be handled differently.
import { Input, Button, Label, Spinner } from '~/components/ui';
import { useAuthContext } from '~/hooks/AuthContext';

export default function ViewerLogin() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { logout: regularUserLogout } = useAuthContext(); // Get logout function for regular user

  // Placeholder for viewer state if needed in the future, e.g., via a separate ViewerContext
  // const setViewer = useSetRecoilState(store.viewerState); 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const viewerLoginMutation = useViewerLoginMutation({
    onSuccess: (data) => {
      setError('');
      // The viewer token is set as an httpOnly cookie by the backend.
      // Client-side, we primarily need to ensure any existing User/Admin session is cleared.

      const performRedirect = () => {
        // Redirect to a shared page or a viewer dashboard (if any)
        const sharedUrl = sessionStorage.getItem('viewer_redirect_url');
        if (sharedUrl) {
          sessionStorage.removeItem('viewer_redirect_url');
          navigate(sharedUrl, { replace: true }); // Use navigate for SPA-friendly redirection
        } else {
          navigate('/', { replace: true }); // Or a dedicated viewer landing page
        }
      };

      if (regularUserLogout) {
        console.log('Clearing regular user session if any...');
        regularUserLogout(undefined, { // Pass undefined as the first argument if no payload
          onSuccess: () => {
            console.log('Regular user session cleared successfully.');
            performRedirect();
          },
          onError: (error) => {
            console.error('Error clearing regular user session:', error);
            performRedirect(); // Still proceed with redirect even if logout fails
          },
        });
      } else {
        performRedirect(); // No regular user logout function, proceed directly
      }
      
      // TODO: Optionally, set viewer-specific context/state if needed for the UI
      // For example: setViewer({ email: data.viewer.email, role: data.viewer.role, id: data.viewer.id });
    },
    onError: (err: Error) => {
      setError(err.message || localize('com_auth_error_login'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(localize('com_auth_creds_required'));
      return;
    }
    viewerLoginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white pt-6 sm:pt-0">
      <div className="w-authPageWidth overflow-hidden bg-white px-6 py-4 sm:max-w-md sm:rounded-lg">
        <h1 className="mb-4 text-center text-3xl font-semibold">
          {localize('com_auth_viewer_login_title')} {/* Viewer Login */}
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700 undefined">
              {localize('com_auth_email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              autoFocus
            />
          </div>
          <div className="mb-4">
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700 undefined">
              {localize('com_auth_password')}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="mt-6">
            <Button
              type="submit"
              className="w-full bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={viewerLoginMutation.isLoading}
            >
              {viewerLoginMutation.isLoading ? <Spinner /> : localize('com_auth_login')}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm">
          {localize('com_auth_dont_have_viewer_account')}{' '}
          <a href="/auth/viewer/register" className="text-green-500 hover:underline">
            {localize('com_auth_viewer_register_prompt')}
          </a>
        </p>
         <p className="mt-2 text-center text-sm">
          <a href="/login" className="text-gray-600 hover:underline">
            {localize('com_auth_login_as_user')} {/* Login as User/Admin */}
          </a>
        </p>
      </div>
    </div>
  );
} 
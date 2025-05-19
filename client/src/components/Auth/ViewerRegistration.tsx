import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalize } from '~/hooks';
import useViewerRegisterMutation from '~/data-provider/Auth/useViewerRegisterMutation';
import { useGetStartupConfig } from '~/data-provider';
import { Input, Button, Label, Spinner } from '~/components/ui';

export default function ViewerRegistration() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const { data: startupConfig } = useGetStartupConfig();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const viewerRegisterMutation = useViewerRegisterMutation({
    onSuccess: () => {
      setError('');
      // After successful registration, redirect to viewer login page
      navigate('/auth/viewer/login?registered=true'); 
    },
    onError: (err: Error) => {
      setError(err.message || localize('com_auth_error_register'));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(localize('com_auth_passwords_must_match'));
      return;
    }
    setError('');
    viewerRegisterMutation.mutate({ email, password });
  };

  if (startupConfig && startupConfig.allowViewerRegistration === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white pt-6 sm:pt-0">
        <div className="w-full px-6 py-4 sm:max-w-md">
          <h1 className="mb-4 text-center text-2xl font-semibold">
            {localize('com_auth_viewer_register_title')}
          </h1>
          <p className="text-center text-red-500">
            {localize('com_auth_error_viewer_registration_disabled')}
          </p>
          <div className="mt-6 text-center">
            <a
              href="/auth/viewer/login"
              className="text-sm text-gray-600 hover:underline"
            >
              {localize('com_auth_viewer_login_prompt')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white pt-6 sm:pt-0">
      <div className="w-authPageWidth overflow-hidden bg-white px-6 py-4 sm:max-w-md sm:rounded-lg">
        <h1 className="mb-4 text-center text-3xl font-semibold">
          {localize('com_auth_viewer_register_title')} {/* Viewer Registration */}
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
            <Label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
          <div className="mb-4">
            <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              {localize('com_auth_confirm_password')}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="mt-6">
            <Button
              type="submit"
              className="w-full bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              disabled={viewerRegisterMutation.isLoading}
            >
              {viewerRegisterMutation.isLoading ? <Spinner /> : localize('com_auth_register')}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm">
          {localize('com_auth_already_have_viewer_account')}{' '}
          <a href="/auth/viewer/login" className="text-green-500 hover:underline">
            {localize('com_auth_viewer_login_prompt')}
          </a>
        </p>
      </div>
    </div>
  );
} 
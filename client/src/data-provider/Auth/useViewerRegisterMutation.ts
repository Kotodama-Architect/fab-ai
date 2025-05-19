import { useMutation } from '@tanstack/react-query';
import type { TRegisterUser, TRequestOptions } from 'librechat-data-provider';
import { request } from 'librechat-data-provider'; // Import request object

// Define a more specific type for Viewer registration if needed, or reuse TRegisterUser if compatible
export type TRegisterViewer = TRegisterUser;

export interface TRegisterViewerResponse {
  message: string;
  // Typically, registration doesn't return a token or user object directly,
  // but confirms success and requires separate login.
}

const viewerRegister = async ({
  payload,
}: {
  payload: TRegisterViewer;
}): Promise<TRegisterViewerResponse> => {
  return request.post<TRegisterViewerResponse, TRegisterViewer>('/api/auth/viewer/register', payload);
};

export default function useViewerRegisterMutation(
  options?: TRequestOptions<TRegisterViewerResponse, TRegisterViewer>,
) {
  return useMutation<TRegisterViewerResponse, Error, TRegisterViewer>(
    (payload: TRegisterViewer) => viewerRegister({ payload }),
    {
      // Success/error handling can be done in the component or here globally
      ...options,
    },
  );
} 
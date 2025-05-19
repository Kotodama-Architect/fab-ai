import { useMutation } from '@tanstack/react-query';
// import {Regions} from "librechat-data-provider"; // Not used
import type { TLoginUser, TRequestOptions } from 'librechat-data-provider'; // TLoginResponse not used from here
import { request } from 'librechat-data-provider'; // Import request object

export type TLoginViewer = Omit<TLoginUser, 'rememberMe'>; // Viewers might not need 'rememberMe'

export interface TLoginViewerResponse {
  message: string;
  token: string;
  viewer: {
    id: string;
    email: string;
    role: string;
  };
}

const viewerLogin = async ({
  payload,
}: {
  payload: TLoginViewer;
}): Promise<TLoginViewerResponse> => {
  // Note: The request.post method from librechat-data-provider sends data as JSON
  return request.post<TLoginViewerResponse, TLoginViewer>('/api/auth/viewer/login', payload);
};

export default function useViewerLoginMutation(
  options?: TRequestOptions<TLoginViewerResponse, TLoginViewer>,
) {
  return useMutation<TLoginViewerResponse, Error, TLoginViewer>(
    (payload: TLoginViewer) => viewerLogin({ payload }),
    {
      // Success/error handling can be done in the component or here globally
      ...options,
    },
  );
} 
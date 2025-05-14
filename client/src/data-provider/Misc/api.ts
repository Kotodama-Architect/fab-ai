import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// fab-ai: Subscription API
export const stripeApi = createApi({
  reducerPath: 'stripeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/stripe',
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getSubscriptionStatus: builder.query({
      query: () => ({
        url: '/subscription-status',
        method: 'GET',
      }),
    }),
    createCheckoutSession: builder.mutation({
      query: (data: { invitationCode: string }) => ({
        url: '/create-checkout-session',
        method: 'POST',
        body: data,
      }),
    }),
    createPortalSession: builder.mutation({
      query: () => ({
        url: '/create-portal-session',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetSubscriptionStatusQuery,
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} = stripeApi;
 
import { subscriptionErrorMiddleware } from '~/data-provider/errorHandler';

// Export middleware for Redux store configuration
export const middleware = [subscriptionErrorMiddleware];

export default middleware;

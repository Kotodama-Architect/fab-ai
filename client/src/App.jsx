import { RecoilRoot } from 'recoil';
import { DndProvider } from 'react-dnd';
import { RouterProvider } from 'react-router-dom';
import * as RadixToast from '@radix-ui/react-toast';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ScreenshotProvider, ThemeProvider, useApiErrorBoundary } from './hooks';
import { ToastProvider } from './Providers';
import Toast from './components/ui/Toast';
import { LiveAnnouncer } from '~/a11y';
import { router } from './routes';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { stripeApi } from './data-provider/Misc/api';
import { middleware } from './store/middleware';

const App = () => {
  const { setError } = useApiErrorBoundary();

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error?.response?.status === 401) {
          setError(error);
        }
      },
    }),
  });

  const store = configureStore({
    reducer: {
      [stripeApi.reducerPath]: stripeApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(stripeApi.middleware, ...middleware),
  });

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RecoilRoot>
          <LiveAnnouncer>
            <ThemeProvider>
              <RadixToast.Provider>
                <ToastProvider>
                  <DndProvider backend={HTML5Backend}>
                    <RouterProvider router={router} />
                    <ReactQueryDevtools initialIsOpen={false} position="top-right" />
                    <Toast />
                    <RadixToast.Viewport className="pointer-events-none fixed inset-0 z-[1000] mx-auto my-2 flex max-w-[560px] flex-col items-stretch justify-start md:pb-5" />
                  </DndProvider>
                </ToastProvider>
              </RadixToast.Provider>
            </ThemeProvider>
          </LiveAnnouncer>
        </RecoilRoot>
      </QueryClientProvider>
    </Provider>
  );
};

export default () => (
  <ScreenshotProvider>
    <App />
    <iframe
      src="/assets/silence.mp3"
      allow="autoplay"
      id="audio"
      title="audio-silence"
      style={{
        display: 'none',
      }}
    />
  </ScreenshotProvider>
);

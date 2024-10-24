import * as Sentry from '@sentry/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { sentryCommonOptions } from './config';
import './index.css';

Sentry.init(sentryCommonOptions);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<h3>Something went wrong</h3>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);

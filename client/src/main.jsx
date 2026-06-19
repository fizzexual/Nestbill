import ReactDOM from 'react-dom/client';
import BuilderApp from './builder/BuilderApp.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';
import { useBuilder, useUI } from './builder/store.js';
import { exportHtml } from './builder/exportSite.js';

// Expose stores in dev for debugging and automated verification.
if (import.meta.env.DEV) {
  window.__prism = { useBuilder, useUI, exportHtml };
}

// NOTE: StrictMode is intentionally omitted — the iframe canvas does imperative
// document setup that doesn't play well with StrictMode's double-invoked effects.
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BuilderApp />
  </ErrorBoundary>,
);

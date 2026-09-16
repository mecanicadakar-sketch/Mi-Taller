import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import './index.css';

// Configure PWA Manifest dynamically based on portal query parameter
try {
  const urlParams = new URLSearchParams(window.location.search);
  const isClientPortal =
    urlParams.get('portal') === 'cliente' ||
    urlParams.get('modo') === 'cliente' ||
    Boolean(urlParams.get('patente'));

  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    if (isClientPortal) {
      manifestLink.setAttribute('href', '/manifest-cliente.json');
      document.title = 'Consulta por Patente - MiTaller';
    } else {
      manifestLink.setAttribute('href', '/manifest.json');
    }
  }
} catch (e) {
  console.warn('Error configuring dynamic manifest:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);


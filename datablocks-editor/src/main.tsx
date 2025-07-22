import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Initialize engines and node definitions
import { initializeExecutors } from './engines';
import { registerExampleNodes } from './utils/examples';

// Initialize the application
initializeExecutors();
registerExampleNodes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

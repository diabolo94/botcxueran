
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './i18n'; // Ensure i18n is initialized
import './index.css'; // Assuming there is a CSS file, or standard setup

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Use a global variable to store the root to prevent multiple initializations
const globalAny: any = window;
if (!globalAny.__reactRoot) {
  globalAny.__reactRoot = ReactDOM.createRoot(rootElement);
}

globalAny.__reactRoot.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

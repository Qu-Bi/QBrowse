import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { initI18n } from './i18n/index';
import './index.css';

initI18n().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { LayoutProvider } from './layoutProvider';

// Initialize global variables
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || require('buffer').Buffer;
  window.process = window.process || {
    env: {},
    version: '',
    nextTick: function(fn: Function) { setTimeout(fn, 0); }
  };
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <LayoutProvider>
      <App />
    </LayoutProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

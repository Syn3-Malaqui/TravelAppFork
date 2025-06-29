import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Remove loading screen once React app is ready
const removeLoadingScreen = () => {
  const body = document.body;
  body.classList.add('app-loaded');
  
  // Remove loading screen after a brief delay to ensure smooth transition
  setTimeout(() => {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.remove();
    }
  }, 100);
};

const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove loading screen after render
removeLoadingScreen();
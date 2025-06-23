import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Preload critical CSS
const preloadCSS = () => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = 'tailwind.css';
  link.as = 'style';
  document.head.appendChild(link);
};

// Preload critical fonts
const preloadFonts = () => {
  const fontUrls = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
  ];
  
  fontUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'font';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Execute preloading
preloadCSS();
preloadFonts();

// Create root with fallback
createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading application..." />
      </div>
    }>
      <App />
    </Suspense>
  </StrictMode>
);
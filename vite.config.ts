import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: "/",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  build: {
    // Improve build performance and optimize for Vercel
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-components': [
            '@radix-ui/react-slot',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-avatar',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          'supabase': ['@supabase/supabase-js'],
        },
        // Ensure CSS files are properly generated
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize for Vercel's build limits
    chunkSizeWarningLimit: 1000,
    // Ensure assets are copied correctly
    assetsDir: 'assets',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'lucide-react',
    ],
  },
  server: {
    // Optimize dev server
    hmr: {
      overlay: true,
    },
  },
}));
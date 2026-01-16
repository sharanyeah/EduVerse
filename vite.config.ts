
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode`
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // In dev mode, we want the API key for direct browser calls.
  // In production, we leave it empty so the code uses the Netlify Proxy.
  const apiKey = mode === 'development' ? (env.API_KEY || env.VITE_API_KEY || (process as any).env.API_KEY) : '';

  return {
    plugins: [react()],
    define: {
      // Injects the API_KEY into the client-side code AS A STRING only if in dev
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', '@google/genai', 'recharts', 'zustand'],
            math: ['react-markdown', 'remark-math', 'rehype-katex'],
          },
        },
      },
    },
  };
});

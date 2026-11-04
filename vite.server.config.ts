import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Dedicated Vite build configuration for Curriculum Server (SaaS Control Plane)
export default defineConfig(() => {
  return {
    root: path.resolve(__dirname, 'apps/curriculum-server'),
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        '@shared-ui': path.resolve(__dirname, 'packages/shared-ui/src/index.tsx'),
        '@shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist/server-app'),
      emptyOutDir: true,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

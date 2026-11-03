import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const staticDir = path.resolve(__dirname, '../../dist/server-app');

app.use(express.static(staticDir));

// Health check endpoint for Cloud Run
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'curriculum-server-frontend', timestamp: new Date().toISOString() });
});

// SPA fallback for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Curriculum Server Frontend running on port ${PORT}, serving from ${staticDir}`);
});

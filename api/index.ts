import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Minimal health check for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: true, mode: 'client-side' });
});

app.get('/api/ping', (req, res) => {
  res.json({ pong: true });
});

// All other API routes removed as we are now client-side only.
// Data is stored in localStorage.

export default app;

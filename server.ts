import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { put, list, del } from '@vercel/blob';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  
  // Save data to Vercel Blob
  app.post('/api/save', async (req, res) => {
    try {
      const { loginId, data } = req.body;
      if (!loginId || !data) {
        return res.status(400).json({ success: false, error: 'Missing loginId or data' });
      }

      const fileName = `users/${loginId}/data.json`;
      
      // Vercel Blob put (overwrites if same name in some configs, but blob usually gives new URL)
      // To keep it simple, we use a consistent path if possible or manage URLs
      // Actually, put() with the same path will create a new blob. 
      // We should probably delete the old one or just use the latest from list()
      
      const blob = await put(fileName, JSON.stringify(data), {
        access: 'public', // or 'private' if configured, but public is easier for simple apps
        addRandomSuffix: false, // This helps keep the URL predictable if supported
      });

      res.json({ success: true, url: blob.url });
    } catch (error: any) {
      console.error('Blob Save Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Load data from Vercel Blob
  app.get('/api/load/:loginId', async (req, res) => {
    try {
      const { loginId } = req.params;
      const fileName = `users/${loginId}/data.json`;
      
      // List blobs to find the latest one for this user
      const { blobs } = await list({ prefix: `users/${loginId}/` });
      
      if (blobs.length === 0) {
        return res.json({ success: true, data: null });
      }

      // Get the latest blob (usually the last one in the list or by date)
      const latestBlob = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
      
      const response = await fetch(latestBlob.url);
      const data = await response.json();

      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Blob Load Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

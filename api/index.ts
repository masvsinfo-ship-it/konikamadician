import express from 'express';
import cors from 'cors';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database initialization
  let db: Database | null = null;
  let dbError: string | null = null;

  async function initDb(retry = true): Promise<Database | null> {
    if (db) return db;
    
    const dbPath = path.resolve(process.cwd(), 'dokaner_khata_v3.db');
    console.log('Initializing database at:', dbPath);
    
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      // Disable WAL mode to prevent corruption in this environment
      await db.run('PRAGMA journal_mode = DELETE');

      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          loginId TEXT PRIMARY KEY,
          password TEXT,
          data TEXT,
          name TEXT,
          shopName TEXT,
          address TEXT,
          profilePic TEXT
        )
      `);
      
      console.log('Database initialized successfully');
      dbError = null;
      return db;
    } catch (err: any) {
      console.error('Database initialization failed:', err);
      dbError = err.message;
      
      if (retry && err.message.includes('malformed')) {
        console.log('Malformed database detected, deleting and recreating...');
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        db = null;
        return initDb(false);
      }
      return null;
    }
  }

  // Initialize immediately
  await initDb();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/health', async (req, res) => {
    const database = await initDb();
    res.json({ 
      status: 'ok', 
      db: !!database, 
      error: dbError,
      dbPath: path.resolve(process.cwd(), 'dokaner_khata_v3.db')
    });
  });

  app.get('/api/ping', (req, res) => {
    res.send('pong');
  });

  app.post('/api/login', async (req, res) => {
    const database = await initDb();
    if (!database) {
      return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি। এরর: ' + dbError });
    }
    
    const { loginId, password } = req.body;
    console.log('Login attempt for:', loginId);
    
    try {
      const user = await database.get('SELECT * FROM users WHERE loginId = ?', loginId);
      
      if (!user) {
        console.log('User not found:', loginId);
        return res.status(404).json({ error: 'এই মোবাইল নাম্বার দিয়ে কোনো একাউন্ট পাওয়া যায়নি' });
      }
      
      if (user.password !== password) {
        console.log('Invalid password for:', loginId);
        return res.status(401).json({ error: 'ভুল পাসওয়ার্ড' });
      }
      
      console.log('Login successful for:', loginId);
      res.json({ 
        success: true, 
        data: JSON.parse(user.data || '{}'),
        profile: { 
          name: user.name || 'Admin', 
          shopName: user.shopName || 'কনিকা মেডিসিন কর্ণার', 
          address: user.address || '', 
          mobile: user.loginId, 
          profilePic: user.profilePic
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'লগইন করার সময় সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/register', async (req, res) => {
    const database = await initDb();
    if (!database) {
      return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি। এরর: ' + dbError });
    }
    
    const { loginId, password, name, shopName, address } = req.body;
    console.log('Registration attempt for:', loginId);

    if (!loginId || !password || !name || !shopName || !address) {
      return res.status(400).json({ error: 'সবগুলো তথ্য প্রদান করা আবশ্যক' });
    }
    
    try {
      await database.run(
        'INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)',
        loginId, password, name, shopName, address, '{}'
      );
      
      console.log('Registration successful for:', loginId);
      res.json({ 
        success: true, 
        profile: { name, shopName, address, mobile: loginId } 
      });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        console.log('Registration failed: Mobile number already exists:', loginId);
        return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
      }
      console.error('Registration error:', err);
      res.status(500).json({ error: 'রেজিস্ট্রেশন করার সময় সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/recover-password', async (req, res) => {
    const database = await initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { loginId, lastTransactionAmount } = req.body;
    
    try {
      const user = await database.get('SELECT * FROM users WHERE loginId = ?', loginId);
      if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
      
      const data = JSON.parse(user.data || '{}');
      const transactions = data.transactions || [];
      if (transactions.length === 0) return res.status(400).json({ error: 'কোনো লেনদেন পাওয়া যায়নি' });
      
      const lastTx = transactions[0];
      if (lastTx.amount.toString() === lastTransactionAmount.toString()) {
        res.json({ success: true, password: user.password });
      } else {
        res.status(400).json({ error: 'শেষ লেনদেনের পরিমাণ মেলেনি' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'পাসওয়ার্ড উদ্ধারে সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/sync', async (req, res) => {
    const database = await initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { loginId, data } = req.body;
    if (!loginId) return res.status(400).json({ error: 'Login ID is required' });
    
    try {
      await database.run('UPDATE users SET data = ? WHERE loginId = ?', JSON.stringify(data), loginId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'সিঙ্ক করতে সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/update-profile', async (req, res) => {
    const database = await initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { currentLoginId, newLoginId, name, shopName, address, password, profilePic } = req.body;
    
    try {
      if (currentLoginId !== newLoginId) {
        const exists = await database.get('SELECT loginId FROM users WHERE loginId = ?', newLoginId);
        if (exists) {
          return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে অন্য কেউ ব্যবহার করছেন' });
        }
      }

      await database.run(`
        UPDATE users 
        SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ?
        WHERE loginId = ?
      `, newLoginId, name, shopName, address, password, profilePic, currentLoginId);
      
      res.json({ 
        success: true, 
        profile: { 
          name, 
          shopName, 
          address, 
          mobile: newLoginId, 
          profilePic
        } 
      });
    } catch (err: any) {
      res.status(500).json({ error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.get('/api/test-db', async (req, res) => {
    try {
      const database = await initDb();
      if (!database) throw new Error('Database not initialized: ' + dbError);
      
      const testId = 'test_' + Date.now();
      await database.run('INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)',
        testId, 'test', 'Test', 'Test Shop', 'Test Address', '{}'
      );
      const user = await database.get('SELECT * FROM users WHERE loginId = ?', testId);
      await database.run('DELETE FROM users WHERE loginId = ?', testId);
      
      res.json({ success: true, message: 'Database is working correctly', user });
    } catch (err: any) {
      console.error('Database test failed:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'সার্ভারে একটি অভ্যন্তরীণ সমস্যা হয়েছে: ' + err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR explicitly to avoid port conflicts
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Cleanup on exit
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      if (db) await db.close();
      console.log('HTTP server closed');
    });
  });
}

startServer();

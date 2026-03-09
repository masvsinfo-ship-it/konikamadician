import express from 'express';
import cors from 'cors';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = 3000;

// Database state
let db: Database | null = null;
let mongoClient: MongoClient | null = null;
let dbError: string | null = null;
let dbType: 'sqlite' | 'mongodb' = 'sqlite';

async function initDb(): Promise<boolean> {
  dbError = null;

  // 1. Try MongoDB (Priority)
  if (process.env.MONGODB_URI) {
    try {
      if (!mongoClient) {
        mongoClient = new MongoClient(process.env.MONGODB_URI, {
          connectTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000,
        });
        await mongoClient.connect();
        console.log('MongoDB connected');
      }
      dbType = 'mongodb';
      return true;
    } catch (err: any) {
      console.error('MongoDB error:', err);
      dbError = 'MongoDB Error: ' + err.message;
      // On Vercel, if Mongo fails, we can't fallback to SQLite easily
      if (process.env.VERCEL) return false;
    }
  }

  // 2. Fallback to SQLite (Only if not on Vercel)
  if (process.env.VERCEL) {
    if (!process.env.MONGODB_URI) {
      dbError = 'MONGODB_URI is not set in Vercel Environment Variables. Please add it to fix this error.';
    }
    return false;
  }

  if (db) return true;
  try {
    const dbPath = path.resolve(process.cwd(), 'dokaner_khata.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.exec(`CREATE TABLE IF NOT EXISTS users (loginId TEXT PRIMARY KEY, password TEXT, data TEXT, name TEXT, shopName TEXT, address TEXT, profilePic TEXT)`);
    
    dbType = 'sqlite';
    return true;
  } catch (err: any) {
    console.error('SQLite error:', err);
    dbError = 'SQLite Error: ' + err.message;
    return false;
  }
}

async function getUser(loginId: string) {
  if (dbType === 'mongodb') {
    return await mongoClient!.db('dokaner_khata').collection('users').findOne({ loginId });
  } else {
    return await db!.get('SELECT * FROM users WHERE loginId = ?', loginId);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', async (req, res) => {
  const ready = await initDb();
  res.json({ status: 'ok', db: ready, type: dbType, error: dbError });
});

// Auth Routes
app.post('/api/login', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database error: ' + dbError });
  const { loginId, password } = req.body;
  try {
    const user = await getUser(loginId);
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    if (user.password !== password) return res.status(401).json({ error: 'ভুল পাসওয়ার্ড' });
    
    const userData = typeof user.data === 'string' ? JSON.parse(user.data || '{}') : (user.data || {});
    res.json({ 
      success: true, 
      data: userData,
      profile: { name: user.name, shopName: user.shopName, address: user.address, mobile: user.loginId, profilePic: user.profilePic } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database error' });
  const { loginId, password, name, shopName, address } = req.body;
  try {
    if (dbType === 'mongodb') {
      const col = mongoClient!.db('dokaner_khata').collection('users');
      if (await col.findOne({ loginId })) return res.status(400).json({ error: 'এই নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
      await col.insertOne({ loginId, password, name, shopName, address, data: {} });
    } else {
      await db!.run('INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)', loginId, password, name, shopName, address, '{}');
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database error' });
  const { loginId, data } = req.body;
  try {
    if (dbType === 'mongodb') {
      await mongoClient!.db('dokaner_khata').collection('users').updateOne({ loginId }, { $set: { data } });
    } else {
      await db!.run('UPDATE users SET data = ? WHERE loginId = ?', JSON.stringify(data), loginId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/update-profile', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database error' });
  const { currentLoginId, newLoginId, name, shopName, address, password, profilePic } = req.body;
  try {
    if (dbType === 'mongodb') {
      await mongoClient!.db('dokaner_khata').collection('users').updateOne({ loginId: currentLoginId }, { $set: { loginId: newLoginId, name, shopName, address, password, profilePic } });
    } else {
      await db!.run('UPDATE users SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ? WHERE loginId = ?', newLoginId, name, shopName, address, password, profilePic, currentLoginId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recover-password', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database error' });
  const { loginId, lastTransactionAmount } = req.body;
  try {
    const user = await getUser(loginId);
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    const data = typeof user.data === 'string' ? JSON.parse(user.data || '{}') : (user.data || {});
    const transactions = data.transactions || [];
    if (transactions.length > 0 && transactions[0].amount.toString() === lastTransactionAmount.toString()) {
      res.json({ success: true, password: user.password });
    } else {
      res.status(400).json({ error: 'তথ্য মেলেনি' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server Start
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.url.startsWith('/api/')) return next();
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }
  if (!process.env.VERCEL) app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
}

if (!process.env.VERCEL) startServer().catch(console.error);
export default app;

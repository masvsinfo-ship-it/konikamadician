import express from 'express';
import cors from 'cors';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { sql } from '@vercel/postgres';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = 3000;

// Database initialization
let db: Database | null = null;
let mongoClient: MongoClient | null = null;
let dbError: string | null = null;
let dbType: 'sqlite' | 'postgres' | 'mongodb' = 'sqlite';

async function initDb(): Promise<boolean> {
  // 1. Try MongoDB (Highest Priority if MONGODB_URI exists)
  if (process.env.MONGODB_URI) {
    try {
      if (!mongoClient) {
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        console.log('Connected to MongoDB successfully');
      }
      dbType = 'mongodb';
      dbError = null;
      return true;
    } catch (err: any) {
      console.error('MongoDB connection failed:', err);
      dbError = 'MongoDB Error: ' + err.message;
      // Continue to fallback
    }
  }

  // 2. Try Vercel Postgres
  if (process.env.POSTGRES_URL) {
    try {
      await sql`CREATE TABLE IF NOT EXISTS users (loginId TEXT PRIMARY KEY, password TEXT, data TEXT, name TEXT, shopName TEXT, address TEXT, profilePic TEXT)`;
      dbType = 'postgres';
      dbError = null;
      return true;
    } catch (err: any) {
      console.error('Postgres connection failed:', err);
      dbError = 'Postgres Error: ' + err.message;
      // Continue to fallback
    }
  }

  // 3. Fallback to SQLite (Local or Vercel /tmp)
  if (db) return true;
  try {
    const dbPath = process.env.VERCEL 
      ? path.join('/tmp', 'dokaner_khata_v3.db') 
      : path.resolve(process.cwd(), 'dokaner_khata_v3.db');
      
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.run('PRAGMA journal_mode = DELETE');
    await db.exec(`CREATE TABLE IF NOT EXISTS users (loginId TEXT PRIMARY KEY, password TEXT, data TEXT, name TEXT, shopName TEXT, address TEXT, profilePic TEXT)`);
    
    dbType = 'sqlite';
    dbError = null;
    return true;
  } catch (err: any) {
    console.error('SQLite connection failed:', err);
    dbError = 'SQLite Error: ' + err.message;
    return false;
  }
}

// Helper to get user collection/table
async function getUser(loginId: string) {
  if (dbType === 'mongodb') {
    const database = mongoClient!.db('dokaner_khata');
    return await database.collection('users').findOne({ loginId });
  } else if (dbType === 'postgres') {
    const { rows } = await sql`SELECT * FROM users WHERE loginId = ${loginId}`;
    return rows[0];
  } else {
    return await db!.get('SELECT * FROM users WHERE loginId = ?', loginId);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/api/health', async (req, res) => {
  const ready = await initDb();
  res.json({ 
    status: 'ok', 
    db: ready, 
    type: dbType, 
    error: dbError,
    env: {
      hasMongo: !!process.env.MONGODB_URI,
      hasPostgres: !!process.env.POSTGRES_URL,
      isVercel: !!process.env.VERCEL
    }
  });
});

app.post('/api/login', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database connection failed: ' + dbError });
  const { loginId, password } = req.body;
  try {
    const user = await getUser(loginId);
    if (!user) return res.status(404).json({ error: 'এই মোবাইল নাম্বার দিয়ে কোনো একাউন্ট পাওয়া যায়নি' });
    if (user.password !== password) return res.status(401).json({ error: 'ভুল পাসওয়ার্ড' });
    
    res.json({ 
      success: true, 
      data: typeof user.data === 'string' ? JSON.parse(user.data || '{}') : (user.data || {}),
      profile: { name: user.name, shopName: user.shopName, address: user.address, mobile: user.loginId, profilePic: user.profilePic } 
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'লগইন এরর: ' + err.message });
  }
});

app.post('/api/register', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database connection failed' });
  const { loginId, password, name, shopName, address } = req.body;
  try {
    if (dbType === 'mongodb') {
      const col = mongoClient!.db('dokaner_khata').collection('users');
      const exists = await col.findOne({ loginId });
      if (exists) return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
      await col.insertOne({ loginId, password, name, shopName, address, data: {} });
    } else if (dbType === 'postgres') {
      await sql`INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (${loginId}, ${password}, ${name}, ${shopName}, ${address}, '{}')`;
    } else {
      await db!.run('INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)', loginId, password, name, shopName, address, '{}');
    }
    res.json({ success: true, profile: { name, shopName, address, mobile: loginId } });
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
    res.status(500).json({ error: 'রেজিস্ট্রেশন এরর: ' + err.message });
  }
});

app.post('/api/sync', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database connection failed' });
  const { loginId, data } = req.body;
  try {
    if (dbType === 'mongodb') {
      await mongoClient!.db('dokaner_khata').collection('users').updateOne({ loginId }, { $set: { data } });
    } else if (dbType === 'postgres') {
      await sql`UPDATE users SET data = ${JSON.stringify(data)} WHERE loginId = ${loginId}`;
    } else {
      await db!.run('UPDATE users SET data = ? WHERE loginId = ?', JSON.stringify(data), loginId);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'সিঙ্ক এরর: ' + err.message });
  }
});

app.post('/api/update-profile', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database connection failed' });
  const { currentLoginId, newLoginId, name, shopName, address, password, profilePic } = req.body;
  try {
    if (currentLoginId !== newLoginId) {
      const exists = await getUser(newLoginId);
      if (exists) return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে অন্য কেউ ব্যবহার করছেন' });
    }
    if (dbType === 'mongodb') {
      await mongoClient!.db('dokaner_khata').collection('users').updateOne({ loginId: currentLoginId }, { $set: { loginId: newLoginId, name, shopName, address, password, profilePic } });
    } else if (dbType === 'postgres') {
      await sql`UPDATE users SET loginId = ${newLoginId}, name = ${name}, shopName = ${shopName}, address = ${address}, password = ${password}, profilePic = ${profilePic} WHERE loginId = ${currentLoginId}`;
    } else {
      await db!.run('UPDATE users SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ? WHERE loginId = ?', newLoginId, name, shopName, address, password, profilePic, currentLoginId);
    }
    res.json({ success: true, profile: { name, shopName, address, mobile: newLoginId, profilePic } });
  } catch (err: any) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'প্রোফাইল আপডেট এরর: ' + err.message });
  }
});

app.post('/api/recover-password', async (req, res) => {
  if (!(await initDb())) return res.status(500).json({ error: 'Database connection failed' });
  const { loginId, lastTransactionAmount } = req.body;
  try {
    const user = await getUser(loginId);
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    const data = typeof user.data === 'string' ? JSON.parse(user.data || '{}') : (user.data || {});
    const transactions = data.transactions || [];
    if (transactions.length === 0) return res.status(400).json({ error: 'কোনো লেনদেন পাওয়া যায়নি' });
    if (transactions[0].amount.toString() === lastTransactionAmount.toString()) res.json({ success: true, password: user.password });
    else res.status(400).json({ error: 'শেষ লেনদেনের পরিমাণ মেলেনি' });
  } catch (err: any) {
    console.error('Recover password error:', err);
    res.status(500).json({ error: 'পাসওয়ার্ড উদ্ধার এরর: ' + err.message });
  }
});

app.get('/api/ping', (req, res) => res.send('pong'));

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'সার্ভারে অভ্যন্তরীণ সমস্যা: ' + err.message });
});

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
  if (!process.env.VERCEL) app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
}

if (!process.env.VERCEL) startServer().catch(console.error);
export default app;

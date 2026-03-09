import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { MongoClient } from 'mongodb';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database state
let cachedClient: MongoClient | null = null;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return { type: 'none', error: 'MONGODB_URI missing' };

  try {
    // If we have a cached client, check if it's still connected
    if (cachedClient) {
      try {
        // Ping the database to check if connection is alive
        await cachedClient.db('admin').command({ ping: 1 });
        return { type: 'mongodb', client: cachedClient };
      } catch (e) {
        console.log('Cached MongoDB connection lost, reconnecting...');
        cachedClient = null;
      }
    }

    // Create a new connection
    const client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 to avoid some SSL/DNS issues in serverless
    });
    await client.connect();
    cachedClient = client;
    console.log('New MongoDB connection established');
    return { type: 'mongodb', client: cachedClient };
  } catch (err: any) {
    console.error('MongoDB connection error:', err);
    cachedClient = null;
    throw err;
  }
}

// Routes
app.get('/api/ping', (req, res) => res.json({ status: 'ok' }));

app.get('/api/health', async (req, res) => {
  try {
    const dbInfo = await getDb();
    res.json({ 
      status: 'ok', 
      db: dbInfo.type === 'mongodb', 
      type: dbInfo.type, 
      error: dbInfo.error || null 
    });
  } catch (err: any) {
    res.json({ status: 'ok', db: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    const dbInfo = await getDb();
    if (dbInfo.type !== 'mongodb') return res.status(500).json({ error: 'Database not configured' });
    
    const user = await dbInfo.client.db('dokaner_khata').collection('users').findOne({ loginId });
    if (!user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    if (user.password !== password) return res.status(401).json({ error: 'ভুল পাসওয়ার্ড' });
    
    res.json({ 
      success: true, 
      data: user.data || {},
      profile: { name: user.name, shopName: user.shopName, address: user.address, mobile: user.loginId, profilePic: user.profilePic } 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { loginId, password, name, shopName, address } = req.body;
    const dbInfo = await getDb();
    if (dbInfo.type !== 'mongodb') return res.status(500).json({ error: 'Database not configured' });
    
    const col = dbInfo.client.db('dokaner_khata').collection('users');
    if (await col.findOne({ loginId })) return res.status(400).json({ error: 'এই নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
    
    await col.insertOne({ loginId, password, name, shopName, address, data: {} });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const { loginId, data } = req.body;
    const dbInfo = await getDb();
    if (dbInfo.type !== 'mongodb') return res.status(500).json({ error: 'Database not configured' });
    
    await dbInfo.client.db('dokaner_khata').collection('users').updateOne({ loginId }, { $set: { data } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback for local development
if (!process.env.VERCEL) {
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server on port ${PORT}`));
}

export default app;

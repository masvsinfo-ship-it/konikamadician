import express from 'express';
import cors from 'cors';
import path from 'path';
import Database from 'better-sqlite3';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Database initialization
  let db: Database.Database | null = null;
  let dbError: string | null = null;

  function initDb() {
    if (db) return db;
    
    try {
      const dbPath = path.resolve(process.cwd(), 'app_data.db');
      console.log('Initializing database at:', dbPath);
      
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      db = new Database(dbPath, { verbose: console.log });
      db.pragma('journal_mode = WAL');

      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          loginId TEXT PRIMARY KEY,
          password TEXT,
          data TEXT,
          name TEXT,
          shopName TEXT,
          address TEXT,
          profilePic TEXT,
          githubId TEXT,
          githubUsername TEXT
        )
      `);
      
      console.log('Database initialized successfully');
      dbError = null;
      return db;
    } catch (err: any) {
      console.error('Database initialization failed:', err);
      dbError = err.message;
      return null;
    }
  }

  // Initialize immediately
  initDb();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (req, res) => {
    const database = initDb();
    res.json({ 
      status: 'ok', 
      db: !!database, 
      error: dbError,
      dbPath: path.resolve(process.cwd(), 'app_data.db')
    });
  });

  app.get('/api/ping', (req, res) => {
    res.send('pong');
  });

  app.post('/api/login', (req, res) => {
    const database = initDb();
    if (!database) {
      return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি। এরর: ' + dbError });
    }
    
    const { loginId, password } = req.body;
    console.log('Login attempt for:', loginId);
    
    try {
      const user = database.prepare('SELECT * FROM users WHERE loginId = ?').get(loginId) as any;
      
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
          profilePic: user.profilePic,
          githubId: user.githubId,
          githubUsername: user.githubUsername
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'লগইন করার সময় সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/register', (req, res) => {
    const database = initDb();
    if (!database) {
      return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি। এরর: ' + dbError });
    }
    
    const { loginId, password, name, shopName, address } = req.body;
    console.log('Registration attempt for:', loginId);

    if (!loginId || !password || !name || !shopName || !address) {
      return res.status(400).json({ error: 'সবগুলো তথ্য প্রদান করা আবশ্যক' });
    }
    
    try {
      const stmt = database.prepare('INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)');
      stmt.run(loginId, password, name, shopName, address, '{}');
      
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

  app.post('/api/recover-password', (req, res) => {
    const database = initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { loginId, lastTransactionAmount } = req.body;
    
    try {
      const user = database.prepare('SELECT * FROM users WHERE loginId = ?').get(loginId) as any;
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

  app.post('/api/sync', (req, res) => {
    const database = initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { loginId, data } = req.body;
    if (!loginId) return res.status(400).json({ error: 'Login ID is required' });
    
    try {
      const stmt = database.prepare('UPDATE users SET data = ? WHERE loginId = ?');
      stmt.run(JSON.stringify(data), loginId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: 'সিঙ্ক করতে সমস্যা হয়েছে: ' + err.message });
    }
  });

  app.post('/api/update-profile', (req, res) => {
    const database = initDb();
    if (!database) {
      return res.status(500).json({ error: 'Database connection failed.' });
    }
    
    const { currentLoginId, newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername } = req.body;
    
    try {
      database.transaction(() => {
        if (currentLoginId !== newLoginId) {
          const exists = database.prepare('SELECT loginId FROM users WHERE loginId = ?').get(newLoginId);
          if (exists) {
            throw new Error('MOBILE_EXISTS');
          }
        }

        const stmt = database.prepare(`
          UPDATE users 
          SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ?, githubId = ?, githubUsername = ?
          WHERE loginId = ?
        `);
        
        stmt.run(newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername, currentLoginId);
      })();
      
      res.json({ 
        success: true, 
        profile: { 
          name, 
          shopName, 
          address, 
          mobile: newLoginId, 
          profilePic,
          githubId,
          githubUsername
        } 
      });
    } catch (err: any) {
      if (err.message === 'MOBILE_EXISTS') {
        return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে অন্য কেউ ব্যবহার করছেন' });
      }
      res.status(500).json({ error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + err.message });
    }
  });

  // GitHub OAuth Routes
  app.get('/api/auth/github/url', (req, res) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(400).json({ error: 'GitHub Client ID is not configured' });
    }
    const redirectUri = `${process.env.APP_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'read:user user:email gist',
    });
    const authUrl = `https://github.com/login/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Code is missing');

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json() as any;
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Konika-Medicine-Corner'
        },
      });
      const userData = await userRes.json() as any;

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'github',
                  githubId: '${userData.id}',
                  githubUsername: '${userData.login}',
                  accessToken: '${tokenData.access_token}'
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('GitHub OAuth error:', error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

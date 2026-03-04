import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';

let db: any;
try {
  // On Vercel, the filesystem is read-only except for /tmp
  const isVercel = !!process.env.VERCEL;
  const dbPath = isVercel 
    ? path.join('/tmp', 'app_data.db') 
    : path.resolve(process.cwd(), 'app_data.db');
    
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      loginId TEXT PRIMARY KEY,
      password TEXT,
      data TEXT
    )
  `);

  try { db.exec('ALTER TABLE users ADD COLUMN name TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN shopName TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN address TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN profilePic TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN githubId TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN githubUsername TEXT'); } catch (e) {}

  try {
    // Removed the hack that changes the first user's loginId
  } catch (e) {}
} catch (err) {
  console.error('Database initialization failed:', err);
}

const app = express();
const PORT = 3000;

async function startServer() {
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: !!db });
  });

app.post('/api/login', (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
    }
    const { loginId, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE loginId = ?').get(loginId) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }
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
  });

  app.post('/api/register', (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
    }
    const { loginId, password, name, shopName, address } = req.body;
    if (!loginId || !password || !name || !shopName || !address) {
      return res.status(400).json({ error: 'Name, Shop Name, Address, Mobile Number and password are required' });
    }
    try {
      db.prepare('INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)').run(loginId, password, name, shopName, address, '{}');
      res.json({ success: true, profile: { name, shopName, address, mobile: loginId } });
    } catch (e: any) {
      console.error('Registration error:', e);
      if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        res.status(400).json({ error: 'Mobile Number already exists' });
      } else {
        res.status(500).json({ error: 'Registration failed' });
      }
    }
  });

  app.post('/api/recover-password', (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
    }
    const { loginId, lastTransactionAmount } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE loginId = ?').get(loginId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const data = JSON.parse(user.data || '{}');
    const transactions = data.transactions || [];
    if (transactions.length === 0) {
      return res.status(400).json({ error: 'কোনো লেনদেন পাওয়া যায়নি' });
    }
    const lastTx = transactions[0]; // Assuming newest first
    if (lastTx.amount.toString() === lastTransactionAmount.toString()) {
      res.json({ success: true, password: user.password });
    } else {
      res.status(400).json({ error: 'শেষ লেনদেনের পরিমাণ মেলেনি' });
    }
  });

  app.post('/api/sync', (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
    }
    const { loginId, data } = req.body;
    if (!loginId) {
      return res.status(400).json({ error: 'Login ID is required' });
    }
    db.prepare('UPDATE users SET data = ? WHERE loginId = ?').run(JSON.stringify(data), loginId);
    res.json({ success: true });
  });

  app.post('/api/update-profile', (req, res) => {
    if (!db) {
      return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
    }
    const { currentLoginId, newLoginId, name, shopName, address, password, profilePic } = req.body;
    try {
      if (currentLoginId !== newLoginId) {
        const exists = db.prepare('SELECT loginId FROM users WHERE loginId = ?').get(newLoginId);
        if (exists) return res.status(400).json({ error: 'This mobile number is already registered' });
      }
      
      db.prepare(`
        UPDATE users 
        SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ?, githubId = ?, githubUsername = ?
        WHERE loginId = ?
      `).run(newLoginId, name, shopName, address, password, profilePic, req.body.githubId, req.body.githubUsername, currentLoginId);
      
      res.json({ success: true, profile: { name, shopName, address, mobile: newLoginId, profilePic, githubId: req.body.githubId, githubUsername: req.body.githubUsername } });
    } catch (e) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // GitHub OAuth Routes
  app.get('/api/auth/github/url', (req, res) => {
    const redirectUri = `${process.env.APP_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
    });
    const authUrl = `https://github.com/login/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Code is missing');

    try {
      // Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenRes.json() as any;
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      // Get user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'Accept': 'application/json',
          'User-Agent': 'Konika-Medicine-Corner'
        },
      });
      const userData = await userRes.json() as any;

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  provider: 'github',
                  githubId: '${userData.id}',
                  githubUsername: '${userData.login}'
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

  // Catch-all for API routes that don't match
  app.all('/api/*', (req, res) => {
    console.log(`API Route not found: ${req.method} ${req.path}`);
    res.status(404).json({ error: 'API route not found' });
  });

  // Serve static files in production (only if not on Vercel)
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.resolve('dist/index.html'));
      }
    });
  } else if (process.env.NODE_ENV !== 'production') {
    // Vite middleware for development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

export default app;

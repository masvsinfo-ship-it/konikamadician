import express from 'express';
import cors from 'cors';
import path from 'path';
import sqlite3 from 'sqlite3';

// Lazy load Database to avoid issues on environments where it might fail to load
let db: any;

function getDb(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    try {
      const isVercel = !!process.env.VERCEL;
      const dbPath = isVercel 
        ? path.join('/tmp', 'app_data.db') 
        : path.resolve(process.cwd(), 'app_data.db');
        
      const database = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          return resolve(null);
        }
        
        database.serialize(() => {
          database.run(`
            CREATE TABLE IF NOT EXISTS users (
              loginId TEXT PRIMARY KEY,
              password TEXT,
              data TEXT
            )
          `);

          // Add columns if they don't exist
          const columns = ['name', 'shopName', 'address', 'profilePic', 'githubId', 'githubUsername'];
          columns.forEach(col => {
            database.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
              // Ignore error if column already exists
            });
          });
          
          db = database;
          resolve(db);
        });
      });
    } catch (err) {
      console.error('Database initialization failed:', err);
      resolve(null);
    }
  });
}

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', async (req, res) => {
  const database = await getDb();
  res.json({ status: 'ok', db: !!database, env: process.env.NODE_ENV });
});

app.get('/api/ping', (req, res) => {
  res.send('pong');
});

app.post('/api/login', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
  }
  const { loginId, password } = req.body;
  
  database.get('SELECT * FROM users WHERE loginId = ?', [loginId], (err, user: any) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ error: 'Invalid password' });
    
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
});

app.post('/api/register', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
  }
  const { loginId, password, name, shopName, address } = req.body;
  if (!loginId || !password || !name || !shopName || !address) {
    return res.status(400).json({ error: 'Name, Shop Name, Address, Mobile Number and password are required' });
  }
  
  database.run(
    'INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)',
    [loginId, password, name, shopName, address, '{}'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Mobile Number already exists' });
        }
        return res.status(500).json({ error: 'Registration failed' });
      }
      res.json({ success: true, profile: { name, shopName, address, mobile: loginId } });
    }
  );
});

app.post('/api/recover-password', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
  }
  const { loginId, lastTransactionAmount } = req.body;
  
  database.get('SELECT * FROM users WHERE loginId = ?', [loginId], (err, user: any) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    
    const data = JSON.parse(user.data || '{}');
    const transactions = data.transactions || [];
    if (transactions.length === 0) return res.status(400).json({ error: 'কোনো লেনদেন পাওয়া যায়নি' });
    
    const lastTx = transactions[0];
    if (lastTx.amount.toString() === lastTransactionAmount.toString()) {
      res.json({ success: true, password: user.password });
    } else {
      res.status(400).json({ error: 'শেষ লেনদেনের পরিমাণ মেলেনি' });
    }
  });
});

app.post('/api/sync', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
  }
  const { loginId, data } = req.body;
  if (!loginId) return res.status(400).json({ error: 'Login ID is required' });
  
  database.run('UPDATE users SET data = ? WHERE loginId = ?', [JSON.stringify(data), loginId], (err) => {
    if (err) return res.status(500).json({ error: 'Sync failed' });
    res.json({ success: true });
  });
});

app.post('/api/update-profile', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized. Please try again later.' });
  }
  const { currentLoginId, newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername } = req.body;
  
  try {
    database.get('SELECT loginId FROM users WHERE loginId = ?', [newLoginId], (err, exists) => {
      if (currentLoginId !== newLoginId && exists) {
        return res.status(400).json({ error: 'This mobile number is already registered' });
      }
      
      database.run(
        `UPDATE users SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ?, githubId = ?, githubUsername = ? WHERE loginId = ?`,
        [newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername, currentLoginId],
        (err) => {
          if (err) return res.status(500).json({ error: 'Failed to update profile' });
          res.json({ success: true, profile: { name, shopName, address, mobile: newLoginId, profilePic, githubId, githubUsername } });
        }
      );
    });
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

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

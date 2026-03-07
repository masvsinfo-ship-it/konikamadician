import express from 'express';
import cors from 'cors';
import path from 'path';
import sqlite3 from 'sqlite3';
import fs from 'fs';

// Database initialization
let db: any;
let dbError: string | null = null;

function getDb(): Promise<any> {
  return new Promise((resolve) => {
    if (db) return resolve(db);
    
    try {
      const dbPath = path.resolve(process.cwd(), 'app_data.db');
      console.log('Database path:', dbPath);
      
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const database = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Database connection error:', err);
          dbError = err.message;
          return resolve(null);
        }
        
        database.serialize(() => {
          database.run(`
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
          `, (err) => {
            if (err) {
              console.error('Table creation error:', err);
              dbError = err.message;
              return resolve(null);
            }
            db = database;
            dbError = null;
            resolve(db);
          });
        });
      });
    } catch (err: any) {
      console.error('Database initialization failed:', err);
      dbError = err.message;
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

app.post('/api/login', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি। দয়া করে সার্ভার চেক করুন।' });
  }
  
  const { loginId, password } = req.body;
  
  database.get('SELECT * FROM users WHERE loginId = ?', [loginId], (err, user: any) => {
    if (err) return res.status(500).json({ error: 'ডাটাবেস সমস্যা: ' + err.message });
    if (!user) return res.status(404).json({ error: 'এই মোবাইল নাম্বার দিয়ে কোনো একাউন্ট পাওয়া যায়নি' });
    if (user.password !== password) return res.status(401).json({ error: 'ভুল পাসওয়ার্ড' });
    
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
    return res.status(500).json({ error: 'ডাটাবেস কানেকশন পাওয়া যায়নি।' });
  }
  
  const { loginId, password, name, shopName, address } = req.body;
  if (!loginId || !password || !name || !shopName || !address) {
    return res.status(400).json({ error: 'সবগুলো তথ্য প্রদান করা আবশ্যক' });
  }
  
  database.run(
    'INSERT INTO users (loginId, password, name, shopName, address, data) VALUES (?, ?, ?, ?, ?, ?)',
    [loginId, password, name, shopName, address, '{}'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
        }
        return res.status(500).json({ error: 'রেজিস্ট্রেশন করার সময় সমস্যা হয়েছে: ' + err.message });
      }
      res.json({ success: true, profile: { name, shopName, address, mobile: loginId } });
    }
  );
});

app.post('/api/recover-password', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized.' });
  }
  
  const { loginId, lastTransactionAmount } = req.body;
  
  database.get('SELECT * FROM users WHERE loginId = ?', [loginId], (err, user: any) => {
    if (err || !user) return res.status(404).json({ error: 'ইউজার পাওয়া যায়নি' });
    
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
    return res.status(500).json({ error: 'Database is not initialized.' });
  }
  
  const { loginId, data } = req.body;
  if (!loginId) return res.status(400).json({ error: 'Login ID is required' });
  
  database.run('UPDATE users SET data = ? WHERE loginId = ?', [JSON.stringify(data), loginId], (err) => {
    if (err) return res.status(500).json({ error: 'সিঙ্ক করতে সমস্যা হয়েছে: ' + err.message });
    res.json({ success: true });
  });
});

app.post('/api/update-profile', async (req, res) => {
  const database = await getDb();
  if (!database) {
    return res.status(500).json({ error: 'Database is not initialized.' });
  }
  
  const { currentLoginId, newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername } = req.body;
  
  try {
    // Check if new mobile number is already taken by someone else
    if (currentLoginId !== newLoginId) {
      database.get('SELECT loginId FROM users WHERE loginId = ?', [newLoginId], (err, exists) => {
        if (exists) {
          return res.status(400).json({ error: 'এই মোবাইল নাম্বারটি ইতিমধ্যে অন্য কেউ ব্যবহার করছেন' });
        }
        updateProfile();
      });
    } else {
      updateProfile();
    }

    function updateProfile() {
      database.run(`
        UPDATE users 
        SET loginId = ?, name = ?, shopName = ?, address = ?, password = ?, profilePic = ?, githubId = ?, githubUsername = ?
        WHERE loginId = ?
      `, [newLoginId, name, shopName, address, password, profilePic, githubId, githubUsername, currentLoginId], (err) => {
        if (err) return res.status(500).json({ error: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে: ' + err.message });
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
      });
    }
  } catch (err: any) {
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

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;

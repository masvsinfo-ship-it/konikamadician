import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-atlas-amethyst-ball:yHn542J8BAjdBhi6@atlas-amethyst-ball.gmy4acu.mongodb.net/?retryWrites=true&w=majority";

  // Connect to MongoDB
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

  // Define User Schema
  const userSchema = new mongoose.Schema({
    loginId: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: {
      name: String,
      shopName: String,
      address: String,
      mobile: String,
      profilePic: String,
    },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  }, { timestamps: true });

  const User = mongoose.model('User', userSchema);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1, mode: 'full-stack' });
  });

  // Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { loginId, password, profile } = req.body;
      const existingUser = await User.findOne({ loginId });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'এই নাম্বারটি ইতিমধ্যে নিবন্ধিত' });
      }
      const newUser = new User({ loginId, password, profile, data: {} });
      await newUser.save();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { loginId, password } = req.body;
      const user = await User.findOne({ loginId });
      if (!user) return res.status(404).json({ success: false, error: 'ইউজার পাওয়া যায়নি' });
      if (user.password !== password) return res.status(401).json({ success: false, error: 'ভুল পাসওয়ার্ড' });
      
      res.json({ 
        success: true, 
        data: user.data || {}, 
        profile: user.profile 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
    }
  });

  // Sync Data
  app.post('/api/user/sync', async (req, res) => {
    try {
      const { loginId, data } = req.body;
      const user = await User.findOneAndUpdate({ loginId }, { data }, { new: true });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
    }
  });

  // Update Profile
  app.post('/api/user/update-profile', async (req, res) => {
    try {
      const { currentLoginId, profileData } = req.body;
      const user = await User.findOne({ loginId: currentLoginId });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      const newLoginId = profileData.loginId || currentLoginId;
      
      if (newLoginId !== currentLoginId) {
        const existingUser = await User.findOne({ loginId: newLoginId });
        if (existingUser) {
          return res.status(400).json({ success: false, error: 'নতুন নাম্বারটি ইতিমধ্যে ব্যবহৃত হচ্ছে' });
        }
      }

      user.loginId = newLoginId;
      if (profileData.password) user.password = profileData.password;
      if (profileData.profile) {
        user.profile = { ...user.profile, ...profileData.profile };
      }
      
      await user.save();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
    }
  });

  // Recover Password
  app.post('/api/auth/recover', async (req, res) => {
    try {
      const { loginId, lastTransactionAmount } = req.body;
      const user = await User.findOne({ loginId });
      if (!user) return res.status(404).json({ success: false, error: 'ইউজার পাওয়া যায়নি' });
      
      const transactions = user.data.transactions || [];
      if (transactions.length > 0 && transactions[0].amount.toString() === lastTransactionAmount.toString()) {
        return res.json({ success: true, password: user.password });
      }
      res.status(400).json({ success: false, error: 'তথ্য মেলেনি' });
    } catch (error) {
      res.status(500).json({ success: false, error: 'সার্ভার ত্রুটি' });
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
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

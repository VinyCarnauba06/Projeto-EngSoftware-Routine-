require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const USE_FAKE_AUTH = (process.env.USE_FAKE_AUTH || 'true') === 'true';

app.use(express.json());
app.use(cors());

// Initialize Firebase Admin if service account file is present
const serviceAccountPath = path.join(__dirname, 'config', 'serviceAccountKey.json');
if (!USE_FAKE_AUTH) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized.');
  } else {
    console.warn('⚠️ Firebase service account file not found at ./config/serviceAccountKey.json');
    console.warn('Set USE_FAKE_AUTH=true to allow local development without Firebase.');
  }
} else {
  console.log('ℹ️ Running with fake auth enabled (USE_FAKE_AUTH=true).');
}

// MongoDB connection
let db;
let client;
async function connectDB() {
  console.log('🔄 Tentando conectar ao MongoDB...');
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('routineplusdb');
    console.log('✅🔥 CONECTADO ao MongoDB com sucesso!');
  } catch (err) {
    console.error('❌ ERRO CRÍTICO ao conectar ao MongoDB:', err);
    setTimeout(connectDB, 5000);
  }
}
connectDB();

// Auth middleware: verify Firebase ID token, or use fake auth when enabled
async function verifyFirebaseToken(req, res, next) {
  if (USE_FAKE_AUTH) {
    req.user = { uid: 'dev-fake-user', email: 'dev@example.com' };
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Authorization header missing or malformed' });
  const idToken = match[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    return next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Invalid or expired ID token' });
  }
}

// Routes
app.get('/api/weather', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'city required' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY missing' });
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'weather error', detail: err.message });
  }
});

app.get('/api/weather/forecast', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'city required' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY missing' });
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'forecast error', detail: err.message });
  }
});

// Tasks routes - protected by verifyFirebaseToken
app.use('/api/tasks', verifyFirebaseToken);

app.get('/api/tasks', async (req, res) => {
  try {
    if (!db) throw new Error('Database not initialized');
    const tasks = await db.collection('tasks').find({ userId: req.user.uid }).toArray();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'DB error', detail: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  if (!task.title) return res.status(400).json({ error: 'title required' });
  try {
    if (!db) throw new Error('Database not initialized');
    const newTask = {
      ...task,
      userId: req.user.uid,
      createdAt: new Date(),
      isCompleted: false
    };
    const result = await db.collection('tasks').insertOne(newTask);
    res.status(201).json({ message: 'created', task: { _id: result.insertedId, ...newTask } });
  } catch (err) {
    res.status(500).json({ error: 'insert error', detail: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!db) throw new Error('Database not initialized');
    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(id), userId: req.user.uid },
      { $set: { isCompleted: true } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'task not found' });
    res.json({ message: 'completed' });
  } catch (err) {
    res.status(500).json({ error: 'update error', detail: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    if (!db) throw new Error('Database not initialized');
    const result = await db.collection('tasks').deleteOne({ _id: new ObjectId(id), userId: req.user.uid });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'task not found' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'delete error', detail: err.message });
  }
});

// Profile endpoint
app.get('/api/profile', verifyFirebaseToken, async (req, res) => {
  try {
    res.json({ uid: req.user.uid, email: req.user.email });
  } catch (err) {
    res.status(500).json({ error: 'profile error', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Routine+ backend rodando em http://localhost:${PORT}`);
});

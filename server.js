// server.js - Routine+ backend (Node.js + Express) - UPDATED
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const admin = require('firebase-admin');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';

app.use(express.json());

// Firebase admin init (optional in local dev)
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Firebase Admin initialized.');
  } catch (e) {
    console.warn('Firebase Admin init failed:', e.message);
  }
} else {
  console.log('FIREBASE_SERVICE_ACCOUNT_PATH not set — skipping firebase init (dev mode).');
}

// MongoDB
const client = new MongoClient(MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1 }
});
let db;
async function startDb(){
  await client.connect();
  db = client.db('routineplusdb');
  console.log('MongoDB conectado.');
}
startDb().catch(e=>console.error(e));

// Simple authenticate middleware (dev-mode: accepts mock token)
async function authenticate(req, res, next){
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Não autorizado.');
  }
  const idToken = authHeader.split('Bearer ')[1];
  // In production verify with Firebase Admin:
  if (admin.apps.length) {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.user = { uid: decoded.uid };
      return next();
    } catch(e){
      return res.status(401).send('Token inválido.');
    }
  }
  // Dev fallback: accept mock token and extract user id suffix
  if (idToken.startsWith('TEST_TOKEN')) {
    req.user = { uid: 'mock-user-123' };
    return next();
  }
  return res.status(401).send('Token inválido.');
}

// Helper: get coordinates for a city using OpenWeather geocoding
async function geocodeCity(city) {
  if (!API_KEY) throw new Error('OPENWEATHER_API_KEY not set');
  const url = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Geocoding failed');
  const arr = await r.json();
  if (!arr || arr.length === 0) throw new Error('City not found');
  return { lat: arr[0].lat, lon: arr[0].lon, name: arr[0].name, country: arr[0].country };
}

// Weather route (proxy to OpenWeatherMap current weather)
app.get('/api/weather', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'city required' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY not configured' });
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch(e){
    console.error(e);
    res.status(500).json({ error: 'weather proxy error' });
  }
});

// New route: hourly forecast using One Call (requires geocoding)
app.get('/api/weather/forecast', async (req, res) => {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: 'city required' });
  if (!API_KEY) return res.status(500).json({ error: 'OPENWEATHER_API_KEY not configured' });
  try {
    const { lat, lon, name } = await geocodeCity(city);
    // One Call API (v2.5/onecall or 3.0 depending on key). We'll use classic endpoint:
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,current&appid=${API_KEY}&units=metric&lang=pt_br`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    // attach normalized location name
    data.location = { name, lat, lon };
    res.json(data);
  } catch (e) {
    console.error('forecast error', e.message);
    res.status(500).json({ error: 'forecast error', detail: e.message });
  }
});

// Endpoint to register user's FCM token (protected)
app.post('/api/register-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    await db.collection('users').updateOne(
      { userId: req.user.uid },
      { $set: { userId: req.user.uid, fcmToken: token, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('register-token error', e);
    res.status(500).json({ error: 'db error' });
  }
});

// Tasks routes (protected)
app.use('/api/tasks', authenticate);

app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await db.collection('tasks').find({ userId: req.user.uid }).toArray();
    res.json(tasks);
  } catch(e){ res.status(500).json({ error: 'db error' }); }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const doc = req.body;
    if (!doc.title) return res.status(400).json({ error: 'title required' });
    const newDoc = { ...doc, userId: req.user.uid, createdAt: new Date(), isCompleted: false };
    const result = await db.collection('tasks').insertOne(newDoc);
    res.status(201).json({ task: { _id: result.insertedId, ...newDoc } });
  } catch(e){ res.status(500).json({ error: 'db insert error' }); }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body || {};
    const result = await db.collection('tasks').findOneAndUpdate(
      { _id: new ObjectId(id), userId: req.user.uid },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ error: 'not found' });
    res.json({ task: result.value });
  } catch(e){ res.status(500).json({ error: 'db update error' }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.collection('tasks').deleteOne({ _id: new ObjectId(id), userId: req.user.uid });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch(e){ res.status(500).json({ error: 'db delete error' }); }
});

// Scheduler: checks outdoor tasks and uses One Call forecast to decide alerts and send FCM
cron.schedule('*/30 * * * *', async () => {
  console.log('Scheduler running — checking outdoor tasks for weather alerts');
  if (!db || !API_KEY) return;
  try {
    const twoDays = new Date(); twoDays.setDate(twoDays.getDate()+2);
    const tasks = await db.collection('tasks').find({
      category: 'Ao ar livre',
      isCompleted: false,
      date: { $exists: true, $lte: twoDays.toISOString() }
    }).toArray();
    for (const t of tasks) {
      try {
        // determine city for the user (simple: use stored city in task or default)
        const city = t.city || t.location || 'Maceio';
        const { lat, lon } = await geocodeCity(city);
        const r = await fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,current,alerts&appid=${API_KEY}&units=metric&lang=pt_br`);
        const d = await r.json();
        // find hourly forecast that matches the task date (within +-1 hour)
        const taskDate = t.date ? new Date(t.date) : null;
        let important = false;
        if (taskDate && d.hourly) {
          for (const h of d.hourly) {
            const hrDate = new Date(h.dt * 1000);
            const diff = Math.abs(hrDate - taskDate);
            if (diff <= 1000 * 60 * 60) { // within 1 hour
              const main = (h.weather?.[0]?.main || '').toLowerCase();
              if (main.includes('rain') || main.includes('storm') || h.pop > 0.4) {
                important = true;
                break;
              }
            }
          }
        } else if (d.daily) {
          // fallback: check daily for rain flag
          for (const day of d.daily) {
            const dayDate = new Date(day.dt * 1000);
            if (taskDate && Math.abs(dayDate - taskDate) <= 1000*60*60*24) {
              if (day.pop > 0.4 || (day.weather?.[0]?.main || '').toLowerCase().includes('rain')) {
                important = true;
              }
            }
          }
        }

        if (important) {
          // get user's fcm token
          const userDoc = await db.collection('users').findOne({ userId: t.userId });
          const token = userDoc?.fcmToken;
          if (token && admin.apps.length) {
            const message = {
              token,
              notification: {
                title: `Alerta: Pode chover em "${t.title}"`,
                body: `Verificamos possibilidade de chuva na data agendada (${t.date || 'sem data'}) — confira a previsão.`
              },
              data: {
                taskId: String(t._id),
                type: 'weather_alert'
              }
            };
            try {
              const resp = await admin.messaging().send(message);
              console.log('FCM sent:', resp);
            } catch (sendErr) {
              console.error('FCM send error', sendErr);
            }
          } else {
            console.log(`ALERT (no token/firebase) for task "${t.title}" user ${t.userId}`);
          }
        }
      } catch(innerErr){
        console.error('task processing error', innerErr.message);
      }
    }
  } catch(e){ console.error('scheduler error', e); }
});

app.listen(PORT, () => console.log(`Routine+ backend running on ${PORT}`));

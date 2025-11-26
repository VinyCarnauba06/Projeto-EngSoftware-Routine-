require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const MONGO_URI = process.env.MONGO_URI;
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

app.use(express.json());
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

let db;
let client;

 
async function connectDB() {
    console.log("🔄 Tentando conectar ao MongoDB...");

    try {
        client = new MongoClient(MONGO_URI, { 
            useUnifiedTopology: true 
        });

        await client.connect();

        db = client.db("routineplusdb");

        console.log("✅🔥 CONECTADO ao MongoDB com sucesso!");
    } catch (err) {
        console.error("❌ ERRO CRÍTICO ao conectar ao MongoDB:");
        console.error(err);

        
        setTimeout(connectDB, 5000);  
        console.log("⏳ Tentando conectar novamente em 5s...");
    }
}

connectDB();


function fakeAuth(req, res, next) {
    req.user = { uid: "mock-user-123" };
    next();
}

app.use('/api/tasks', fakeAuth);


app.get('/api/weather', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "city required" });

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
        const r = await fetch(url);
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "weather error", detail: err.message });
    }
});


app.get('/api/weather/forecast', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "city required" });

    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
        const r = await fetch(url);
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "forecast error", detail: err.message });
    }
});


app.get('/api/tasks', async (req, res) => {
    try {
        if (!db) throw new Error("Database not initialized");

        const tasks = await db
            .collection("tasks")
            .find({ userId: req.user.uid, isCompleted: false }) 
            .toArray();

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "DB error", detail: err.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    const task = req.body;

    if (!task.title)
        return res.status(400).json({ error: "title required" });

    try {
        if (!db) throw new Error("Database not initialized");

        const newTask = {
            ...task,
            userId: req.user.uid,
            createdAt: new Date(),
            isCompleted: false
        };

        const result = await db.collection("tasks").insertOne(newTask);

        res.status(201).json({
            message: "created",
            task: { _id: result.insertedId, ...newTask }
        });

    } catch (err) {
        res.status(500).json({ error: "insert error", detail: err.message });
    }
});

app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
        if (!db) throw new Error("Database not initialized");

        const result = await db.collection("tasks").updateOne(
            { _id: new ObjectId(id), userId: req.user.uid },
            { $set: { isCompleted: true } }
        );

        if (result.matchedCount === 0)
            return res.status(404).json({ error: "task not found" });

        res.json({ message: "completed" });

    } catch (err) {
        res.status(500).json({ error: "update error", detail: err.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
        if (!db) throw new Error("Database not initialized");

        const result = await db.collection("tasks").deleteOne({
            _id: new ObjectId(id),
            userId: req.user.uid
        });

        if (result.deletedCount === 0)
            return res.status(404).json({ error: "task not found" });

        res.status(204).send();

    } catch (err) {
        res.status(500).json({ error: "delete error", detail: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 Routine+ backend rodando em http://localhost:${PORT}`);
});
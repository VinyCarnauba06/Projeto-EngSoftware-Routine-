// server.js — Routine+ backend corrigido

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// ---------------------------
// MIDDLEWARES
// ---------------------------
app.use(express.json());
app.use(cors()); // ESSENCIAL PARA FUNCIONAR NO FRONTEND
console.log("✔️ CORS habilitado");

// ---------------------------
// MONGO DB
// ---------------------------
let db;

async function connectDB() {
    try {
        const client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db("routineplusdb");
        console.log("✔️ MongoDB conectado");
    } catch (err) {
        console.error("❌ Erro ao conectar MongoDB:", err);
    }
}
connectDB();

// ---------------------------
// AUTENTICAÇÃO (DESATIVADA - MODO DEV)
// ---------------------------
function fakeAuth(req, res, next) {
    req.user = { uid: "mock-user-123" }; // simula usuário
    next();
}
app.use('/api/tasks', fakeAuth);

// ---------------------------
// ROTAS DE CLIMA
// ---------------------------

// 🔹 Clima atual (funciona com chave gratuita)
app.get('/api/weather', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "city required" });
    if (!API_KEY) return res.status(500).json({ error: "OPENWEATHER_API_KEY missing" });

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

// 🔹 Previsão (usando `/forecast`, funciona com chave grátis)
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

// ---------------------------
// ROTAS DE TAREFAS (CRUD)
// ---------------------------

// listar tarefas
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await db.collection("tasks")
            .find({ userId: req.user.uid })
            .toArray();

        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: "DB error", detail: err.message });
    }
});

// criar tarefa
app.post('/api/tasks', async (req, res) => {
    const task = req.body;

    if (!task.title)
        return res.status(400).json({ error: "title required" });

    try {
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

// atualizar tarefa (concluir)
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
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

// excluir tarefa
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;

    try {
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

// ---------------------------
// INICIAR SERVIDOR
// ---------------------------
app.listen(PORT, () => {
    console.log(`🚀 Routine+ backend rodando em http://localhost:${PORT}`);
});

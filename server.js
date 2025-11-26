require('dotenv').config();

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Chave Secreta do JWT (DEVE ser configurada no Render)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key'; 

app.use(express.json());

// Configuração CORS explícita
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

// ======================================================
//  MIDDLEWARE DE AUTENTICAÇÃO JWT
// ======================================================

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { uid: decoded.userId };
        next();
    } catch (ex) {
        res.status(400).json({ error: "Invalid token." });
    }
}

// ======================================================
//  ROTAS DE AUTENTICAÇÃO (REGISTER / LOGIN)
// ======================================================

app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        if (!db) throw new Error("Database not initialized");

        const usersCollection = db.collection("users");
        
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already registered." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = { email, password: hashedPassword, createdAt: new Date() };
        const result = await usersCollection.insertOne(newUser);
        
        const token = jwt.sign({ userId: result.insertedId }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ 
            message: "User registered successfully.",
            token,
            userId: result.insertedId
        });

    } catch (err) {
        console.error("DB error during registration:", err);
        res.status(500).json({ error: "Server error during registration.", detail: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
    }

    try {
        if (!db) throw new Error("Database not initialized");

        const usersCollection = db.collection("users");
        
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: "Login successful.",
            token,
            userId: user._id
        });

    } catch (err) {
        console.error("DB error during login:", err);
        res.status(500).json({ error: "Server error during login.", detail: err.message });
    }
});


// ======================================================
//  ROTAS PROTEGIDAS (APLICA O MIDDLEWARE)
// ======================================================

app.use('/api/tasks', authMiddleware);


// ======================================================
//  ROTAS DE CLIMA (NÃO PROTEGIDAS)
// ======================================================

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

// ======================================================
//  CRUD DE TAREFAS (AGORA PROTEGIDO)
// ======================================================
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
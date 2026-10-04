const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Indiquer à Express où trouver les fichiers CSS/images
app.use(express.static(path.join(__dirname, 'public')));

// Configuration des vues HTML
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.use(
    session({
        secret: process.env.SESSION_SECRET || "tiitii_super_secret_key_999",
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
    })
);

// Capture des logs en direct pour le Dashboard
const liveLogs = [];
const originalConsoleLog = console.log;
console.log = function (...args) {
    const timestamp = new Date().toLocaleTimeString();
    liveLogs.push(`[${timestamp}] ` + args.join(" "));
    if (liveLogs.length > 100) liveLogs.shift();
    originalConsoleLog.apply(console, args);
};

function startDashboard(client) {
    app.locals.client = client;
    app.locals.liveLogs = liveLogs;

    // Charger les routes web principales (/)
    const webRoutes = require("./routes/web");
    app.use("/", webRoutes);

    // 🚀 Charger et brancher les routes d'authentification (/auth/discord, etc.)
    const authRoutes = require("./routes/auth");
    app.use("/auth", authRoutes);

    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web sécurisé actif sur le port ${PORT}`);
    });
}

module.exports = { startDashboard };

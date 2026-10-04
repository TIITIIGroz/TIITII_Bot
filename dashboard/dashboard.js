const express = require("express");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
    // Rendre le client accessible dans les routes
    app.locals.client = client;
    app.locals.liveLogs = liveLogs;

    // Charger les routes web
    const webRoutes = require("./routes/web");
    app.use("/", webRoutes);

    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web sécurisé actif sur le port ${PORT}`);
    });
}

module.exports = { startDashboard };

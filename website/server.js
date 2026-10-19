const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const Confession = require('../models/Confession'); // Modèle MongoDB
const supabase = require('../supabase'); // Client Supabase

const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

function setupDashboard(client) {
    const app = express();

    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // 🖼️ Service des fichiers statiques (pour accéder à /images/Bannière.jpg)
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/public', express.static(path.join(__dirname, 'public')));

    const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const callbackUrl = process.env.DISCORD_CALLBACK_URL || process.env.CALLBACK_URL;

    if (!clientId || !clientSecret) {
        console.warn("⚠️ Attention : CLIENT_ID ou CLIENT_SECRET est introuvable. Le Dashboard OAuth2 est désactivé.");
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🌐 Serveur Web démarré sur le port ${PORT} (Mode secours sans OAuth2)`);
        });
        return;
    }

    // Configuration des sessions (7 jours)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'titiipasswordsecret_ultra_securise',
        resave: false,
        saveUninitialized: false,
        cookie: { 
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(new DiscordStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        scope: ['identify', 'guilds', 'guilds.members.read']
    }, async (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));

    // 🌐 Page d'accueil publique avec fond d'écran
    app.get('/', (req, res) => {
        const user = req.user || null;
        res.send(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>𝑻𝑰𝑰𝑻𝑰𝑰_𝑩𝒐𝒕 - Accueil</title>
                <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                <style>
                    body {
                        background: linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url('/images/Bannière.jpg') no-repeat center center fixed;
                        background-size: cover;
                    }
                </style>
            </head>
            <body class="text-white font-sans flex items-center justify-center h-screen">
                <div class="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl border border-slate-700/80 shadow-2xl text-center max-w-md w-full">
                    <h1 class="text-3xl font-extrabold text-indigo-400 mb-2">𝑻𝑰𝑰𝑻𝑰𝑰_𝑩𝒐𝒕</h1>
                    <p class="text-slate-300 text-sm mb-6">Panneau de contrôle et administration du bot Discord.</p>
                    
                    ${user ? `
                        <div class="mb-6 p-3 bg-slate-950/80 rounded-xl border border-slate-700/80 flex items-center justify-center gap-3">
                            <p class="text-sm">Connecté en tant que <span class="font-bold text-emerald-400">${user.username}</span></p>
                        </div>
                        <a href="/dashboard" class="w-full block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg mb-3">
                            Accéder au Dashboard 🚀
                        </a>
                        <a href="/logout" class="text-xs text-slate-400 hover:text-red-400 transition">Se déconnecter</a>
                    ` : `
                        <a href="/auth/discord" class="w-full block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg">
                            Connexion Administrateur (Discord) 🔑
                        </a>
                    `}
                </div>
            </body>
            </html>
        `);
    });

    // Route de connexion Discord
    app.get('/auth/discord', passport.authenticate('discord'));

    // Callback de retour OAuth2
    app.get('/auth/discord/callback', 
        passport.authenticate('discord', { failureRedirect: '/auth/unauthorized' }),
        async (req, res) => {
            const guildId = process.env.DISCORD_GUILD_ID;
            
            if (guildId) {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    const member = await guild.members.fetch(req.user.id).catch(() => null);
                    if (member) {
                        const isUserAdmin = ADMIN_USER_IDS.includes(req.user.id);
                        const isRoleAdmin = member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));
                        if (!isUserAdmin && !isRoleAdmin) {
                            return res.redirect('/auth/unauthorized');
                        }
                        return res.redirect('/dashboard');
                    }
                }
            }

            if (!ADMIN_USER_IDS.includes(req.user.id)) {
                return res.redirect('/auth/unauthorized');
            }

            res.redirect('/dashboard');
        }
    );

    // Middleware de sécurité
    async function checkAdminAuth(req, res, next) {
        if (!req.isAuthenticated()) return res.redirect('/auth/discord');
        
        const guildId = process.env.DISCORD_GUILD_ID;
        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const member = await guild.members.fetch(req.user.id).catch(() => null);
                if (member) {
                    const isUserAdmin = ADMIN_USER_IDS.includes(req.user.id);
                    const isRoleAdmin = member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));
                    if (isUserAdmin || isRoleAdmin) return next();
                    return res.redirect('/auth/unauthorized');
                }
            }
        }

        if (ADMIN_USER_IDS.includes(req.user.id)) return next();

        return res.redirect('/auth/unauthorized');
    }

    // 📊 Page du Dashboard Admin avec fond d'écran
    app.get('/dashboard', checkAdminAuth, async (req, res) => {
        try {
            const uptime = process.uptime();
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

            

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const Confession = require('../models/Confession'); // Modèle MongoDB

const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

function setupDashboard(client) {
    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Utilise tes noms de variables Render : CLIENT_ID, CLIENT_SECRET, CALLBACK_URL
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const callbackUrl = process.env.DISCORD_CALLBACK_URL || process.env.CALLBACK_URL;

    // Protection anti-crash si les variables sont manquantes
    if (!clientId || !clientSecret) {
        console.warn("⚠️ Attention : CLIENT_ID ou CLIENT_SECRET est introuvable. Le Dashboard OAuth2 est désactivé.");
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🌐 Serveur Web démarré sur le port ${PORT} (Mode secours sans OAuth2)`);
        });
        return;
    }

    // Configuration des sessions
    app.use(session({
        secret: process.env.SESSION_SECRET || 'titiipasswordsecret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    // Configuration Discord OAuth2
    passport.use(new DiscordStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        scope: ['identify', 'guilds', 'guilds.members.read']
    }, async (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));

    // Routes de connexion
    app.get('/auth/discord', passport.authenticate('discord'));

    app.get('/auth/discord/callback', 
        passport.authenticate('discord', { failureRedirect: '/' }),
        async (req, res) => {
            const guildId = process.env.DISCORD_GUILD_ID;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.redirect('/auth/error');

            const member = await guild.members.fetch(req.user.id).catch(() => null);
            if (!member) return res.redirect('/auth/unauthorized');

            const isUserAdmin = ADMIN_USER_IDS.includes(req.user.id);
            const isRoleAdmin = member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));

            if (!isUserAdmin && !isRoleAdmin) {
                return res.redirect('/auth/unauthorized');
            }

            res.redirect('/dashboard');
        }
    );

    // Middleware de sécurité
    async function checkAdminAuth(req, res, next) {
        if (!req.isAuthenticated()) return res.redirect('/auth/discord');
        
        const guildId = process.env.DISCORD_GUILD_ID;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.redirect('/auth/discord');

        const member = await guild.members.fetch(req.user.id).catch(() => null);
        if (!member) return res.redirect('/auth/discord');

        const isUserAdmin = ADMIN_USER_IDS.includes(req.user.id);
        const isRoleAdmin = member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));

        if (!isUserAdmin && !isRoleAdmin) return res.redirect('/auth/discord');

        next();
    }

    // Page du Dashboard
    app.get('/dashboard', checkAdminAuth, async (req, res) => {
        try {
            const uptime = process.uptime();
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
            const confessions = await Confession.find().sort({ _id: -1 }).limit(15);
            const supabaseData = [];

            res.render('dashboard', {
                user: req.user,
                stats: {
                    uptime: Math.floor(uptime / 60),
                    totalMembers,
                    ping: client.ws.ping
                },
                confessions,
                supabaseData
            });
        } catch (err) {
            console.error("Erreur Dashboard:", err);
            res.status(500).send("Erreur interne du serveur.");
        }
    });

    app.get('/auth/unauthorized', (req, res) => {
        res.send("❌ Accès refusé : Réservé aux administrateurs du bot.");
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web démarré sur le port ${PORT}`);
    });
}

module.exports = setupDashboard;

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const Confession = require('../models/Confession'); // Modèle MongoDB

// Tu peux importer ton client Supabase ou ton module d'accès Supabase ici :
// const supabase = require('../path-to-your-supabase-client');

const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

function setupDashboard(client) {
    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Configuration des sessions persistantes
    app.use(session({
        secret: process.env.SESSION_SECRET || 'titiipasswordsecret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // Mettre à true si HTTPS strict sur Render
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    // Configuration Discord OAuth2
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL, // ex: https://ton-bot.onrender.com/auth/discord/callback
        scope: ['identify', 'guilds', 'guilds.members.read']
    }, async (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));

    // Route de connexion
    app.get('/auth/discord', passport.authenticate('discord'));

    // Callback OAuth2
    app.get('/auth/discord/callback', 
        passport.authenticate('discord', { failureRedirect: '/' }),
        async (req, res) => {
            // Vérification Admin au login
            const guildId = process.env.DISCORD_GUILD_ID; // ID de ton serveur principal
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

    // Middleware de protection des routes admin
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

    // Page du Tableau de Bord (Dashboard)
    app.get('/dashboard', checkAdminAuth, async (req, res) => {
        try {
            // 1. Infos Bot & Serveur (MongoDB / Client Discord)
            const uptime = process.uptime(); // en secondes
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
            
            // 2. Récupération des Confessions (MongoDB - Idée 3)
            const confessions = await Confession.find().sort({ _id: -1 }).limit(15);

            // 3. Récupération des données Supabase (Idée 1 & 5 - ex: niveaux / XP / logs)
            // Exemple avec Supabase (adapte selon ta table) :
            // const { data: supabaseData } = await supabase.from('levels').select('*').order('xp', { ascending: false }).limit(10);
            const supabaseData = []; // Remplace par tes données Supabase

            res.render('dashboard', {
                user: req.user,
                stats: {
                    uptime: Math.floor(uptime / 60), // en minutes
                    totalMembers,
                    ping: client.ws.ping
                },
                confessions,
                supabaseData // Données Supabase transmises à la vue
            });
        } catch (err) {
            console.error("Erreur Dashboard:", err);
            res.status(500).send("Erreur interne du serveur.");
        }
    });

    // Page d'erreur / non autorisé
    app.get('/auth/unauthorized', (req, res) => {
        res.send("❌ Accès refusé : Réservé aux administrateurs du bot.");
    });

    // Lancement du serveur web sur le port fourni par Render (process.env.PORT) ou 3000
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web démarré sur le port ${PORT}`);
    });
}

module.exports = setupDashboard;

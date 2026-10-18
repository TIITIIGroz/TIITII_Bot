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

    // Détection souple des variables d'environnement (avec ou sans préfixe DISCORD_)
    const clientId = process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const callbackUrl = process.env.DISCORD_CALLBACK_URL || process.env.CALLBACK_URL;

    // Protection anti-crash si les variables sont introuvables
    if (!clientId || !clientSecret) {
        console.warn("⚠️ Attention : CLIENT_ID ou CLIENT_SECRET est introuvable. Le Dashboard OAuth2 est désactivé.");
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🌐 Serveur Web démarré sur le port ${PORT} (Mode secours sans OAuth2)`);
        });
        return;
    }

    // Configuration des sessions (pour ne pas se déconnecter lors d'un refresh/F5)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'titiipasswordsecret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // Mettre à true si HTTPS strict imposé
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    // Configuration de la stratégie Discord OAuth2
    passport.use(new DiscordStrategy({
        clientID: clientId,
        clientSecret: clientSecret,
        callbackURL: callbackUrl,
        scope: ['identify', 'guilds', 'guilds.members.read']
    }, async (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }));

    // Route racine (Redirige vers le dashboard s'il est authentifié, sinon vers le login)
    app.get('/', (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.redirect('/auth/discord');
    });

    // Route de connexion Discord
    app.get('/auth/discord', passport.authenticate('discord'));

    // Callback de retour OAuth2
    app.get('/auth/discord/callback', 
        passport.authenticate('discord', { failureRedirect: '/auth/unauthorized' }),
        async (req, res) => {
            const guildId = process.env.DISCORD_GUILD_ID;
            
            // Si pas de GUILD_ID configuré, vérifie simplement si l'ID utilisateur est dans la liste des admins
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

            // Vérification de secours uniquement sur l'ID utilisateur
            if (!ADMIN_USER_IDS.includes(req.user.id)) {
                return res.redirect('/auth/unauthorized');
            }

            res.redirect('/dashboard');
        }
    );

    // Middleware de sécurité pour protéger la page /dashboard
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

    // Page du Dashboard Admin (Vue d'ensemble, MongoDB & Supabase)
    app.get('/dashboard', checkAdminAuth, async (req, res) => {
        try {
            const uptime = process.uptime(); // temps de fonctionnement en secondes
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

            // Récupération des 15 dernières confessions depuis MongoDB
            let confessions = [];
            try {
                confessions = await Confession.find().sort({ _id: -1 }).limit(15);
            } catch (mongoErr) {
                console.error("Erreur lecture MongoDB dans Dashboard :", mongoErr);
            }

            // Récupération des données Supabase (remplace par ton appel Supabase souhaité)
            const supabaseData = [];

            res.render('dashboard', {
                user: req.user,
                stats: {
                    uptime: Math.floor(uptime / 60), // Conversion en minutes
                    totalMembers,
                    ping: client.ws.ping
                },
                confessions,
                supabaseData
            });
        } catch (err) {
            console.error("Erreur lors du rendu du Dashboard :", err);
            res.status(500).send("Erreur interne du serveur lors du chargement du Dashboard.");
        }
    });

    // Page de déconnexion
    app.get('/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    // Page en cas d'accès non autorisé
    app.get('/auth/unauthorized', (req, res) => {
        res.status(403).send("❌ Accès refusé : Réservé exclusivement aux administrateurs de 𝑻𝑰𝑰𝑻𝑰𝑰_𝑩𝒐𝒕.");
    });

    // Lancement de l'écoute HTTP sur le port Render
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web démarré avec succès sur le port ${PORT}`);
    });
}

module.exports = setupDashboard;

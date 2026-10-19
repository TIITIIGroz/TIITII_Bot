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
                <div class="bg-slate-900/85 backdrop-blur-md p-8 rounded-2xl border border-slate-700/80 shadow-2xl text-center max-w-md w-full">
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

    // 📊 Page du Dashboard Admin avec fond d'écran et vrai bouton de déconnexion
    app.get('/dashboard', checkAdminAuth, async (req, res) => {
        try {
            const uptime = process.uptime();
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

            // 1. Confessions (MongoDB)
            let confessions = [];
            try {
                confessions = await Confession.find().sort({ _id: -1 }).limit(15);
            } catch (mongoErr) {
                console.error("Erreur lecture MongoDB dans Dashboard :", mongoErr);
            }

            // 2. Niveaux (Supabase)
            let supabaseLevels = [];
            try {
                const { data, error } = await supabase.from('levels').select('*').limit(15);
                if (!error && data) {
                    supabaseLevels = data;
                } else {
                    console.warn("Supabase warning/error:", error);
                }
            } catch (supErr) {
                console.error("Erreur lecture Supabase dans Dashboard :", supErr);
            }

            const user = req.user;
            const avatarUrl = user.avatar 
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` 
                : 'https://cdn.discordapp.com/embed/avatars/0.png';

            // Lignes du tableau des confessions (MongoDB)
            let confessionsRows = '';
            if (confessions.length > 0) {
                confessions.forEach(conf => {
                    confessionsRows += `
                        <tr class="border-b border-slate-700/50 text-sm hover:bg-slate-800/60 transition">
                            <td class="py-3 px-2 font-mono text-indigo-400 font-semibold">${conf.code || '#'}</td>
                            <td class="py-3 px-2 text-slate-200">${conf.content || 'Fichier/Média joint'}</td>
                            <td class="py-3 px-2 text-right">
                                <form action="/dashboard/confession/delete/${conf._id}" method="POST" onsubmit="return confirm('Voulez-vous vraiment supprimer cette confession ?');">
                                    <button type="submit" class="bg-red-600/90 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold transition cursor-pointer">Supprimer</button>
                                </form>
                            </td>
                        </tr>
                    `;
                });
            } else {
                confessionsRows = `
                    <tr>
                        <td colspan="3" class="py-4 text-center text-slate-400 text-sm">Aucune confession enregistrée pour le moment.</td>
                    </tr>
                `;
            }

            // Lignes du tableau des niveaux (Supabase)
            let supabaseRows = '';
            if (supabaseLevels.length > 0) {
                supabaseLevels.forEach(row => {
                    const userId = row.user_id || row.userid || row.id || 'Inconnu';
                    const xp = row.xp || row.points || 0;
                    const level = row.level || row.lvl || 0;

                    supabaseRows += `
                        <tr class="border-b border-slate-700/50 text-sm hover:bg-slate-800/60 transition">
                            <td class="py-3 px-2 font-mono text-emerald-400">${userId}</td>
                            <td class="py-3 px-2 text-slate-200">Niveau ${level} (${xp} XP)</td>
                            <td class="py-3 px-2 text-right">
                                <form action="/dashboard/supabase/delete/${userId}" method="POST" onsubmit="return confirm('Voulez-vous vraiment supprimer cet utilisateur de Supabase ?');">
                                    <button type="submit" class="bg-red-600/90 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold transition cursor-pointer">Supprimer / Reset</button>
                                </form>
                            </td>
                        </tr>
                    `;
                });
            } else {
                supabaseRows = `
                    <tr>
                        <td colspan="3" class="py-4 text-center text-slate-400 text-sm">Aucune donnée de niveau trouvée dans Supabase (Vérifie si la table s'appelle bien 'levels').</td>
                    </tr>
                `;
            }

            res.send(`
                <!DOCTYPE html>
                <html lang="fr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>𝑻𝑰𝑰𝑻𝑰𝑰_𝑩𝒐𝒕 - Dashboard Admin</title>
                    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
                    <style>
                        body {
                            background: linear-gradient(rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.88)), url('/images/Bannière.jpg') no-repeat center center fixed;
                            background-size: cover;
                        }
                    </style>
                </head>
                <body class="text-white font-sans min-h-screen">
                    <div class="flex h-screen overflow-hidden">
                        <!-- Sidebar -->
                        <div class="w-64 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col justify-between border-r border-slate-800/80 shrink-0">
                            <div>
                                <h1 class="text-xl font-bold text-indigo-400 mb-8">𝑻𝑰𝑰𝑻𝑰𝑰_𝑩𝒐𝒕 Panel</h1>
                                <nav class="space-y-3">
                                    <a href="#overview" class="block py-2.5 px-4 rounded bg-indigo-600/90 text-white font-medium hover:bg-indigo-500 transition shadow">📊 Vue d'ensemble</a>
                                    <a href="#confessions" class="block py-2.5 px-4 rounded hover:bg-slate-800/80 text-slate-300 transition">🔓 Confessions (MongoDB)</a>
                                    <a href="#supabase" class="block py-2.5 px-4 rounded hover:bg-slate-800/80 text-slate-300 transition">📈 Niveaux (Supabase)</a>
                                </nav>
                            </div>

                            <!-- Profil & Vrai Bouton de Déconnexion -->
                            <div class="border-t border-slate-800/80 pt-4 space-y-3">
                                <div class="flex items-center gap-3">
                                    <img src="${avatarUrl}" class="w-10 h-10 rounded-full border border-slate-700">
                                    <div class="overflow-hidden">
                                        <p class="font-semibold text-sm leading-tight truncate">${user.username}</p>
                                        <p class="text-xs text-emerald-400 font-medium">Connecté</p>
                                    </div>
                                </div>
                                <a href="/logout" class="w-full flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold py-2 px-3 rounded-lg transition shadow">
                                    <span>🚪</span> Se déconnecter
                                </a>
                            </div>
                        </div>

                        <!-- Contenu principal -->
                        <div class="flex-1 p-8 overflow-y-auto">
                            <h2 class="text-3xl font-bold mb-6 text-slate-100">Tableau de bord administrateur</h2>

                            <!-- Section 1 : Stats du Bot -->
                            <div id="overview" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div class="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80 shadow-xl">
                                    <p class="text-slate-400 text-sm font-medium">Uptime du Bot</p>
                                    <p class="text-3xl font-bold mt-2 text-indigo-400">${Math.floor(uptime / 60)} min</p>
                                </div>
                                <div class="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80 shadow-xl">
                                    <p class="text-slate-400 text-sm font-medium">Membres totaux</p>
                                    <p class="text-3xl font-bold mt-2 text-emerald-400">${totalMembers}</p>
                                </div>
                                <div class="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80 shadow-xl">
                                    <p class="text-slate-400 text-sm font-medium">Latence API (Ping)</p>
                                    <p class="text-3xl font-bold mt-2 text-amber-400">${client.ws.ping} ms</p>
                                </div>
                            </div>

                            <!-- Section 2 : Confessions MongoDB -->
                            <div id="confessions" class="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80 shadow-xl mb-10">
                                <h3 class="text-xl font-bold mb-4 text-indigo-300 flex items-center gap-2">
                                    <span>🔓</span> Dernières Confessions (MongoDB)
                                </h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left border-collapse">
                                        <thead>
                                            <tr class="border-b border-slate-700 text-slate-400 text-sm">
                                                <th class="pb-3 px-2">Code</th>
                                                <th class="pb-3 px-2">Contenu</th>
                                                <th class="pb-3 px-2 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${confessionsRows}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <!-- Section 3 : Suivi Supabase -->
                            <div id="supabase" class="bg-slate-900/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/80 shadow-xl mb-10">
                                <h3 class="text-xl font-bold mb-4 text-emerald-300 flex items-center gap-2">
                                    <span>📈</span> Suivi Supabase (Niveaux & Activité)
                                </h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left border-collapse">
                                        <thead>
                                            <tr class="border-b border-slate-700 text-slate-400 text-sm">
                                                <th class="pb-3 px-2">ID Utilisateur</th>
                                                <th class="pb-3 px-2">Progression</th>
                                                <th class="pb-3 px-2 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${supabaseRows}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `);
        } catch (err) {
            console.error("Erreur lors du rendu du Dashboard :", err);
            res.status(500).send("Erreur interne du serveur lors du chargement du Dashboard.");
        }
    });

    // 🗑️ Route suppression MongoDB
    app.post('/dashboard/confession/delete/:id', checkAdminAuth, async (req, res) => {
        try {
            const confessionId = req.params.id;
            await Confession.findByIdAndDelete(confessionId);
            res.redirect('/dashboard');
        } catch (err) {
            console.error("Erreur suppression confession :", err);
            res.status(500).send("Erreur lors de la suppression de la confession.");
        }
    });

    // 🗑️ Route suppression Supabase
    app.post('/dashboard/supabase/delete/:userId', checkAdminAuth, async (req, res) => {
        try {
            const userId = req.params.userId;
            await supabase.from('levels').delete().eq('user_id', userId);
            await supabase.from('levels').delete().eq('userid', userId);
            await supabase.from('levels').delete().eq('id', userId);
            res.redirect('/dashboard');
        } catch (err) {
            console.error("Erreur suppression Supabase :", err);
            res.status(500).send("Erreur lors de la suppression dans Supabase.");
        }
    });

    app.get('/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

const express = require("express");
const router = express.Router();
const { ChannelType, EmbedBuilder } = require("discord.js");

// 🛡 Listes des administrateurs
const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

function hasAdminPermission(member) {
    if (!member) return false;
    const isSpecialUser = ADMIN_USER_IDS.includes(member.id);
    const hasAdminRole = ADMIN_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    return isSpecialUser || hasAdminRole;
}

function checkAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
}

// Page d'accueil / Connexion
router.get('/', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/dashboard');
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>TIITII_Bot - Connexion</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body class="login-body">
            <div class="login-card">
                <h1>🤖 TIITII_Bot Dashboard</h1>
                <p>Accès restreint aux administrateurs du serveur.</p>
                <a href="/auth/discord" class="btn-discord">Se connecter avec Discord</a>
            </div>
        </body>
        </html>
    `);
});

router.get('/login', (req, res) => {
    res.redirect('/');
});

// Authentification Discord OAuth2
router.get('/auth/discord', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback');
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify guilds.members.read`);
});

router.get('/auth/discord/callback', async (req, res) => {
    const client = req.app.locals.client;
    const code = req.query.code;
    if (!code) return res.redirect('/?error=no_code');

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const oauthData = await tokenResponse.json();
        if (!oauthData.access_token) return res.redirect('/?error=bad_token');

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${oauthData.access_token}` },
        });
        const user = await userResponse.json();

        let isAdmin = ADMIN_USER_IDS.includes(user.id);
        if (!isAdmin && client.guilds.cache.size > 0) {
            const guild = client.guilds.cache.first();
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member && hasAdminPermission(member)) {
                isAdmin = true;
            }
        }

        if (isAdmin) {
            req.session.isAdmin = true;
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.send(`<!DOCTYPE html><html><head><link rel="stylesheet" href="/style.css"></head><body class="login-body"><div class="login-card"><h1>❌ Accès refusé</h1><p>Tu n'es pas administrateur de ce bot.</p><a href="/" style="color:#57F287;">Retour</a></div></body></html>`);
        }
    } catch (err) {
        console.error("Erreur OAuth2:", err);
        res.redirect('/?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Dashboard Admin
router.get('/dashboard', checkAuth, async (req, res) => {
    const client = req.app.locals.client;
    const guild = client.guilds.cache.first();
    const memberCount = guild ? guild.memberCount : 0;
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    let channelsHtml = '';
    if (guild) {
        guild.channels.cache.forEach(c => {
            if (c.type === ChannelType.GuildText) {
                channelsHtml += `<option value="${c.id}">#${c.name}</option>`;
            }
        });
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>TIITII_Bot - Dashboard Admin</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body>
            <div class="container">
                <header>
                    <h1>🤖 Panneau d'Administration - TIITII_Bot</h1>
                    <div>
                        <span style="margin-right: 15px;">Connecté en tant que <strong>${req.session.user.username}</strong></span>
                        <a href="/logout" class="btn-logout">Déconnexion</a>
                    </div>
                </header>

                <div class="grid">
                    <div class="card">
                        <h2>📊 Stats Serveur</h2>
                        <p>Membres : <strong>${memberCount}</strong></p>
                        <p>Statut du Bot : <strong style="color: #57F287;">En ligne 🟢</strong></p>
                        <p>Uptime : <strong>${hours}h${minutes}m</strong></p>
                    </div>
                    <div class="card">
                        <h2>📢 Envoyer une Annonce</h2>
                        <form action="/api/announcement" method="POST">
                            <select name="channelId">${channelsHtml}</select>
                            <input type="text" name="title" placeholder="Titre de l'annonce..." required>
                            <textarea name="message" placeholder="Contenu du message..." rows="3" required></textarea>
                            <button type="submit">Envoyer sur Discord</button>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <h2>🖥️ Terminal de Logs en Direct</h2>
                    <div class="terminal" id="terminalBox">Chargement des logs...</div>
                </div>
            </div>

            <script>
                setInterval(async () => {
                    const res = await fetch('/api/logs');
                    const logs = await res.json();
                    const box = document.getElementById('terminalBox');
                    box.innerHTML = logs.join('<br>');
                    box.scrollTop = box.scrollHeight;
                }, 3000);
            </script>
        </body>
        </html>
    `);
});

router.post('/api/announcement', checkAuth, async (req, res) => {
    const client = req.app.locals.client;
    const { channelId, title, message } = req.body;
    try {
        const guild = client.guilds.cache.first();
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (channel && channel.type === ChannelType.GuildText) {
            const embed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(title)
                .setDescription(message)
                .setTimestamp()
                .setFooter({ text: `Annonce envoyée depuis le Dashboard web par ${req.session.user.username}` });

            await channel.send({ embeds: [embed] });
        }
        res.redirect('/dashboard?success=announcement_sent');
    } catch (err) {
        console.error("Erreur envoi annonce web:", err);
        res.redirect('/dashboard?error=failed');
    }
});

router.get('/api/logs', checkAuth, (req, res) => {
    res.json(req.app.locals.liveLogs);
});

module.exports = router;

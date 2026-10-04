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
            <title>TIITII_Bot - Connexion Requise</title>
            <style>
                body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding-top: 100px; }
                .card { background: #1e293b; display: inline-block; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
                .btn-discord { background: #5865F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-top: 20px; }
                .btn-discord:hover { background: #4752C4; }
                h1 { color: #57F287; }
            </style>
        </head>
        <body>
            <div class="card">
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
            res.send(`<!DOCTYPE html><html><body style="background:#0f172a;color:white;text-align:center;padding-top:100px;font-family:sans-serif;"><h1>❌ Accès refusé</h1><p>Tu n'es pas administrateur de ce bot.</p><a href="/" style="color:#57F287;">Retour</a></body></html>`);
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
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
                .container { max-width: 1100px; margin: 0 auto; }
                header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
                .card { background: #1e293b; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                h2 { color: #57F287; margin-top: 0; }
                .terminal { background: #090d16; color: #38ef7d; font-family: monospace; padding: 15px; border-radius: 6px; height: 200px; overflow-y: scroll; font-size: 13px; }
                input, select, textarea { width: 100%; padding: 10px; margin: 8px 0; background: #0f172a; border: 1px solid #334155; color: white; border-radius: 5px; box-sizing: border-box; }
                button { background: #57F287; color: #0f172a; border: none; padding: 10px 20px; font-weight: bold; border-radius: 5px; cursor: pointer; }
                button:hover { background: #4ade80; }
                .btn-logout { background: #ef4444; color: white; text-decoration: none; padding: 8px 15px; border-radius: 5px; font-size: 14px; }
            </style>
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

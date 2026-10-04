const express = require('express');
const router = express.Router();

// 1. Redirection vers la page de connexion Discord OAuth2
router.get('/discord', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/auth/discord/callback`;

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify guilds.members.read`;
    
    res.redirect(discordAuthUrl);
});

// 2. Callback de retour après acceptation sur Discord
router.get('/discord/callback', async (req, res) => {
    const client = req.app.locals.client;
    const code = req.query.code;

    // 🔍 VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT DANS LES LOGS
    console.log("=== TEST OAUTH2 ===");
    console.log("CLIENT_ID présent :", process.env.CLIENT_ID ? "OUI (" + process.env.CLIENT_ID + ")" : "NON ❌");
    console.log("CLIENT_SECRET présent :", process.env.CLIENT_SECRET ? "OUI" : "NON ❌");
    console.log("Code reçu de Discord :", code ? "OUI" : "NON ❌");

    if (!code) return res.redirect('/?error=no_code');

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const redirectUri = `${protocol}://${host}/auth/discord/callback`;

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const oauthData = await tokenResponse.json();
        
        console.log("Réponse de l'API Discord Token :", oauthData);

        if (!oauthData.access_token) {
            return res.redirect('/?error=bad_token');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${oauthData.access_token}` },
        });
        const user = await userResponse.json();

        const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
        const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

        let isAdmin = ADMIN_USER_IDS.includes(user.id);
        if (!isAdmin && client.guilds.cache.size > 0) {
            const guild = client.guilds.cache.first();
            const member = await guild.members.fetch(user.id).catch(() => null);
            if (member) {
                const hasAdminRole = ADMIN_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
                if (hasAdminRole) isAdmin = true;
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
        console.error("❌ Exception attrapée dans OAuth2:", err);
        res.redirect('/?error=server_error');
    }
});

module.exports = router;

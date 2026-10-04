// Page d'accueil / Connexion
router.get('/', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/dashboard');
    }
    res.render('index'); // Va chercher views/index.html
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

    // Va chercher views/dashboard.html en lui injectant les variables
    res.render('dashboard', {
        username: req.session.user.username,
        memberCount,
        hours,
        minutes,
        channelsHtml
    });
});

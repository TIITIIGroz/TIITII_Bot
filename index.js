const { Client, GatewayIntentBits, Collection, ActivityType, Events, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");

// 👇 1. SÉCURITÉ POUR ATTRAPER LES ERREURS 👇
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée (Unhandled Rejection) :', error);
});

// Import des systèmes, de Supabase & de la BDD PostgreSQL (pool)
const { handleXpMessage } = require("./systems/levels/xp");
const supabase = require("./supabase"); 
const pool = require("./systems/levels/database");
console.log("TEST TOKEN :", process.env.TOKEN ? "Le token est bien lu !" : "ATTENTION : Le token est VIDE !");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates 
    ]
});

client.commands = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

// 🛡️️ Listes des administrateurs et rôles
const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

function hasAdminPermission(member) {
    if (!member) return false;
    const isSpecialUser = ADMIN_USER_IDS.includes(member.id);
    const hasAdminRole = ADMIN_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    return isSpecialUser || hasAdminRole;
}

// 🌐 CONFIGURATION DU DASHBOARD WEB & OAUTH2 & LOGS
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'tiitii_super_secret_key_999',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Capture des logs en direct pour le Dashboard
const liveLogs = [];
const originalConsoleLog = console.log;
console.log = function(...args) {
    const timestamp = new Date().toLocaleTimeString();
    liveLogs.push(`[${timestamp}] ` + args.join(' '));
    if (liveLogs.length > 100) liveLogs.shift();
    originalConsoleLog.apply(console, args);
};

// Middleware pour vérifier si l'admin est connecté
function checkAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
}

// Page de Connexion / Accueil publique
app.get('/', (req, res) => {
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

// Route d'authentification Discord OAuth2
app.get('/auth/discord', (req, res) => {
    const clientId = process.env.CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback');
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify guilds.members.read`);
});

// Callback Discord OAuth2
app.get('/auth/discord/callback', async (req, res) => {
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

        // Récupérer l'utilisateur Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${oauthData.access_token}` },
        });
        const user = await userResponse.json();

        // Vérifier si c'est un Admin (par ID direct)
        let isAdmin = ADMIN_USER_IDS.includes(user.id);

        // Si pas dans la liste des IDs, vérifier sur le serveur principal
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

// Route Déconnexion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Tableau de Bord Complet (Protégé)
app.get('/dashboard', checkAuth, async (req, res) => {
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

// API pour envoyer une annonce
app.post('/api/announcement', checkAuth, async (req, res) => {
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

// API pour récupérer les logs en JSON
app.get('/api/logs', checkAuth, (req, res) => {
    res.json(liveLogs);
});

// Démarrage du serveur web Express
app.listen(PORT, () => {
    console.log(`🌐 Dashboard web sécurisé actif sur le port ${PORT}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'create_ticket_fr' || interaction.customId === 'create_ticket_en') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const guild = interaction.guild;
            const member = interaction.member;
            const isFrench = interaction.customId === 'create_ticket_fr';

            const TICKET_CATEGORY_ID = null; 
            const ADMIN_ROLE_ID = "1008853465415553075"; 
            const LOGS_TICKET_ID = "1258726665232842762";

            try {
                const channelName = isFrench ? `ticket-fr-${member.user.username}` : `ticket-en-${member.user.username}`;

                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: guild.id, deny: ['ViewChannel'] },
                        { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                        { id: ADMIN_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor(isFrench ? '#57F287' : '#FEE75C')
                    .setTitle(isFrench ? `Ticket de ${member.user.username} (FR)` : `Ticket for ${member.user.username} (EN)`)
                    .setDescription(isFrench ? "Merci d'avoir ouvert un ticket ! Si c'est une fausse manipulation, ferme-le vite ; sinon, décris ton problème en détail et partage tes preuves sans attendre." : "Thank you for opening a ticket! If this was a mistake, please close it quickly; otherwise, describe your issue in detail and share your proof right away.");

                const closeButtonLabel = isFrench ? 'Fermer le ticket' : 'Close ticket';
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel(closeButtonLabel).setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await channel.send({
                    content: `<@${member.id}> \vert{} <@&${ADMIN_ROLE_ID}>`,
                    embeds: [ticketEmbed],
                    components: [closeRow]
                });

                const logsChannel = await guild.channels.fetch(LOGS_TICKET_ID).catch(() => null);
                if (logsChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(isFrench ? '#3498DB' : '#E67E22')
                        .setTitle('🎫 Nouveau ticket ouvert')
                        .addFields(
                            { name: '👤 Utilisateur', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: '🌐 Langue', value: isFrench ? 'Français (FR)' : 'Anglais (EN)', inline: true },
                            { name: '📂 Salon créé', value: `${channel} (\`${channel.name}\`)`, inline: false },
                            { name: '🆔 ID du membre', value: `\`${member.id}\``, inline: true }
                        )
                        .setTimestamp();
                    await logsChannel.send({ embeds: [logEmbed] });
                }

                return await interaction.editReply({ content: isFrench ? `Ton ticket français a été créé : ${channel} !✅` : `Your English ticket has been created: ${channel} !✅` });
            } catch (err) {
                console.error("Erreur création ticket :", err);
                return await interaction.editReply({ content: isFrench ? "❌ Une erreur est survenue." : "❌ An error occurred." });
            }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Fermeture du ticket... / Closing ticket...' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (err) { console.error("Erreur suppression salon ticket :", err); }
            }, 5000);
            return;
        }

        if (interaction.customId.startsWith('translate_')) {
            const key = interaction.customId.replace('translate_', '');
            let responseText = "❌ Texte secret introuvable.";
            try {
                const { data } = await supabase.from('button_translations').select('response_text').eq('key', key).single();
                if (data && data.response_text) responseText = data.response_text;
            } catch (err) { console.error("Erreur lecture Supabase :", err); }

            try {
                return await interaction.reply({ content: responseText, flags: [MessageFlags.Ephemeral] });
            } catch (err) { console.error("Erreur réponse bouton :", err); }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const ALLOWED_CHANNEL_ID = '1534722984391082105';
    const memberRoles = interaction.member.roles.cache;
    const hasAdminRole = ADMIN_ROLE_IDS.some(roleId => memberRoles.has(roleId));
    const isSpecialUser = ADMIN_USER_IDS.includes(interaction.user.id);

    if (interaction.channelId !== ALLOWED_CHANNEL_ID && !hasAdminRole && !isSpecialUser) {
        return interaction.reply({
            content: `❌ Vous n'avez pas les permissions pour faire les commandes dans ce salon, écrivez votre commande dans le salon <#${ALLOWED_CHANNEL_ID}>`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const reply = { content: "Une erreur est survenue.", flags: [MessageFlags.Ephemeral] };
        interaction.replied || interaction.deferred ? await interaction.followUp(reply) : await interaction.reply(reply);
    }
});

client.on(Events.MessageCreate, async (message) => {
    await handleXpMessage(message, client);
});

const temporaryVoiceChannels = new Map();

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const PILOT_CHANNEL_ID = "1533281900318167060";
    const LOGS_VOICE_ID = "1258726912721817611";
    const guild = newState.guild;
    const member = newState.member;

    if (newState.channelId === PILOT_CHANNEL_ID) {
        try {
            const channelName = `Voc ${member.user.username}`;
            const parentCategory = newState.channel?.parent;

            const tempChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: parentCategory,
                permissionOverwrites: [
                    { id: guild.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
                    { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers] },
                ],
            });

            await member.voice.setChannel(tempChannel);
            temporaryVoiceChannels.set(tempChannel.id, member.id);

            const logsChannel = await guild.channels.fetch(LOGS_VOICE_ID).catch(() => null);
            if (logsChannel) {
                const voiceLogEmbed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('Salon vocal temporaire créé !🔊')
                    .addFields({ name: '👤 Propriétaire', value: `${member.user.tag} (<@${member.id}>)`, inline: true }, { name: '📂 Salon', value: `${tempChannel} (\`${tempChannel.name}\`)`, inline: true })
                    .setTimestamp();
                await logsChannel.send({ embeds: [voiceLogEmbed] });
            }
        } catch (err) { console.error("Erreur création salon vocal :", err); }
    }

    if (oldState.channel && temporaryVoiceChannels.has(oldState.channelId)) {
        const emptyChannel = oldState.channel;
        if (emptyChannel.members.size === 0) {
            try {
                const ownerId = temporaryVoiceChannels.get(emptyChannel.id);
                temporaryVoiceChannels.delete(emptyChannel.id);
                await emptyChannel.delete();

                const logsChannel = await guild.channels.fetch(LOGS_VOICE_ID).catch(() => null);
                if (logsChannel) {
                    const deleteLogEmbed = new EmbedBuilder()
                        .setColor('#E74C3C')
                        .setTitle('Salon vocal temporaire supprimé !🔇')
                        .addFields({ name: '📂 Salon', value: `\`${emptyChannel.name}\``, inline: true }, { name: '👤 Propriétaire initial', value: `<@${ownerId}>`, inline: true })
                        .setTimestamp();
                    await logsChannel.send({ embeds: [deleteLogEmbed] });
                }
            } catch (err) { console.error("Erreur suppression salon vide :", err); }
        }
    }
});

client.on(Events.GuildMemberRemove, async (member) => {
    const PRISON_ROLES = ["1549495761761214484", "913882559363043388"];
    const hasPrisonRole = member.roles.cache.some(role => PRISON_ROLES.includes(role.id));
    if (hasPrisonRole) {
        const heldPrisonRoles = member.roles.cache.filter(role => PRISON_ROLES.includes(role.id)).map(r => r.id);
        await supabase.from('prison_escapes').upsert({ user_id: member.id, prison_roles: heldPrisonRoles }, { onConflict: 'user_id' }).catch(err => console.error("Erreur sauvegarde prison :", err));
    }
    try {
        await pool.query(`DELETE FROM users WHERE userid = $1 AND guildid = $2`, [member.id, member.guild.id]);
    } catch (err) { console.error("Erreur nettoyage BDD départ :", err); }
});

client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const { data } = await supabase.from('prison_escapes').select('prison_roles').eq('user_id', member.id).single();
        if (data && data.prison_roles && data.prison_roles.length > 0) {
            await member.roles.add(data.prison_roles).catch(err => console.error("Erreur rôles prison :", err));
            await supabase.from('prison_escapes').delete().eq('user_id', member.id);
        }
    } catch (err) {}
});

client.once(Events.ClientReady, async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    console.log(`📋 Commandes enregistrées : ${client.commands.size}`);

    client.user.setPresence({
        activities: [{ name: "TIITII_Groz sur/on Twitch", type: ActivityType.Streaming, url: "https://www.twitch.tv/TIITII_Groz" }],
        status: "online",
    });

    const ONLINE_CHANNEL_ID = "1547854332333006899";
    try {
        const channel = await client.channels.fetch(ONLINE_CHANNEL_ID).catch(() => null);
        if (channel) {
            const timestamp = Math.floor(Date.now() / 1000);
            await channel.send(`Je suis en ligne depuis <t:${timestamp}:T> !`);
        }
    } catch (err) { console.error("Erreur message en ligne :", err); }

    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const todayFormatted = `${day}/${month}`;

            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(now.getDate() - 1);
            const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
            const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
            const yesterdayFormatted = `${yDay}/${yMonth}`;

            const BIRTHDAY_ROLE_ID = "1011652804269580389";
            const BIRTHDAY_CHANNEL_ID = "1011649291124744212"; 
            const PING_ROLE_ID = "864898646343811077";

            try {
                const { data: oldBirthdays } = await supabase.from('birthdays').select('*').like('birth_date', `${yesterdayFormatted}%`);
                if (oldBirthdays) {
                    for (const b of oldBirthdays) {
                        const guild = client.guilds.cache.get(b.guild_id);
                        if (!guild) continue;
                        const member = await guild.members.fetch(b.user_id).catch(() => null);
                        if (member && member.roles.cache.has(BIRTHDAY_ROLE_ID)) {
                            await member.roles.remove(BIRTHDAY_ROLE_ID).catch(() => {});
                        }
                    }
                }

                const { data: birthdays } = await supabase.from('birthdays').select('*').like('birth_date', `${todayFormatted}%`);
                if (!birthdays || birthdays.length === 0) return;

                for (const b of birthdays) {
                    const guild = client.guilds.cache.get(b.guild_id);
                    if (!guild) continue;
                    const member = await guild.members.fetch(b.user_id).catch(() => null);
                    if (member) await member.roles.add(BIRTHDAY_ROLE_ID).catch(() => {});

                    const channel = guild.channels.cache.get(BIRTHDAY_CHANNEL_ID);
                    if (!channel) continue;

                    const bdayEmbed = new EmbedBuilder()
                        .setColor('#FF69B4')
                        .setTitle('🎉 Joyeux Anniversaire ! 🎂')
                        .setDescription(`Tout le monde souhaite un excellent anniversaire à <@${b.user_id}> ! Passe une merveilleuse journée ! 🎈`)
                        .setTimestamp();

                    await channel.send({ content: `<@&${PING_ROLE_ID}>`, embeds: [bdayEmbed] });
                }
            } catch (err) { console.error("Erreur anniversaires :", err); }
        }
    }, 60000);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const ACCESS_ROLE = "1509584318203433001";
    const TRIGGER_ROLES = ["1269778023826067699", "1533558027825840218"];
    const hasTriggerRole = TRIGGER_ROLES.some(roleId => newMember.roles.cache.has(roleId));
    const hasAccessRole = newMember.roles.cache.has(ACCESS_ROLE);

    try {
        if (hasTriggerRole && !hasAccessRole) await newMember.roles.add(ACCESS_ROLE);
        if (!hasTriggerRole && hasAccessRole) await newMember.roles.remove(ACCESS_ROLE);
    } catch (err) { console.error("Erreur rôle d'accès :", err); }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const BOOST_ROLE_ID = "1547695661435195424";
    const LOG_CHANNEL_ID = "1534224381109076172";
    const wasBoosting = oldMember.premiumSinceTimestamp !== null;
    const isBoosting = newMember.premiumSinceTimestamp !== null;

    try {
        if (!wasBoosting && isBoosting) {
            if (!newMember.roles.cache.has(BOOST_ROLE_ID)) await newMember.roles.add(BOOST_ROLE_ID);
            const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (channel) await channel.send(`Le propriétaire et le staff te remerci beaucoup ${newMember} pour le boost du serveur ! Le rôle de soutien t'a été attribué.`);
        }
        if (wasBoosting && !isBoosting) {
            if (newMember.roles.cache.has(BOOST_ROLE_ID)) await newMember.roles.remove(BOOST_ROLE_ID);
        }
    } catch (err) { console.error("Erreur boost :", err); }
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const TAG_ROLE_ID = "1547699213700309072";
    const TARGET_TAG = "GROZ"; 
    const oldName = oldMember.nickname || oldMember.user.username;
    const newName = newMember.nickname || newMember.user.username;
    const hadTag = oldName.includes(TARGET_TAG);
    const hasTag = newName.includes(TARGET_TAG);

    try {
        if (!hadTag && hasTag) {
            if (!newMember.roles.cache.has(TAG_ROLE_ID)) await newMember.roles.add(TAG_ROLE_ID);
        }
        if (hadTag && !hasTag) {
            if (newMember.roles.cache.has(TAG_ROLE_ID)) await newMember.roles.remove(TAG_ROLE_ID);
        }
    } catch (err) { console.error("Erreur tag :", err); }
});

// Chargement des automatismes
require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);
require('./Automatisme/Gbye.js')(client);
require('./systems/levels/voiceXp')(client);

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

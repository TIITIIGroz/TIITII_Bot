const { Client, GatewayIntentBits, Partials, Collection, ActivityType, Events, MessageFlags, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée (Unhandled Rejection) :', error);
});

const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('🍃 Connecté à la base de données MongoDB Atlas !'))
        .catch(err => console.error('❌ Erreur de connexion MongoDB :', err));
} else {
    console.log("⚠️ MONGODB_URI n'est pas définie dans les variables d'environnement.");
}

const { handleXpMessage } = require("./systems/levels/xp");
const { checkAndReward } = require("./systems/levels/rewards");
const supabase = require("./supabase"); 
const pool = require("./systems/levels/database");
console.log("TEST TOKEN :", process.env.TOKEN ? "Le token est bien lu !" : "ATTENTION : Le token est VIDE !");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message
    ]
});

client.commands = new Collection();

// Chargement des commandes depuis le dossier "commands"
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

// Chargement des événements depuis ton dossier "event" (au singulier) -> Gère l'interactionCreate, etc.
const eventPath = path.join(__dirname, "event");
if (fs.existsSync(eventPath)) {
    const eventFiles = fs.readdirSync(eventPath).filter(file => file.endsWith(".js"));
    for (const file of eventFiles) {
        const event = require(path.join(eventPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

client.on(Events.MessageCreate, async (message) => {
    if (message.guild === null && !message.author.bot) {
        const LOG_DM_CHANNEL_ID = "1552184275309297675";
        try {
            const targetChannel = await client.channels.fetch(LOG_DM_CHANNEL_ID).catch(() => null);
            if (targetChannel) {
                const timestamp = Math.floor(Date.now() / 1000);
                await targetChannel.send(`📥 **Nouveau MP reçu le <t:${timestamp}:F> (<t:${timestamp}:R>) de** ${message.author.tag} (\`${message.author.id}\`) :\n> ${message.content}`);
            }
        } catch (err) { console.error("Erreur transfert MP :", err); }
        return;
    }

    await handleXpMessage(message, client);
});

// --- GESTION UNIFIÉE DES ÉVÉNEMENTS VOCAUX (Salons Temporaires + Temps Vocal Supabase) ---
const temporaryVoiceChannels = new Map();
const voiceSessions = new Map();

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const PILOT_CHANNEL_ID = "1533281900318167060";
    const LOGS_VOICE_ID = "1258726912721817611";
    const guild = newState.guild;
    const member = newState.member;

    if (!member || member.user.bot) return;

    const guildId = guild.id;
    const userId = member.id;
    const key = `${guildId}-${userId}`;

    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // 1. Gestion des salons vocaux temporaires
    if (newChannelId === PILOT_CHANNEL_ID) {
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
                    .addFields(
                        { name: '👤 Propriétaire', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                        { name: '📂 Salon', value: `${tempChannel} (\`${tempChannel.name}\`)`, inline: true }
                    )
                    .setFooter({ text: '/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\' })
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
                        .addFields(
                            { name: '📂 Salon', value: `\`${emptyChannel.name}\``, inline: true },
                            { name: '👤 Propriétaire initial', value: `<@${ownerId}>`, inline: true }
                        )
                        .setFooter({ text: '/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\' })
                        .setTimestamp();
                    await logsChannel.send({ embeds: [deleteLogEmbed] });
                }
            } catch (err) { console.error("Erreur suppression salon vide :", err); }
        }
    }

    // 2. Gestion du suivi du temps vocal dans Supabase (server_voice_activity) avec exclusion des salons ignorés
    try {
        let isIgnored = false;
        const targetChannelToCheck = newChannelId || oldChannelId;
        if (targetChannelToCheck) {
            const { data: ignoredData } = await pool.query(
                `SELECT 1 FROM ignored_channels WHERE guildid = $1 AND channelid = $2`,
                [guildId, targetChannelToCheck]
            );
            if (ignoredData && ignoredData.length > 0) isIgnored = true;
        }

        if (!isIgnored) {
            if (!oldChannelId && newChannelId) {
                voiceSessions.set(key, { channelId: newChannelId, timestamp: Date.now() });
            } else if (oldChannelId && (!newChannelId || oldChannelId !== newChannelId)) {
                const session = voiceSessions.get(key);
                if (session) {
                    const durationSeconds = Math.floor((Date.now() - session.timestamp) / 1000);

                    if (durationSeconds > 5) {
                        await pool.query(
                            `INSERT INTO server_voice_activity (guildid, userid, channelid, duration_seconds) VALUES ($1, $2, $3, $4)`,
                            [guildId, userId, session.channelId, durationSeconds]
                        );
                    }
                }

                if (newChannelId) {
                    voiceSessions.set(key, { channelId: newChannelId, timestamp: Date.now() });
                } else {
                    voiceSessions.delete(key);
                }
            }
        }
    } catch (err) {
        console.error("Erreur suivi vocal Supabase :", err);
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

    console.log("🔄 Lancement de la synchronisation globale des rôles...");
    try {
        for (const [guildId, guild] of client.guilds.cache) {
            const resDb = await pool.query(`SELECT userid, level FROM users WHERE guildid = $1`, [guildId]);
            
            for (const row of resDb.rows) {
                if (row.level > 0) {
                    const member = await guild.members.fetch(row.userid).catch(() => null);
                    if (member) {
                        await checkAndReward(member, parseInt(row.level));
                    }
                }
            }
        }
        console.log("✅ Synchronisation globale terminée avec succès !");
    } catch (err) {
        console.error("❌ Erreur lors de la synchronisation globale :", err);
    }

    const ONLINE_CHANNEL_ID = "1547854332333006899";
    try {
        const channel = await client.channels.fetch(ONLINE_CHANNEL_ID).catch(() => null);
        if (channel) {
            const timestamp = Math.floor(Date.now() / 1000);
            await channel.send(`Je suis en ligne depuis <t:${timestamp}:T> !\n----------------------------------------------`);
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
                        .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

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

require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);
require('./Automatisme/Gbye.js')(client);
require('./systems/levels/voiceXp')(client);
require('./systems/confession/confessionSystem')(client);
require('./Automatisme/ServerStats')(client);
require('./Automatisme/OnboardingSystem')(client);

const setupDashboard = require('./website/server');
setupDashboard(client);

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

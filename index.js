const { Client, GatewayIntentBits, Collection, ActivityType, Events, MessageFlags, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");

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

// 🛡 Listes des administrateurs et rôles
const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

client.on(Events.InteractionCreate, async interaction => {
    // Délégation des boutons vers les fichiers de commandes (comme ticket-setup.js ou autres)
    if (interaction.isButton()) {
        const [commandName] = interaction.customId.split('_'); 
        // Si c'est un bouton de ticket ou autre géré par les commandes, on peut l'aiguiller ou laisser les commandes intercepter.
        const command = client.commands.get('ticket-setup'); // Exemple si tu veux router vers ticket-setup
        if (command && typeof command.handleButton === 'function') {
            try {
                await command.handleButton(interaction);
            } catch (err) {
                console.error("Erreur gestion bouton :", err);
            }
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

// Événement : Salons vocaux temporaires
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
                    .setFooter({ text: '\/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\' })
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
                        .setFooter({ text: '\/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\' })
                        .setTimestamp();
                    await logsChannel.send({ embeds: [deleteLogEmbed] });
                }
            } catch (err) { console.error("Erreur suppression salon vide :", err); }
        }
    }
});

// Événement : Départ de membre (Prison / Nettoyage BDD)
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

// Événement : Arrivée de membre (Restauration rôles prison)
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const { data } = await supabase.from('prison_escapes').select('prison_roles').eq('user_id', member.id).single();
        if (data && data.prison_roles && data.prison_roles.length > 0) {
            await member.roles.add(data.prison_roles).catch(err => console.error("Erreur rôles prison :", err));
            await supabase.from('prison_escapes').delete().eq('user_id', member.id);
        }
    } catch (err) {}
});

// Événement : Client Prêt (Présence, message en ligne, anniversaires)
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
            await channel.send(`Je suis en ligne depuis <t:${timestamp}:T> !\n----------------------------------------------`);
        }
    } catch (err) { console.error("Erreur message en ligne :", err); }

    // Système des anniversaires à minuit
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
                        .setFooter({ text: '\/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\' })
                        .setTimestamp();

                    await channel.send({ content: `<@&${PING_ROLE_ID}>`, embeds: [bdayEmbed] });
                }
            } catch (err) { console.error("Erreur anniversaires :", err); }
        }
    }, 60000);
});

// Événement : Gestion des rôles d'accès
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

// Événement : Gestion des boosts serveur
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

// Événement : Gestion du pseudo/tag personnalisé ("GROZ")
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

// Chargement des automatismes externes
require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);
require('./Automatisme/Gbye.js')(client);
require('./systems/levels/voiceXp')(client);

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

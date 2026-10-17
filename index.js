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
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages
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
    // Transférer les messages reçus en MP vers le salon spécifié
    if (message.guild === null && !message.author.bot) {
        const LOG_DM_CHANNEL_ID = "1552184275309297675";
        try {
            const targetChannel = await client.channels.fetch(LOG_DM_CHANNEL_ID).catch(() => null);
            if (targetChannel) {
                await targetChannel.send(`📥 **Nouveau MP reçu de** ${message.author.tag} (\`${message.author.id}\`) :\n> ${message.content}`);
            }
        } catch (err) {
            console.error("Erreur transfert MP :", err);
        }
        return;
    }

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
                    .addFields({ name: '👤 Propriétaire', value: `${member.user.tag} (<@${member.id}>)`, inline: true }, { name: '📂

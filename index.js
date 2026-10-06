const { Client, GatewayIntentBits, Collection, ActivityType, Events, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Sécurité erreurs non gérées
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée (Unhandled Rejection) :', error);
});

const { handleXpMessage } = require("./systems/levels/xp");
const supabase = require("./supabase"); 
const pool = require("./systems/levels/database");

// Importer et lancer le dashboard web depuis le dossier dashboard
const { startDashboard } = require("./dashboard/dashboard.js");

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

// Listes administrateurs
const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

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
                    .setDescription(isFrench ? "Merci d'avoir ouvert un ticket !" : "Thank you for opening a ticket!");

                const closeButtonLabel = isFrench ? 'Fermer le ticket' : 'Close ticket';
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel(closeButtonLabel).setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await channel.send({
                    content: `<@${member.id}> | <@&${ADMIN_ROLE_ID}>`,
                    embeds: [ticketEmbed],
                    components: [closeRow]
                });

                return await interaction.editReply({ content: isFrench ? `Ton ticket français a été créé : ${channel} !✅` : `Your English ticket has been created: ${channel} !✅` });
            } catch (err) {
                console.error("Erreur création ticket :", err);
                return await interaction.editReply({ content: "❌ Une erreur est survenue." });
            }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Fermeture du ticket...' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (err) { console.error(err); }
            }, 5000);
            return;
        }

        if (interaction.customId.startsWith('translate_')) {
            const key = interaction.customId.replace('translate_', '');
            let responseText = "❌ Texte secret introuvable.";
            try {
                const { data } = await supabase.from('button_translations').select('response_text').eq('key', key).single();
                if (data && data.response_text) responseText = data.response_text;
            } catch (err) { console.error(err); }
            return await interaction.reply({ content: responseText, flags: [MessageFlags.Ephemeral] });
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
            content: `❌ Salon non autorisé, écrivez dans <#${ALLOWED_CHANNEL_ID}>`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
    }
});

client.on(Events.MessageCreate, async (message) => {
    await handleXpMessage(message, client);
});

// Chargement des automatismes
require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);
require('./Automatisme/Gbye.js')(client);
require('./systems/levels/voiceXp')(client);

client.once(Events.ClientReady, async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    
    client.user.setPresence({
        activities: [{ name: "TIITII_Groz sur/on Twitch", type: ActivityType.Streaming, url: "https://www.twitch.tv/TIITII_Groz" }],
        status: "online",
    });

    // Lancer le dashboard web en lui passant le client Discord
    startDashboard(client);
});

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

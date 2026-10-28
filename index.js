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

const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // 1. Gestion des boutons personnalisés/traductions enregistrés dans Supabase (Persistant après redémarrage)
        if (customId.startsWith('translate_')) {
            const key = customId.replace('translate_', '');
            try {
                const { data, error } = await supabase
                    .from('button_translations')
                    .select('response_text')
                    .eq('key', key)
                    .single();

                if (error || !data) {
                    return interaction.reply({ 
                        content: "❌ Désolé, le texte associé à ce bouton est introuvable en base de données.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                return interaction.reply({ 
                    content: data.response_text, 
                    flags: [MessageFlags.Ephemeral] 
                });
            } catch (err) {
                console.error("Erreur lors de la récupération du texte du bouton depuis Supabase :", err);
                return interaction.reply({ 
                    content: "❌ Une erreur est survenue lors du chargement du texte.", 
                    flags: [MessageFlags.Ephemeral] 
                });

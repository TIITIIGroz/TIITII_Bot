const { Client, GatewayIntentBits, Collection, ActivityType, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");

// 👇 1. SÉCURITÉ POUR ATTRAPER LES ERREURS 👇
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée (Unhandled Rejection) :', error);
});

// Import des systèmes
const { handleXpMessage } = require("./systems/levels/xp");
console.log("TEST TOKEN :", process.env.TOKEN ? "Le token est bien lu !" : "ATTENTION : Le token est VIDE !");

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, // REQUIS POUR L'XP
        GatewayIntentBits.MessageContent  // REQUIS POUR LIRE LE TEXTE
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

// Slash Commands
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const reply = { content: "Une erreur est survenue.", ephemeral: true };
        interaction.replied || interaction.deferred ? await interaction.followUp(reply) : await interaction.reply(reply);
    }
});

// Écouteur de messages pour l'XP
client.on(Events.MessageCreate, async (message) => {
    await handleXpMessage(message, client);
});

// Bot prêt
client.once(Events.ClientReady, async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    
    console.log(`📋 Commandes enregistrées en mémoire : ${client.commands.size}`);
    client.commands.forEach((cmd, name) => {
        console.log(` - /${name}`);
    });

    client.user.setPresence({
        activities: [{ name: "TIITII_Groz sur/on Twitch", type: ActivityType.Streaming, url: "https://www.twitch.tv/TIITII_Groz" }],
        status: "online",
    });

    // Envoi du message de connexion sur Render
    const ONLINE_CHANNEL_ID = "1547854332333006899";
    try {
        const channel = await client.channels.fetch(ONLINE_CHANNEL_ID).catch(() => null);
        if (channel) {
            await channel.send("Je suis en ligne !");
        }
    } catch (err) {
        console.error("Erreur lors de l'envoi du message 'Je suis en ligne' :", err);
    }
});

// Gestion des rôles automatiques (Accès)
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const ACCESS_ROLE = "1509584318203433001";
    const TRIGGER_ROLES = ["1269778023826067699", "1533558027825840218"];
    const hasTriggerRole = TRIGGER_ROLES.some(roleId => newMember.roles.cache.has(roleId));
    const hasAccessRole = newMember.roles.cache.has(ACCESS_ROLE);

    try {
        if (hasTriggerRole && !hasAccessRole) await newMember.roles.add(ACCESS_ROLE);
        if (!hasTriggerRole && hasAccessRole) await newMember.roles.remove(ACCESS_ROLE);
    } catch (err) { console.error("Erreur gestion rôle d'accès :", err); }
});

// Gestion des Boosts Serveur
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const BOOST_ROLE_ID = "1547695661435195424";
    const LOG_CHANNEL_ID = "1534224381109076172";

    const wasBoosting = oldMember.premiumSinceTimestamp !== null;
    const isBoosting = newMember.premiumSinceTimestamp !== null;

    try {
        // Vient de booster
        if (!wasBoosting && isBoosting) {
            if (!newMember.roles.cache.has(BOOST_ROLE_ID)) {
                await newMember.roles.add(BOOST_ROLE_ID);
            }
            const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (channel) {
                await channel.send(`🎉 Merci beaucoup ${newMember} pour le boost du serveur ! Le rôle de soutien t'a été attribué.`);
            }
        }

        // Le boost est terminé
        if (wasBoosting && !isBoosting) {
            if (newMember.roles.cache.has(BOOST_ROLE_ID)) {
                await newMember.roles.remove(BOOST_ROLE_ID);
            }
        }
    } catch (err) { 
        console.error("Erreur gestion boost :", err); 
    }
});

// Gestion du Tag utilisateur
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const TAG_ROLE_ID = "1547699213700309072";
    const TARGET_TAG = "TIITII"; // Modifie si besoin par ton tag exact

    const oldName = oldMember.nickname || oldMember.user.username;
    const newName = newMember.nickname || newMember.user.username;

    const hadTag = oldName.includes(TARGET_TAG);
    const hasTag = newName.includes(TARGET_TAG);

    try {
        // Ajout du tag
        if (!hadTag && hasTag) {
            if (!newMember.roles.cache.has(TAG_ROLE_ID)) {
                await newMember.roles.add(TAG_ROLE_ID);
            }
        }

        // Retrait du tag
        if (hadTag && !hasTag) {
            if (newMember.roles.cache.has(TAG_ROLE_ID)) {
                await newMember.roles.remove(TAG_ROLE_ID);
            }
        }
    } catch (err) { 
        console.error("Erreur gestion tag :", err); 
    }
});

// 👇 CHARGEMENT DE TES AUTOMATISMES 👇
require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);

// 👇 3. CONNEXION DISCORD 👇
console.log("Tentative de connexion à Discord...");

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

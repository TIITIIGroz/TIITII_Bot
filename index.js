const { Client, GatewayIntentBits, Collection, ActivityType, Events } = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");
// Import des systèmes
const { handleXpMessage } = require("./systems/levels/xp");

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
client.once(Events.ClientReady, () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: "TIITII_Groz sur/on Twitch", type: ActivityType.Streaming, url: "https://www.twitch.tv/TIITII_Groz" }],
        status: "online",
    });
});

// Gestion des rôles
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const ACCESS_ROLE = "1509584318203433001";
    const TRIGGER_ROLES = ["1269778023826067699", "1533558027825840218"];
    const hasTriggerRole = TRIGGER_ROLES.some(roleId => newMember.roles.cache.has(roleId));
    const hasAccessRole = newMember.roles.cache.has(ACCESS_ROLE);

    try {
        if (hasTriggerRole && !hasAccessRole) await newMember.roles.add(ACCESS_ROLE);
        if (!hasTriggerRole && hasAccessRole) await newMember.roles.remove(ACCESS_ROLE);
    } catch (err) { console.error(err); }
});

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

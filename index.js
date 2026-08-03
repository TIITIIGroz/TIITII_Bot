const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
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
} else {
    console.log("Le dossier 'commands' est introuvable.");
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

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "Une erreur est survenue.",
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: "Une erreur est survenue.",
                ephemeral: true
            });
        }
    }
});

// Bot prêt
client.once("clientready", () => {

    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    client.user.setPresence({
        activities: [
            {
                name: "https://twitch.tv/TIITII_Groz",
                type: 3
            }
        ],
        status: "online"
    });

});

client.login(process.env.TOKEN);

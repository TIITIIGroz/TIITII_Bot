const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// Charger les commandes
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Interaction handler (slash commands)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
  }
});

// Bot ready
client.once("ready", () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);

  // 🎯 STATUT DU BOT (modifiable ici)
  client.user.setPresence({
    activities: [
      {
        name: "TIITII_Groz 👀",
        type: 3 // WATCHING
      }
    ],
    status: "online"
  });
});

// Login
client.login(process.env.TOKEN);
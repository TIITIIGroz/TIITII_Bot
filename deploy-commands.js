const { REST, Routes } = require("discord.js");
const fs = require("fs");

const commands = [];
const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Déploiement des commandes...");

    await rest.put(
      Routes.applicationCommands("1343093684832436367"),
      { body: commands }
    );

    console.log("✅ Commandes déployées !");
  } catch (error) {
    console.error(error);
  }
})();
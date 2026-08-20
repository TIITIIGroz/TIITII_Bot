const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    console.log(`📦 Chargement de ${file}...`);

    const command = require(path.join(commandsPath, file));

    commands.push(command.data.toJSON());
}

console.log(`📋 ${commands.length} commande(s) trouvée(s).`);

const rest = new REST({ version: "10" })
    .setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(":rocket: Déploiement des commandes...");

        const data = await rest.put(
            Routes.applicationCommands("1343093684832436367"),
            {
                body: commands
            }
        );

        console.log(`✅ ${data.length} commande(s) déployée(s).`);
        process.exit(0);

    } catch (error) {
        console.error(":x: Erreur lors du déploiement :", error);
        process.exit(1);
    }
})();

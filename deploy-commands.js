require('dotenv').config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

const CLIENT_ID = "1343093684832436367";
const GUILD_ID = "864898646343811077";

(async () => {
    try {
        console.log("🧹 1. Suppression de TOUTES les anciennes commandes globales...");
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] } // Envoie un tableau vide pour effacer les globales
        );
        console.log("✅ Commandes globales nettoyées avec succès !");

        console.log(`🚀 2. Déploiement de tes ${commands.length} commandes sur ton serveur...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log(`✅ Succès total ! ${data.length} commandes proprement installées.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERREUR LORS DU NETTOYAGE/DÉPLOIEMENT :", error);
        process.exit(1);
    }
})();

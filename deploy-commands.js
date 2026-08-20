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
    
    console.log(`✨ ${file} chargé avec succès en mémoire !`);

    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[AVERTISSEMENT] La commande à ${file} manque de 'data' ou 'execute'.`);
    }
}

console.log(`📋 ${commands.length} commande(s) trouvée(s).`);

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("🚀 Déploiement des commandes...");
        console.log(`📤 Envoi de ${commands.length} commandes à Discord...`);

        // Sécurité anti-blocage (timeout de 10 secondes)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout : La connexion avec Discord a pris trop de temps (blocage réseau Render).")), 10000)
        );

        const putPromise = rest.put(
            Routes.applicationGuildCommands("1343093684832436367", "864898646343811077"),
            { body: commands }
        );

        const data = await Promise.race([putPromise, timeoutPromise]);

        console.log(`✅ Succès ! ${data.length} commande(s) déployée(s).`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERREUR DISCORD DÉTAILLÉE :", error);
        process.exit(1);
    }
})();

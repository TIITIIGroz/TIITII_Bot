const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    const command = require(path.join(commandsPath, file));

    commands.push(command.data.toJSON());

}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        console.log("Déploiement des commandes...");

        await rest.put(
            Routes.applicationCommands("1343093684832436367"),
            {
                body: commands
            }
        );

        console.log("✅ Les commandes ont été déployées.");

    } catch (error) {

        console.error(error);

    }

})();
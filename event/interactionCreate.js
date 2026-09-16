const fs = require('fs');
const path = require('path');

// Chemin vers le fichier JSON généré par la commande /tbouton
const filePath = path.join(__dirname, '../translations.json'); // Adapte le chemin '../' si ton fichier est au même niveau que le dossier events

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 1. Si c'est un clic sur un bouton généré par /tbouton
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('translate_')) {
                const key = interaction.customId.replace('translate_', '');

                let translations = {};
                if (fs.existsSync(filePath)) {
                    translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                }

                const responseText = translations[key] || "❌ Texte secret introuvable.";

                // Affiche le texte en privé (seul l'utilisateur qui clique le voit)
                return await interaction.reply({
                    content: responseText,
                    ephemeral: true
                });
            }
        }

        // 2. Gestion classique des commandes Slash (si ton bot utilise une collection de commandes)
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
            }
        }
    },
};

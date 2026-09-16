const fs = require('fs');
const path = require('path');

// Cherche translations.json à la racine du projet (ajuste si ton fichier est ailleurs)
const filePath = path.join(__dirname, '..', 'translations.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 1. Gestion des clics sur les boutons
        if (interaction.isButton()) {
            console.log("--> Clic détecté sur un bouton. ID :", interaction.customId);

            if (interaction.customId.startsWith('translate_')) {
                const key = interaction.customId.replace('translate_', '');
                console.log("--> Clé recherchée dans le JSON :", key);

                let translations = {};
                try {
                    if (fs.existsSync(filePath)) {
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        translations = JSON.parse(fileContent);
                    } else {
                        console.log("⚠️ Le fichier translations.json n'existe pas encore à l'emplacement :", filePath);
                    }
                } catch (err) {
                    console.error("❌ Erreur lors de la lecture de translations.json :", err);
                }

                const responseText = translations[key] || "❌ Texte secret introuvable pour cette clé.";

                try {
                    // Affiche le texte en privé (seul l'utilisateur qui clique le voit)
                    return await interaction.reply({
                        content: responseText,
                        ephemeral: true
                    });
                } catch (replyError) {
                    console.error("❌ Erreur lors du reply de l'interaction bouton :", replyError);
                }
            }
            return; // Arrête l'exécution ici si c'était un autre type de bouton
        }

        // 2. Gestion classique des commandes Slash
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error("❌ Erreur lors de l'exécution d'une commande slash :", error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande !', ephemeral: true });
            }
        }
    },
};

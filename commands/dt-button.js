const { SlashCommandBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../translations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dt-button')
        .setDescription('Retire un bouton spécifique d\'un message grâce à sa clé')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message contenant le bouton à supprimer')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('key')
                .setDescription('La clé unique du bouton à supprimer (ex: regles_en)')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const messageId = interaction.options.getString('message_id');
        const keyToRemove = interaction.options.getString('key');
        const targetCustomId = `translate_${keyToRemove}`;

        try {
            // 1. Récupérer le message dans le salon
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID dans ce salon." });
            }

            if (!message.components || message.components.length === 0) {
                return interaction.editReply({ content: "❌ Ce message ne contient aucun bouton." });
            }

            let buttonFound = false;
            let newRows = [];

            // 2. Parcourir les lignes et filtrer les composants
            for (let row of message.components) {
                let actionRow = ActionRowBuilder.from(row);
                
                let filteredComponents = actionRow.components.filter(component => {
                    if (component.data.custom_id === targetCustomId) {
                        buttonFound = true;
                        return false;
                    }
                    return true;
                });

                if (filteredComponents.length > 0) {
                    let newRow = new ActionRowBuilder().addComponents(filteredComponents);
                    newRows.push(newRow);
                }
            }

            if (!buttonFound) {
                return interaction.editReply({ content: `❌ Aucun bouton avec la clé **"${keyToRemove}"** n'a été trouvé sur ce message.` });
            }

            // 3. Mettre à jour le message sur Discord
            await message.edit({
                components: newRows.length > 0 ? newRows : []
            });

            // 4. Nettoyer le fichier translations.json
            if (fs.existsSync(filePath)) {
                let translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (translations[keyToRemove]) {
                    delete translations[keyToRemove];
                    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
                }
            }

            await interaction.editReply({ content: `✅ Succès ! Le bouton associé à la clé **"${keyToRemove}"** a été supprimé du message et de la base de données.` });
        } catch (error) {
            console.error("Erreur lors de la suppression du bouton :", error);
            await interaction.editReply({ content: "❌ Une erreur est survenue (Vérifie l'ID du message et les permissions du bot)." });
        }
    },
};

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
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
        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.options.getString('message_id');
        const keyToRemove = interaction.options.getString('key');
        const targetCustomId = `translate_${keyToRemove}`;

        try {
            // 1. Récupérer le message dans le salon
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply("❌ Impossible de trouver un message avec cet ID dans ce salon.");
            }

            if (!message.components || message.components.length === 0) {
                return interaction.editReply("❌ Ce message ne contient aucun bouton.");
            }

            let buttonFound = false;
            let newRows = [];

            // 2. Parcourir les lignes et les boutons pour filtrer et exclure celui qu'on veut supprimer
            for (let row of message.components) {
                let actionRow = ActionRowBuilder.from(row);
                
                // On filtre les composants pour garder tous les boutons SAUF celui qui correspond au customId
                let filteredComponents = actionRow.components.filter(component => {
                    if (component.data.custom_id === targetCustomId) {
                        buttonFound = true;
                        return false; // On le retire
                    }
                    return true; // On le garde
                });

                // S'il reste des boutons sur cette ligne, on l'ajoute à nos nouvelles lignes
                if (filteredComponents.length > 0) {
                    let newRow = new ActionRowBuilder().addComponents(filteredComponents);
                    newRows.push(newRow);
                }
            }

            if (!buttonFound) {
                return interaction.editReply(`❌ Aucun bouton avec la clé **"${keyToRemove}"** n'a été trouvé sur ce message.`);
            }

            // 3. Mettre à jour le message sur Discord (s'il ne reste plus de lignes, on passe components à un tableau vide)
            await message.edit({
                components: newRows.length > 0 ? newRows : []
            });

            // 4. Nettoyer le fichier translations.json pour supprimer la traduction associée
            if (fs.existsSync(filePath)) {
                let translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (translations[keyToRemove]) {
                    delete translations[keyToRemove];
                    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
                }
            }

            await interaction.editReply(`✅ Succès ! Le bouton associé à la clé **"${keyToRemove}"** a été supprimé du message et de la base de données.`);
        } catch (error) {
            console.error("Erreur lors de la suppression du bouton :", error);
            await interaction.editReply("❌ Une erreur est survenue (Vérifie l'ID du message et les permissions du bot).");
        }
    },
};

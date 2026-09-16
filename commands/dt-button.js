const { SlashCommandBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const supabase = require('../supabase'); // Import direct de ton fichier supabase.js à la racine

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
                .setDescription('La clé unique du bouton à supprimer')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const messageId = interaction.options.getString('message_id');
        const keyToRemove = interaction.options.getString('key');
        const targetCustomId = `translate_${keyToRemove}`;

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID." });
            }

            if (!message.components || message.components.length === 0) {
                return interaction.editReply({ content: "❌ Ce message ne contient aucun bouton." });
            }

            let buttonFound = false;
            let newRows = [];

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
                return interaction.editReply({ content: `❌ Aucun bouton avec la clé **"${keyToRemove}"** n'a été trouvé.` });
            }

            await message.edit({
                components: newRows.length > 0 ? newRows : []
            });

            // Suppression de la ligne dans Supabase
            const { error: dbError } = await supabase
                .from('button_translations')
                .delete()
                .eq('key', keyToRemove);

            if (dbError) {
                console.error("Erreur Supabase delete :", dbError);
            }

            await interaction.editReply({ content: `✅ Succès ! Le bouton associé à la clé **"${keyToRemove}"** a été supprimé.` });
        } catch (error) {
            console.error("Erreur lors de la suppression du bouton :", error);
            await interaction.editReply({ content: "❌ Une erreur est survenue." });
        }
    },
};

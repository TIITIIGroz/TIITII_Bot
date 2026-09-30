const { SlashCommandBuilder, ActionRowBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const supabase = require('../supabase');

// ID du salon où envoyer les notifications de suppression
const LOG_CHANNEL_ID = '1553085810369237132';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dt-button')
        .setDescription('Retire un bouton d\'un message grâce à sa key unique')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Le salon où se trouve le message contenant le bouton')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message contenant le bouton')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('key')
                .setDescription('La key unique du bouton à supprimer')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const targetChannel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const keyToRemove = interaction.options.getString('key').trim().toLowerCase();
        const targetCustomId = `translate_${keyToRemove}`;

        try {
            if (!targetChannel.isTextBased()) {
                return interaction.editReply({ content: "❌ Le salon sélectionné doit être un salon textuel." });
            }

            const message = await targetChannel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID dans ce salon." });
            }

            if (!message.components || message.components.length === 0) {
                return interaction.editReply({ content: "❌ Ce message ne contient aucun bouton." });
            }

            let buttonFound = false;
            let buttonName = "Inconnu";
            let newRows = [];

            for (let row of message.components) {
                let actionRow = ActionRowBuilder.from(row);
                
                let filteredComponents = actionRow.components.filter(component => {
                    if (component.data.custom_id === targetCustomId) {
                        buttonFound = true;
                        if (component.data.label) {
                            buttonName = component.data.label;
                        }
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
                return interaction.editReply({ content: `❌ Aucun bouton avec la key **"${keyToRemove}"** n'a été trouvé sur ce message.` });
            }

            await message.edit({
                components: newRows.length > 0 ? newRows : []
            });

            const { error: dbError } = await supabase
                .from('button_translations')
                .delete()
                .eq('key', keyToRemove);

            if (dbError) {
                console.error("Erreur Supabase delete :", dbError);
            }

            try {
                const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
                if (logChannel) {
                    await logChannel.send(
                        `🗑️ **Suppression d'un bouton :**\n` +
                        `> **Nom du bouton :** ${buttonName}\n` +
                        `> **Key :** \`${keyToRemove}\`\n` +
                        `> **Salon :** #${targetChannel.name} (\`${targetChannel.id}\`)\n` +
                        `> **ID du message :** \`${messageId}\`\n\n` +
                        `------------------------------------------------`
                    );
                }
            } catch (logError) {
                console.error("Impossible d'envoyer le message de log de suppression :", logError);
            }

            await interaction.editReply({ content: `✅ Succès ! Le bouton associé à la key **"${keyToRemove}"** a bien été supprimé du salon #${targetChannel.name}.` });
        } catch (error) {
            console.error("Erreur lors de la suppression du bouton :", error);
            await interaction.editReply({ content: "❌ Une erreur est survenue (vérifie l'ID du message et les permissions du bot)." });
        }
    },
};

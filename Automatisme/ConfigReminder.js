const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
    const targetChannelId = '1534224381109076172';

    // Fonction pour créer le bouton interactif de suppression
    const createDeleteButton = () => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('delete_reminder')
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Success) // Bouton vert
                .setEmoji('✅')
        );
    };

    // Détection d'un nouveau salon
    client.on(Events.ChannelCreate, async (channel) => {
        if (!channel.guild) return;
        try {
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                await targetChannel.send({
                    content: `**Nouveau salon détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Nom :** \`${channel.name}\`\n> **ID :** \`${channel.id}\`\n ------------------------------------------------`,
                    components: [createDeleteButton()]
                });
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'alerte salon :", error);
        }
    });

    // Détection d'un nouveau rôle
    client.on(Events.GuildRoleCreate, async (role) => {
        try {
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                await targetChannel.send({
                    content: `**Nouveau rôle détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Nom :** \`${role.name}\`\n> **ID :** \`${role.id}\``,
                    components: [createDeleteButton()]
                });
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'alerte rôle :", error);
        }
    });

    // Gestion du clic sur le bouton pour supprimer le message
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.customId === 'delete_reminder') {
            try {
                await interaction.message.delete();
            } catch (error) {
                console.error("Erreur lors de la suppression du message d'alerte :", error);
            }
        }
    });
};

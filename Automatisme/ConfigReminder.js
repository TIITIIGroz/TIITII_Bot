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
                    content: `**Nouveau salon détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Salon :** <#${channel.id}>\n> **Nom :** \`${channel.name}\`\n> **ID :** \`${channel.id}\`\n ------------------------------------------------`,
                    components: [createDeleteButton()]
                });
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'alerte salon :", error);
        }
    });
    
    // Détection d'un nouveau rôle (avec un délai et un fetch API pour attraper le renommage)
    client.on(Events.GuildRoleCreate, async (role) => {
        setTimeout(async () => {
            try {
                // Va chercher les données fraîches directement auprès de Discord
                const freshRole = await role.guild.roles.fetch(role.id).catch(() => role);
                const targetChannel = await client.channels.fetch(targetChannelId);
                
                if (targetChannel) {
                    await targetChannel.send({
                        content: `**Nouveau rôle détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Mention :** <@&${freshRole.id}>\n> **ID :** \`${freshRole.id}\`------------------------------------------------`,
                        components: [createDeleteButton()]
                    });
                }
            } catch (error) {
                console.error("Erreur lors de l'envoi de l'alerte rôle :", error);
            }
        }, 1500); // Attend 1.5 seconde pour laisser le temps de renommer
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

const { Events } = require('discord.js');

module.exports = (client) => {
    const targetChannelId = '1534224381109076172';

    // Détection d'un nouveau salon
    client.on(Events.ChannelCreate, async (channel) => {
        if (!channel.guild) return;
        try {
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                await targetChannel.send(`⚠️ **Nouveau salon détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Nom :** \`${channel.name}\`\n> **ID :** \`${channel.id}\``);
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
                await targetChannel.send(`⚠️ **Nouveau rôle détecté !** Pense à l'ajouter dans \`config.js\` :\n> **Nom :** \`${role.name}\`\n> **ID :** \`${role.id}\``);
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'alerte rôle :", error);
        }
    });
};

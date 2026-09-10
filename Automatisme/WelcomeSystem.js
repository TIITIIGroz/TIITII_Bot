const { Events, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = (client) => {
    const welcomeChannelId = '894671498965561394'; // Salon avec la photo
    const notificationChannelId = '1534224381109076172'; // Salon pour le message textuel (Config/Alertes ou autre)

    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            // 1. Envoi de l'image et du message dans le salon de bienvenue
            const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
            if (welcomeChannel) {
                const imagePath = path.join(__dirname, '../images/Welcome.png'); 
                const attachment = new AttachmentBuilder(imagePath, { name: 'Welcome.png' });
                const welcomeMessage = `Bienvenu(e) ! ${member} vient de nous rejoindre ! 🎉`;

                await welcomeChannel.send({
                    content: welcomeMessage,
                    files: [attachment]
                });
            }

            // 2. Envoi du message spécial dans l'autre salon
            const notificationChannel = await member.guild.channels.fetch(notificationChannelId).catch(() => null);
            if (notificationChannel) {
                await notificationChannel.send(`${member} vient d'arriver dans le royaume, dites lui bienvenu(e) et bonjour !`);
            }
        } catch (error) {
            console.error("Erreur lors de l'envoi du message de bienvenue :", error);
        }
    });
};

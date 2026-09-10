const { Events, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = (client) => {
    const welcomeChannelId = '894671498965561394';

    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            const channel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
            if (!channel) return;

            // Chemin vers ton image locale dans le dossier images/
            const imagePath = path.join(__dirname, '../images/Welcome.png'); 
            const attachment = new AttachmentBuilder(imagePath, { name: 'Welcome.png' });

            // Modifie ton message de bienvenue ici selon tes envies
            const welcomeMessage = `Bienvenu(e) ! ${member} vient de nous rejoindre !🍟`;

            await channel.send({
                content: welcomeMessage,
                files: [attachment]
            });
        } catch (error) {
            console.error("Erreur lors de l'envoi du message de bienvenue :", error);
        }
    });
};

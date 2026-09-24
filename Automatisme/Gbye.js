const { Events, EmbedBuilder } = require("discord.js");

module.exports = (client) => {
    // ⚙️ CONFIGURATION : Modifie ces IDs selon ton serveur
    const GOODBYE_CHANNEL_ID = "894671801676869742";

    client.on(Events.GuildMemberRemove, async (member) => {
        try {
            const guild = member.guild;
            const channel = guild.channels.cache.get(GOODBYE_CHANNEL_ID);
            
            if (!channel) return;

            // Récupération des infos du membre qui part
            const username = member.user.username;
            const memberCount = guild.memberCount;

            // Création de l'Embed de départ
            const goodbyeEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Rouge pour les départs (ou une autre couleur de ton choix)
                .setDescription(`**${username}** a quitté le serveur. On espère te revoir bientôt ! - **${username}** left the server. I hope we see you soon :`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .setTimestamp();

            // Envoi du message dans le salon configuré
            await channel.send({ embeds: [goodbyeEmbed] });

        } catch (err) {
            console.error("❌ Erreur dans le système de Goodbye :", err);
        }
    });
};

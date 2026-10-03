const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut-me')
        .setDescription('Affiche un récapitulatif complet de tes informations sur le serveur'),
    
    async execute(interaction) {
        await interaction.deferReply(); // Devient public pour tout le salon

        const member = interaction.member;
        const user = interaction.user;

        // Récupération des rôles (en retirant le rôle @everyone)
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString());

        const rolesList = roles.length > 0 ? roles.join(', ') : 'Aucun rôle';

        // Formatage des dates d'arrivée sur le serveur et de création du compte
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const createdAt = Math.floor(user.createdTimestamp / 1000);

        // Construction de l'embed
        const statusEmbed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#5865F2')
            .setTitle(`📊 Statut de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 Nom d\'utilisateur', value: `${user.tag}`, inline: true },
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '🏷️ Surnom (Pseudo)', value: member.nickname ? member.nickname : 'Aucun', inline: true },
                { name: '📅 Compte créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                { name: '📥 Arrivé sur le serveur le', value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false },
                { name: `🛡️ Rôles (${roles.length})`, value: rolesList.length > 1024 ? 'Trop de rôles pour être affichés' : rolesList, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${user.username}`, iconURL: user.displayAvatarURL() });

        await interaction.editReply({ embeds: [statusEmbed] });
    },
};

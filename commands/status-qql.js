const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status-qql')
        .setDescription('Affiche un récapitulatif complet des informations d\'un membre')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre dont tu veux voir les informations')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('membre');
        const member = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Si le membre n'est pas sur le serveur
        if (!member) {
            return interaction.editReply({ content: "❌ Impossible de trouver ce membre sur le serveur." });
        }

        // Récupération des rôles (en retirant le rôle @everyone)
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString());

        const rolesList = roles.length > 0 ? roles.join(', ') : 'Aucun rôle';

        // Formatage des dates d'arrivée sur le serveur et de création du compte
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);
        const createdAt = Math.floor(targetUser.createdTimestamp / 1000);

        // Construction de l'embed
        const statusEmbed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#5865F2')
            .setTitle(`📊 Statut de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 Nom d\'utilisateur', value: `${targetUser.tag}`, inline: true },
                { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '🏷️ Surnom (Pseudo)', value: member.nickname ? member.nickname : 'Aucun', inline: true },
                { name: '📅 Compte créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                { name: '📥 Arrivé sur le serveur le', value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false },
                { name: `🛡️ Rôles (${roles.length})`, value: rolesList.length > 1024 ? 'Trop de rôles pour être affichés' : rolesList, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [statusEmbed] });
    },
};

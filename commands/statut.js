const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut')
        .setDescription('Affiche un récapitulatif complet de tes informations (ou celui d\'un autre membre)')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Voir tes informations (ou celui d\'un membre  optionnel)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();

        // Récupération de la cible : soit la personne mentionnée, soit l'auteur de la commande par défaut
        const targetUser = interaction.options.getUser('membre') || interaction.user;
        const targetMember = interaction.guild.members.cache.get(targetUser.id) || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Si le membre n'est pas trouvé sur le serveur
        if (!targetMember) {
            return interaction.editReply({ content: "❌ Impossible de trouver ce membre sur le serveur." });
        }

        // Récupération des rôles (en retirant le rôle @everyone)
        const roles = targetMember.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString());

        const rolesList = roles.length > 0 ? roles.join(', ') : 'Aucun rôle';

        // Formatage des dates d'arrivée sur le serveur et de création du compte
        const joinedAt = Math.floor(targetMember.joinedTimestamp / 1000);
        const createdAt = Math.floor(targetUser.createdTimestamp / 1000);

        // Construction de l'embed
        const statusEmbed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor || '#5865F2')
            .setTitle(`📊 Statut de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👤 Nom d\'utilisateur', value: `${targetUser.tag}`, inline: true },
                { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
                { name: '🏷️ Surnom (Pseudo)', value: targetMember.nickname ? targetMember.nickname : 'Aucun', inline: true },
                { name: '📅 Compte créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                { name: '📥 Arrivé sur le serveur le', value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false },
                { name: `🛡️ Rôles (${roles.length})`, value: rolesList.length > 1024 ? 'Trop de rôles pour être affichés' : rolesList, inline: false }
            )
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻II_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })

        await interaction.editReply({ embeds: [statusEmbed] });
    },
};

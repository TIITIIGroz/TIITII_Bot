const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut')
        .setDescription('Affiche un récapitulatif complet de tes informations (ou celui d\'un autre membre)')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Voir tes informations (ou celui d\'un membre optionnel)')
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

        // Récupération des rôles (en retirant le rôle @everyone) triés par hiérarchie
        const roles = targetMember.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString());

        const hasRoles = roles.length > 0;
        const itemsPerPage = 15; // Nombre de rôles par page
        const totalPages = hasRoles ? Math.ceil(roles.length / itemsPerPage) : 1;
        let currentPage = 0;

        // Formatage des dates d'arrivée sur le serveur et de création du compte
        const joinedAt = Math.floor(targetMember.joinedTimestamp / 1000);
        const createdAt = Math.floor(targetUser.createdTimestamp / 1000);

        const generateEmbed = (page) => {
            let currentRolesText = 'Aucun rôle';
            if (hasRoles) {
                const start = page * itemsPerPage;
                currentRolesText = roles.slice(start, start + itemsPerPage).join(', ');
            }

            const embed = new EmbedBuilder()
                .setColor(targetMember.displayHexColor || '#5865F2')
                .setTitle(`📊 Statut de ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '👤 Nom d\'utilisateur', value: `${targetUser.tag}`, inline: true },
                    { name: '🆔 ID', value: `\`${targetUser.id}\``, inline: true },
                    { name: '🏷️ Surnom (Pseudo)', value: targetMember.nickname ? targetMember.nickname : 'Aucun', inline: true },
                    { name: '📅 Compte créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                    { name: '📥 Arrivé sur le serveur le', value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false },
                    { name: `🛡️ Rôles (${roles.length})`, value: currentRolesText, inline: false }
                )
                .setFooter({ text: `Rôles page ${page + 1}/${totalPages} • /Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

            return embed;
        };

        const generateRow = (page) => {
            if (totalPages <= 1) return null; // Pas besoin de boutons s'il n'y a qu'une seule page de rôles

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_user_roles')
                    .setLabel('◀️ Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_user_roles')
                    .setLabel('Suivant ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const row = generateRow(currentPage);
        const messagePayload = {
            embeds: [generateEmbed(currentPage)],
            components: row ? [row] : []
        };

        const message = await interaction.editReply(messagePayload);

        // Si pas assez de rôles pour paginer, on s'arrête là
        if (totalPages <= 1) return;

        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "❌ Tu ne peux pas utiliser ces boutons.", ephemeral: true });
            }

            if (i.customId === 'prev_user_roles') {
                currentPage = Math.max(currentPage - 1, 0);
            } else if (i.customId === 'next_user_roles') {
                currentPage = Math.min(currentPage + 1, totalPages - 1);
            }

            const newRow = generateRow(currentPage);
            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: newRow ? [newRow] : []
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    },
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-salons')
        .setDescription('Affiche la liste de tous les identifiants des salons du serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        // Récupérer tous les salons, filtrer pour enlever les catégories (GuildCategory), et trier par position
        const channels = Array.from(guild.channels.cache
            .filter(channel => channel.type !== 4) // Type 4 correspond aux catégories
            .sort((a, b) => {
                if (a.rawPosition !== b.rawPosition) return a.rawPosition - b.rawPosition;
                return a.position - b.position;
            }).values());

        if (channels.length === 0) {
            return interaction.reply({
                content: "Aucun salon trouvé sur ce serveur.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Configuration de la pagination (par exemple 10 salons par page)
        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(channels.length / ITEMS_PER_PAGE);
        let page = 1;

        const generateEmbed = (pageNum) => {
            const start = (pageNum - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentChannels = channels.slice(start, end);

            let salonListText = "";

            currentChannels.forEach(channel => {
                let icon = "💬";
                if (channel.isVoiceBased()) icon = "🔊";
                else if (channel.isThread()) icon = "🧵";

                // Affiche le nom complet du salon
                salonListText += `${icon} **${channel.name}** : \`${channel.id}\`\n`;
            });

            return new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`📋 Identifiants des salons (Page ${pageNum}/${totalPages})`)
                .setDescription(salonListText)
                .setTimestamp();
        };

        const generateRow = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`salons_prev_${currentPage}`)
                    .setLabel('◀ Précédent')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`salons_next_${currentPage}`)
                    .setLabel('Suivant ▶')
                    .setStyle(ButtonStyle.Primary)
            );
        };

        // Réponse initiale (Éphémère car réservée aux admins)
        await interaction.reply({
            embeds: [generateEmbed(page)],
            components: [generateRow(page)],
            flags: [MessageFlags.Ephemeral]
        });

        // Collecteur pour les boutons de pagination
        const filter = i => i.customId.startsWith('salons_prev_') || i.customId.startsWith('salons_next_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 }); // 15 minutes d'expiration

        collector.on('collect', async i => {
            // Vérification de sécurité : seul l'auteur de la commande peut cliquer
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "Vous ne pouvez pas utiliser ces boutons.", flags: [MessageFlags.Ephemeral] });
            }

            const parts = i.customId.split('_');
            const action = parts[1]; // prev ou next
            let currentPage = parseInt(parts[2]);

            if (action === 'next') {
                currentPage++;
                if (currentPage > totalPages) currentPage = 1; // Boucle au début
            } else if (action === 'prev') {
                currentPage--;
                if (currentPage < 1) currentPage = totalPages; // Boucle à la fin
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateRow(currentPage)]
            }).catch(() => {});
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('salons_prev_expired').setLabel('◀ Précédent').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('salons_next_expired').setLabel('Suivant ▶').setStyle(ButtonStyle.Primary).setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};

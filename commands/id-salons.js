const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-salons')
        .setDescription('Affiche la liste de tous les identifiants des salons du serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        // Récupérer et trier les salons en fonction de leur position réelle visible sur le serveur
        const channels = Array.from(guild.channels.cache
            .filter(channel => channel.type !== 4) // Exclure les catégories elles-mêmes
            .sort((a, b) => {
                // Tri par position dans la catégorie / le serveur
                if (a.parentID !== b.parentID) {
                    const parentA = guild.channels.cache.get(a.parentID);
                    const parentB = guild.channels.cache.get(b.parentID);
                    if (parentA && parentB) {
                        return parentA.position - parentB.position;
                    }
                }
                return a.rawPosition - b.rawPosition;
            }).values());

        if (channels.length === 0) {
            return interaction.reply({
                content: "Aucun salon trouvé sur ce serveur.",
                flags: [MessageFlags.Ephemeral]
            });
        }

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

                // Affiche le nom complet du salon dans l'ordre exact du serveur
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

        await interaction.reply({
            embeds: [generateEmbed(page)],
            components: [generateRow(page)],
            flags: [MessageFlags.Ephemeral]
        });

        const filter = i => i.customId.startsWith('salons_prev_') || i.customId.startsWith('salons_next_');
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 900000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "Vous ne pouvez pas utiliser ces boutons.", flags: [MessageFlags.Ephemeral] });
            }

            const parts = i.customId.split('_');
            const action = parts[1];
            let currentPage = parseInt(parts[2]);

            if (action === 'next') {
                currentPage++;
                if (currentPage > totalPages) currentPage = 1;
            } else if (action === 'prev') {
                currentPage--;
                if (currentPage < 1) currentPage = totalPages;
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

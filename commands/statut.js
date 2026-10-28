const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut')
        .setDescription('Affiche la liste des rôles du serveur par pages'),

    async execute(interaction) {
        await interaction.deferReply();

        const roles = interaction.guild.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} (\`${r.members.size} membres\`)`);

        if (roles.length === 0) {
            return interaction.editReply({ content: "❌ Aucun rôle trouvé sur ce serveur." });
        }

        const itemsPerPage = 10;
        const totalPages = Math.ceil(roles.length / itemsPerPage);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const start = page * itemsPerPage;
            const currentRoles = roles.slice(start, start + itemsPerPage).join('\n');

            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`🛡️ Liste des rôles de ${interaction.guild.name}`)
                .setDescription(currentRoles)
                .setFooter({ text: `Rôles page ${page + 1}/${totalPages} • /Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛` });
        };

        const generateRow = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev_roles')
                    .setLabel('◀️ Précédent')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next_roles')
                    .setLabel('Suivant ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const message = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [generateRow(currentPage)]
        });

        const collector = message.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "❌ Tu ne peux pas utiliser ces boutons.", ephemeral: true });
            }

            if (i.customId === 'prev_roles') {
                currentPage = Math.max(currentPage - 1, 0);
            } else if (i.customId === 'next_roles') {
                currentPage = Math.min(currentPage + 1, totalPages - 1);
            }

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateRow(currentPage)]
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};

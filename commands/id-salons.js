const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-salons')
        .setDescription('Affiche la liste de tous les identifiants des salons du serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;

        // Récupérer toutes les catégories triées par leur position
        const categories = guild.channels.cache
            .filter(c => c.type === 4) // Type 4 = GuildCategory
            .sort((a, b) => a.position - b.position);

        const channels = [];

        // 1. Ajouter d'abord les salons en dehors de toute catégorie
        const uncategorizedChannels = guild.channels.cache
            .filter(c => c.type !== 4 && !c.parentId)
            .sort((a, b) => a.position - b.position);
        
        channels.push(...uncategorizedChannels.values());

        // 2. Parcourir chaque catégorie dans l'ordre et récupérer ses salons triés par position
        categories.forEach(category => {
            const categoryChannels = guild.channels.cache
                .filter(c => c.type !== 4 && c.parentId === category.id)
                .sort((a, b) => a.position - b.position);

            channels.push(...categoryChannels.values());
        });

        // 3. Ajouter les éventuels salons restants par sécurité
        const remainingChannels = guild.channels.cache
            .filter(c => c.type !== 4 && !channels.includes(c))
            .sort((a, b) => a.position - b.position);
        
        channels.push(...remainingChannels.values());

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

                salonListText += `${icon} **${channel.name}** : \`${channel.id}\`\n`;
            });

            return new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`📋 Identifiants des salons (Page ${pageNum}/${totalPages})`)
                .setDescription(salonListText)
                .setFooter({ text: "Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛" })
        };

        // Boutons minimalistes : uniquement les flèches
        const generateRow = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`salons_prev_${currentPage}`)
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`salons_next_${currentPage}`)
                    .setLabel('▶')
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
                new ButtonBuilder().setCustomId('salons_prev_expired').setLabel('◀').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('salons_next_expired').setLabel('▶').setStyle(ButtonStyle.Primary).setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    },
};

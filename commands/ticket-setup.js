const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Envoie le panneau de configuration des tickets (FR / EN).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Support & Tickets | Help Desk')
            .setDescription(
                '🇫🇷 **Besoin d\'aide ?** Clique sur ce bouton pour ouvrir un ticket en français.\n\n' +
                '🇬🇧 **Need help?** Click this button to open an English ticket.'
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_fr')
                .setLabel('Ouvrir un ticket (FR)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🇫🇷'),
            new ButtonBuilder()
                .setCustomId('create_ticket_en')
                .setLabel('Open a ticket (EN)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🇬🇧')
        );

        await interaction.reply({
            content: "✅ Panneau de tickets bilingue configuré avec succès !",
            flags: [MessageFlags.Ephemeral]
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
};

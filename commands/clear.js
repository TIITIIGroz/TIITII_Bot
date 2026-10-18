const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime des messages / Delete messages')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const count = interaction.options.getInteger('nombre');

        await interaction.deferReply({ ephemeral: true });

        try {
            const deleted = await interaction.channel.bulkDelete(count, true);

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setDescription(`🗑️ **${deleted.size}** messages ont été supprimés avec succès ! / Successfully deleted ${deleted.size} messages!`);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Erreur lors de la suppression des messages (les messages de plus de 14 jours ne peuvent pas être supprimés en masse).' });
        }
    },
};

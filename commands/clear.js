const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Supprime des messages avec des filtres avancés')
        .addIntegerOption(option =>
            option.setName('nombre')
                .setDescription('Nombre de messages à analyser/supprimer (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true))
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('Supprimer uniquement les messages de cet utilisateur (optionnel)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('filtre')
                .setDescription('Filtrer par type de message (optionnel)')
                .setRequired(false)
                .addChoices(
                    { name: 'Liens uniquement', value: 'links' },
                    { name: 'Bots uniquement', value: 'bots' },
                    { name: 'Fichiers / Images uniquement', value: 'attachments' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const count = interaction.options.getInteger('nombre');
        const targetUser = interaction.options.getUser('utilisateur');
        const filterType = interaction.options.getString('filtre');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            // Récupérer les messages du salon
            const fetchedMessages = await interaction.channel.messages.fetch({ limit: 100 });
            let messagesToDelete = Array.from(fetchedMessages.values());

            // 1. Filtrer par utilisateur si spécifié
            if (targetUser) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
            }

            // 2. Filtrer par type si spécifié
            if (filterType === 'links') {
                messagesToDelete = messagesToDelete.filter(msg => msg.content.includes('http://') || msg.content.includes('https://') || msg.content.includes('discord.gg/'));
            } else if (filterType === 'bots') {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.bot);
            } else if (filterType === 'attachments') {
                messagesToDelete = messagesToDelete.filter(msg => msg.attachments.size > 0);
            }

            // Limiter au nombre demandé par l'administrateur
            messagesToDelete = messagesToDelete.slice(0, count);

            if (messagesToDelete.length === 0) {
                return await interaction.editReply({
                    content: '❌ Aucun message ne correspond aux critères spécifiés parmi les messages récents.'
                });
            }

            // Suppression en masse sécurisée
            const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

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

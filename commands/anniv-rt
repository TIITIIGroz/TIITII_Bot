const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-rt')
        .setNameLocalizations({
            'en-US': 'bday-rm',
            'en-GB': 'bday-rm'
        })
        .setDescription('Retire ta date d\'anniversaire enregistrée')
        .setDescriptionLocalizations({
            'en-US': 'Remove your registered birthday date',
            'en-GB': 'Remove your registered birthday date'
        }),
    async execute(interaction) {
        const userId = interaction.user.id;

        try {
            const { error } = await supabase
                .from('birthdays')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            await interaction.reply({
                content: "✅ Ton anniversaire a bien été supprimé de la base de données.",
                flags: [MessageFlags.Ephemeral]
            });
        } catch (err) {
            console.error("Erreur bday-rm :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la suppression.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-rt')
        .setDescription('Retire ta date d\'anniversaire enregistrée'),
    async execute(interaction) {
        const FRENCH_ROLE_ID = "1094758355085574204";
        if (!interaction.member.roles.cache.has(FRENCH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ Cette commande est réservée aux membres ayant le rôle de langue française.",
                flags: [MessageFlags.Ephemeral]
            });
        }

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
            console.error("Erreur anniv-rt :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la suppression.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = '../supabase';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bday-rm')
        .setDescription('Remove your registered birthday date'),
    async execute(interaction) {
        const ENGLISH_ROLE_ID = "1094758180938067989";
        if (!interaction.member.roles.cache.has(ENGLISH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ This command is restricted to members with the English language role.",
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
                content: "✅ Your birthday has been successfully removed from the database.",
                flags: [MessageFlags.Ephemeral]
            });
        } catch (err) {
            console.error("Erreur bday-rm :", err);
            await interaction.reply({
                content: "❌ An error occurred while deleting.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const supabase = '../supabase';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-anniv')
        .setDescription('Paramètres administrateur pour le système d\'anniversaire')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('supprimer')
                .setDescription('Supprime l\'anniversaire d\'un utilisateur spécifique')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur dont tu veux supprimer l\'anniversaire')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'supprimer') {
            const targetUser = interaction.options.getUser('utilisateur');

            try {
                const { error } = await supabase
                    .from('birthdays')
                    .delete()
                    .eq('user_id', targetUser.id);

                if (error) throw error;

                await interaction.reply({
                    content: `✅ L'anniversaire de ${targetUser} a été supprimé avec succès par un administrateur.`,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (err) {
                console.error("Erreur admin-anniv :", err);
                await interaction.reply({
                    content: "❌ Une erreur est survenue.",
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }
    }
};

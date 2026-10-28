const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('init-members')
        .setDescription('Marque les membres actuels du cache comme déjà accueillis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [1 << 6] }); // Éphémère

        const guild = interaction.guild;

        try {
            // Utilise uniquement le cache actuel du bot pour éviter tout Rate Limit de l'API Discord
            const members = guild.members.cache.filter(m => !m.user.bot);
            const userIds = Array.from(members.keys());

            if (userIds.length === 0) {
                return await interaction.editReply({ content: "⚠️ Aucun membre trouvé dans le cache du bot pour le moment." });
            }

            // Enregistrement direct dans Supabase
            const { error } = await supabase.rpc('initialize_existing_members', {
                p_user_ids: userIds,
                p_guild_id: guild.id
            });

            if (error) throw error;

            await interaction.editReply({ 
                content: `✅ **${userIds.length} membres** du cache ont été enregistrés en BDD avec succès ! Ils ne recevront aucun message d'accueil lors de leurs futurs changements de rôles.` 
            });

        } catch (err) {
            console.error("Erreur lors de l'initialisation des membres :", err);
            await interaction.editReply({ content: "❌ Une erreur est survenue lors de l'initialisation." });
        }
    }
};

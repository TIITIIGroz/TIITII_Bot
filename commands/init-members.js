const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('init-members')
        .setDescription('Marque la totalité des membres du serveur comme déjà accueillis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [1 << 6] }); // Éphémère

        const guild = interaction.guild;

        try {
            // 1. Récupération progressive des membres pour éviter le Rate Limit Discord
            await guild.members.fetch({ time: 60000 }); // Attend la synchronisation du cache
            const allMembers = Array.from(guild.members.cache.values());
            const userIds = allMembers.filter(m => !m.user.bot).map(m => m.id);

            if (userIds.length === 0) {
                return await interaction.editReply({ content: "⚠️ Aucun membre trouvé." });
            }

            // 2. Découpage en paquets de 100 membres max par sécurité
            const chunkSize = 100;
            let insertedCount = 0;

            for (let i = 0; i < userIds.length; i += chunkSize) {
                const chunk = userIds.slice(i, i + chunkSize);

                const { error } = await supabase.rpc('initialize_existing_members', {
                    p_user_ids: chunk,
                    p_guild_id: guild.id
                });

                if (error) throw error;
                insertedCount += chunk.length;
            }

            await interaction.editReply({ 
                content: `✅ **${insertedCount} membres** (sur les ${guild.memberCount} du serveur) ont été enregistrés en BDD ! Ils ne recevront aucun message d'accueil en cas de changement de rôles.` 
            });

        } catch (err) {
            console.error("Erreur lors de l'initialisation complète des membres :", err);
            await interaction.editReply({ content: "❌ Une erreur est survenue lors de l'initialisation." });
        }
    }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../systems/levels/database'); // Ton pool PostgreSQL pour requêter directement la BDD
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('init-members')
        .setDescription('Marque tous les membres enregistrés comme déjà accueillis')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ flags: [1 << 6] });

        const guild = interaction.guild;
        
        try {
            // Au lieu de fetch tous les membres via Discord (ce qui plante à cause du rate limit),
            // on récupère tous les user_id uniques qui ont déjà un profil dans ta table de niveaux/messages !
            const dbUsersQuery = await pool.query(
                `SELECT DISTINCT userid FROM users WHERE guildid = $1`,
                [guild.id]
            );

            const userIds = dbUsersQuery.rows.map(row => row.userid);

            if (userIds.length === 0) {
                return await interaction.editReply({ content: "⚠️ Aucun utilisateur trouvé dans la base de données des niveaux pour ce serveur." });
            }

            // Appel de la fonction Supabase pour enregistrer tous ces utilisateurs d'un coup
            const { error } = await supabase.rpc('initialize_existing_members', {
                p_user_ids: userIds,
                p_guild_id: guild.id
            });

            if (error) throw error;

            await interaction.editReply({ 
                content: `✅ **${userIds.length} membres actifs** ont été enregistrés en BDD avec succès ! Ils ne recevront plus de messages d'accueil en cas de changement de rôle.` 
            });
        } catch (err) {
            console.error("Erreur lors de l'initialisation des membres :", err);
            await interaction.editReply({ content: "❌ Une erreur est survenue lors de l'initialisation." });
        }
    }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../supabase'); // Assure-toi que le chemin est correct

module.exports = {
    data: new SlashCommandBuilder()
        .setName('init-members')
        .setDescription('Marque tous les membres actuels comme déjà accueillis pour éviter le spam')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Cache la commande et restreint l'accès aux admins

    async execute(interaction) {
        // Réponse éphémère : invisible pour les autres membres du salon
        await interaction.deferReply({ flags: [1 << 6] }); 

        const guild = interaction.guild;
        
        try {
            // On récupère tous les membres du serveur
            const members = await guild.members.fetch();
            const userIds = members.filter(m => !m.user.bot).map(m => m.id);

            // Appel de la fonction Supabase pour enregistrer tout le monde d'un coup
            const { error } = await supabase.rpc('initialize_existing_members', {
                p_user_ids: userIds,
                p_guild_id: guild.id
            });

            if (error) throw error;

            await interaction.editReply({ 
                content: `✅ **${userIds.length} membres** actuels ont été enregistrés en BDD ! Ils ne recevront plus aucun message d'accueil/langue lors de leurs futurs changements de rôles.` 
            });
        } catch (err) {
            console.error("Erreur lors de l'initialisation des membres :", err);
            await interaction.editReply({ content: "❌ Une erreur est survenue lors de l'initialisation." });
        }
    }
};

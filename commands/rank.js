const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Affiche ton niveau et ton XP total (ou celui d\'un autre membre)')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre dont tu veux voir le rang')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const { database: pool } = require('../systems/levels');
        const { getLevelProgress } = require('../systems/levels/level'); 
        
        const targetMember = interaction.options.getMember('membre') || interaction.member;
        const userId = targetMember.id;
        const guildId = interaction.guild.id;

        try {
            const res = await pool.query(
                `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
                [userId, guildId]
            );

            const row = res.rows[0];
            const userData = row || { totalxp: 0, level: 0 };

            const currentTotalXp = parseInt(userData.totalxp) || 0;
            
            // On utilise getLevelProgress pour obtenir les détails du palier
            const progress = getLevelProgress(currentTotalXp);
            const currentLevel = progress.level;
            const nextLevel = currentLevel + 1;
            const currentLevelXp = progress.currentXp; // XP dans le niveau actuel
            const xpRemaining = progress.requiredXp - progress.currentXp; // Ce qu'il reste pour le prochain niveau

            const rankMessage = `***<@${userId}>*** !\n\n` +
                `Tu es au **niveau ${currentLevel}** avec un total de __${currentTotalXp}__ xp (__${currentLevelXp}__ dans ce niveau) ! Il te reste __${xpRemaining}__ xp à avoir pour être au __niveau ${nextLevel}__ !\n\n` +
                `You're at **level ${currentLevel}** with a total of __${currentTotalXp}__ xp (__${currentLevelXp}__ in this level)! There's still __${xpRemaining}__ xp left to have in order to be at __level ${nextLevel}__ !`;

            await interaction.editReply({ content: rankMessage });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du rank :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération de ton rang.");
        }
    },
};

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Affiche ton niveau et ton XP actuel (ou celui d\'un autre membre)')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre dont tu veux voir le rang')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply();
        const { database: pool } = require('../systems/levels');
        const { getXpForLevel } = require('../systems/levels/level'); 
        
        const targetMember = interaction.options.getMember('membre') || interaction.member;
        const userId = targetMember.id;
        const guildId = interaction.guild.id;

        try {
            const res = await pool.query(
                `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
                [userId, guildId]
            );

            const row = res.rows[0];
            const userData = row || { xp: 0, totalXp: 0, level: 0, messages: 0 };

            const currentLevel = parseInt(userData.level) || 0;
            const currentTotalXp = parseInt(userData.totalxp) || 0;
            const nextLevel = currentLevel + 1;

            const xpNeededForNext = getXpForLevel(currentLevel);
            const xpRemaining = Math.max(0, xpNeededForNext - currentTotalXp);

            // Utilisation de __ pour souligner (underline) au lieu de _ (italique)
            const rankMessage = `***<@${userId}>*** !\n\n` +
                `Tu es au niveau __${currentLevel}__ ! Il te reste __${xpRemaining}__xp à avoir pour être au niveau __${nextLevel}__ !\n\n` +
                `You're at level __${currentLevel}__ ! There's still __${xpRemaining}__xp left to have in order to be at level __${nextLevel}__ !`;

            await interaction.editReply({ content: rankMessage });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du rank :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération de ton rang.");
        }
    },
};

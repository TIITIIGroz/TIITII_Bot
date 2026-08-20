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
        // On importe getXpForLevel directement depuis ton fichier level.js
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

            // Calcul exact de l'XP requis pour le prochain niveau avec ta formule MEE6
            const xpNeededForNext = getXpForLevel(currentLevel);
            const xpRemaining = Math.max(0, xpNeededForNext - currentTotalXp);

            // Message texte formaté selon ta demande exacte
            const rankMessage = `***<@${userId}>*** !\n\n` +
                `Tu es au _niveau ***${currentLevel}***_ ! Il te reste _ ${xpRemaining} _xp à avoir pour être au _niveau ***${nextLevel}***_ !\n\n` +
                `You're at _level ***${currentLevel}***_ ! There's still _ ${xpRemaining} _xp left to have in order to be at _niveau ***${nextLevel}***_ !`;

            await interaction.editReply({ content: rankMessage });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du rank :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération de ton rang.");
        }
    },
};

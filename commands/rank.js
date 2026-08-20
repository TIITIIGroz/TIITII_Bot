const { SlashCommandBuilder } = require('discord.js');
const { generateRankCard, database: pool } = require('../systems/levels');

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

            const attachment = await generateRankCard(targetMember, userData);
            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error("❌ Erreur lors de la génération de la carte rank :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération de ton rang.");
        }
    },
};

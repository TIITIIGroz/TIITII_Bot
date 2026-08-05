const { SlashCommandBuilder } = require('discord.js');
const { generateRankCard, database } = require('../systems/levels');

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

        database.get(
            `SELECT * FROM users WHERE userId = ? AND guildId = ?`,
            [userId, guildId],
            async (err, row) => {
                if (err) {
                    console.error("❌ Erreur lors de la lecture de la base de données (/rank) :", err.message);
                    return interaction.editReply("Une erreur est survenue lors de la récupération de ton rang.");
                }

                // Si l'utilisateur n'a pas encore d'XP enregistrée
                const userData = row || { xp: 0, totalXp: 0, level: 0, messages: 0 };

                try {
                    const attachment = await generateRankCard(targetMember, userData);
                    await interaction.editReply({ files: [attachment] });
                } catch (error) {
                    console.error("❌ Erreur lors de la génération de la carte rank :", error);
                    await interaction.editReply(`Niveau : **${userData.level}** | XP : **${userData.totalXp}**`);
                }
            }
        );
    },
};

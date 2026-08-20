const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le top 10 des membres les plus actifs du serveur'),
    async execute(interaction) {
        await interaction.deferReply();
        const { getLeaderboard } = require('../systems/levels');
        const guildId = interaction.guild.id;

        try {
            const topUsers = await getLeaderboard(guildId);

            if (!topUsers || topUsers.length === 0) {
                return interaction.editReply("📊 Aucun classement disponible pour le moment. Envoyez des messages pour gagner de l'XP !");
            }

            const embed = new EmbedBuilder()
                .setTitle('Classement des niveaux - Ranking of levels')
                .setColor('#FF0000') // Rouge demandé
                .setTimestamp();

            let description = '';

            for (let i = 0; i < topUsers.length; i++) {
                const userEntry = topUsers[i];
                const rankNumber = i + 1;

                // Format exact demandé : 1 - @nom d'utilisateur: Niveau 35 (XP total: 1250)
                description += `${rankNumber} - <@${userEntry.userId}>: Niveau ${userEntry.level} (XP total: ${userEntry.totalXp})\n`;
            }

            embed.setDescription(description);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du leaderboard :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération du classement.");
        }
    },
};

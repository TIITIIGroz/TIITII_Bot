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
                .setTitle('Classement des niveaux:\n-\nRanking of levels:')
                .setColor('#FF0000')
                .setTimestamp();

            let description = '';

            for (let i = 0; i < topUsers.length; i++) {
                const userEntry = topUsers[i];
                const rankNumber = i + 1;

                // PostgreSQL renvoie souvent tout en minuscules (userid, totalxp, etc.)
                // On gère les deux cas pour être sûr de ne plus avoir de "undefined"
                const userId = userEntry.userId || userEntry.userid || userEntry.user_id;
                const level = userEntry.level !== undefined ? userEntry.level : 0;
                const totalXp = userEntry.totalXp !== undefined ? userEntry.totalXp : (userEntry.totalxp || 0);

                description += `${rankNumber} - <@${userId}>: Niveau **${level}** (XP total: ${totalXp})\n`;
            }

            embed.setDescription(description);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du leaderboard :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération du classement.");
        }
    },
};

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
                .setTitle('🏆 Classement du serveur - Top 10')
                .setColor('#800020') // Rouge bordeaux Famille Groz
                .setTimestamp();

            let description = '';

            for (let i = 0; i < topUsers.length; i++) {
                const userEntry = topUsers[i];
                let medal = '';
                if (i === 0) medal = '🥇 ';
                else if (i === 1) medal = '🥈 ';
                else if (i === 2) medal = '🥉 ';
                else medal = `**#${i + 1}** `;

                description += `${medal} <@${userEntry.userId}> — Niveau **${userEntry.level}** (${userEntry.totalXp} XP)\n`;
            }

            embed.setDescription(description);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("❌ Erreur lors de l'affichage du leaderboard :", error);
            await interaction.editReply("Une erreur est survenue lors de la récupération du classement.");
        }
    },
};

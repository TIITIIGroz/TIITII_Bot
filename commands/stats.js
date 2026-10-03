const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Affiche tes statistiques ou celles d’un membre (XP, classement, messages...)')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre dont tu veux voir les statistiques (optionnel)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.deferReply();

        const { guild } = interaction;
        const { database: pool } = require('../systems/levels');

        // On cible soit la personne mentionnée, soit l'auteur de la commande par défaut
        const targetUser = interaction.options.getUser('membre') || interaction.user;
        const targetMember = guild.members.cache.get(targetUser.id) || await guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: "❌ Impossible de trouver ce membre sur le serveur." });
        }

        let level = 0;
        let totalXp = 0;
        let rank = 'Non classé';
        let messagesCount = 0;
        let favoriteTextChannel = 'Aucun';
        let voiceHours = 0;
        let favoriteVoiceChannel = 'Aucun';

        try {
            // 1. Récupérer le niveau et l'XP total de la cible
            const userQuery = await pool.query(
                `SELECT totalxp, level FROM users WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );

            if (userQuery.rows.length > 0) {
                totalXp = parseInt(userQuery.rows[0].totalxp) || 0;
                level = parseInt(userQuery.rows[0].level) || 0;
            }

            // 2. Calculer le rang dans le classement (Leaderboard)
            const rankQuery = await pool.query(
                `SELECT COUNT(*) + 1 as rank FROM users WHERE guildid = $1 AND totalxp > (SELECT COALESCE(totalxp, 0) FROM users WHERE userid = $2 AND guildid = $1)`,
                [guild.id, targetUser.id]
            );
            if (rankQuery.rows.length > 0) {
                rank = `#${rankQuery.rows[0].rank}`;
            }

        } catch (err) {
            console.error("Erreur lors de la récupération des statistiques :", err);
        }

        // Calcul de l'XP restant (ajuste la formule selon ton système si besoin)
        const xpRequiredForNextLevel = (level + 1) * 100; 
        const xpRemaining = Math.max(0, xpRequiredForNextLevel - (totalXp % xpRequiredForNextLevel)); 

        // Construction de l'embed
        const statsEmbed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor || '#5865F2')
            .setTitle(`📊 Statistiques de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '⭐ Niveau', value: `\`${level}\``, inline: true },
                { name: '🎯 XP restant', value: `\`${xpRemaining} XP\` (pour le niveau ${level + 1})`, inline: true },
                { name: '🏆 Rang', value: `\`${rank}\``, inline: true },
                
                { name: '💬 Total des messages envoyés', value: `\`${messagesCount} messages\``, inline: false },
                { name: '📌 Salon des messages préféré', value: `${favoriteTextChannel}`, inline: false },
                
                { name: '⏱️ Total d’heures passées en vocal', value: `\`${voiceHours} heures\``, inline: false },
                { name: '🎧 Salon du vocal préféré', value: `${favoriteVoiceChannel}`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [statsEmbed] });
    },
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../systems/levels/database');
const { getLevelProgress } = require('../systems/levels/level'); // 📌 Import de la vraie fonction de calcul

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
        
        let totalVoiceSeconds = 0;
        let favoriteVoiceChannel = 'Aucun';

        try {
            // Niveau et XP
            const userQuery = await pool.query(
                `SELECT totalxp, level FROM users WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );
            if (userQuery.rows.length > 0) {
                totalXp = parseInt(userQuery.rows[0].totalxp) || 0;
                level = parseInt(userQuery.rows[0].level) || 0;
            }

            // Rang
            const rankQuery = await pool.query(
                `SELECT COUNT(*) + 1 as rank FROM users WHERE guildid = $1 AND totalxp > (SELECT COALESCE(totalxp, 0) FROM users WHERE userid = $2 AND guildid = $1)`,
                [guild.id, targetUser.id]
            );
            if (rankQuery.rows.length > 0) rank = `#${rankQuery.rows[0].rank}`;

            // Messages
            const msgQuery = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );
            if (msgQuery.rows.length > 0) messagesCount = parseInt(msgQuery.rows[0].count) || 0;

            const topChanQuery = await pool.query(
                `SELECT channelid, COUNT(*) as count FROM server_messages WHERE userid = $1 AND guildid = $2 GROUP BY channelid ORDER BY count DESC LIMIT 1`,
                [targetUser.id, guild.id]
            );
            if (topChanQuery.rows.length > 0) favoriteTextChannel = `<#${topChanQuery.rows[0].channelid}>`;

            // --- VOCAL DEPUIS server_voice_activity ---
            const voiceTimeQuery = await pool.query(
                `SELECT SUM(duration_seconds) as total_seconds FROM server_voice_activity WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );
            if (voiceTimeQuery.rows.length > 0 && voiceTimeQuery.rows[0].total_seconds) {
                totalVoiceSeconds = parseInt(voiceTimeQuery.rows[0].total_seconds) || 0;
            }

            const topVoiceChanQuery = await pool.query(
                `SELECT channelid, SUM(duration_seconds) as total_seconds FROM server_voice_activity WHERE userid = $1 AND guildid = $2 GROUP BY channelid ORDER BY total_seconds DESC LIMIT 1`,
                [targetUser.id, guild.id]
            );
            if (topVoiceChanQuery.rows.length > 0 && topVoiceChanQuery.rows[0].channelid) {
                favoriteVoiceChannel = `<#${topVoiceChanQuery.rows[0].channelid}>`;
            }

        } catch (err) {
            console.error("Erreur stats :", err);
        }

        // Conversion des secondes en Jours, Heures et Minutes
        const days = Math.floor(totalVoiceSeconds / (24 * 3600));
        const hours = Math.floor((totalVoiceSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalVoiceSeconds % 3600) / 60);
        
        let voiceFormatted = `${minutes} min`;
        if (days > 0) {
            voiceFormatted = `${days} jours, ${hours} h et ${minutes} min`;
        } else if (hours > 0) {
            voiceFormatted = `${hours} h et ${minutes} min`;
        }

        // 📌 Utilisation de la vraie logique de progression (identique à /rank)
        const progress = getLevelProgress(totalXp);
        const xpRemaining = progress.requiredXp - progress.currentXp;

        const statsEmbed = new EmbedBuilder()
            .setColor(targetMember.displayHexColor || '#5865F2')
            .setTitle(`📊 Statistiques de ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '⭐ Niveau', value: `\`${progress.level}\``, inline: true },
                { name: '🎯 XP restant', value: `\`${xpRemaining} XP\` (pour le niveau ${progress.level + 1})`, inline: true },
                { name: '🏆 Rang', value: `\`${rank}\``, inline: true },
                { name: '💬 Total des messages envoyés', value: `\`${messagesCount} messages\``, inline: false },
                { name: '📌 Salon des messages préféré', value: `${favoriteTextChannel}`, inline: false },
                { name: '⏱️ Total du temps passé en vocal', value: `\`${voiceFormatted}\``, inline: false },
                { name: '🎧 Salon du vocal préféré', value: `${favoriteVoiceChannel}`, inline: false }
            )
            .setFooter({ 
                text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                    timeZone: 'Europe/Paris', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}\\` 
            });

        await interaction.editReply({ embeds: [statsEmbed] });
    },
};

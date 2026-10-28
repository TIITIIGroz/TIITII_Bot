const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../systems/levels/database');

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
        
        let totalVoiceMinutes = 0;
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

            // 3. Récupérer le nombre de messages envoyés par l'utilisateur
            const msgQuery = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );
            if (msgQuery.rows.length > 0) {
                messagesCount = parseInt(msgQuery.rows[0].count) || 0;
            }

            // 4. Récupérer le salon textuel préféré
            const topChanQuery = await pool.query(
                `SELECT channelid, COUNT(*) as count FROM server_messages WHERE userid = $1 AND guildid = $2 GROUP BY channelid ORDER BY count DESC LIMIT 1`,
                [targetUser.id, guild.id]
            );
            if (topChanQuery.rows.length > 0) {
                favoriteTextChannel = `<#${topChanQuery.rows[0].channelid}>`;
            }

            // 5. Récupérer les stats vocales depuis Supabase (table 'voice_stats' ou 'users' selon ton système, ici on suppose une table dédiée ou la colonne voicetime dans users)
            // Si tu stockes le temps total en minutes dans une table voice_stats (userid, guildid, duration_minutes, channelid) :
            const voiceTimeQuery = await pool.query(
                `SELECT SUM(duration_minutes) as total_minutes FROM voice_logs WHERE userid = $1 AND guildid = $2`,
                [targetUser.id, guild.id]
            );
            if (voiceTimeQuery.rows.length > 0 && voiceTimeQuery.rows[0].total_minutes) {
                totalVoiceMinutes = parseInt(voiceTimeQuery.rows[0].total_minutes) || 0;
            }

            // 6. Récupérer le salon vocal préféré (où l'utilisateur a passé le plus de temps)
            const topVoiceChanQuery = await pool.query(
                `SELECT channelid, SUM(duration_minutes) as total_minutes FROM voice_logs WHERE userid = $1 AND guildid = $2 GROUP BY channelid ORDER BY total_minutes DESC LIMIT 1`,
                [targetUser.id, guild.id]
            );
            if (topVoiceChanQuery.rows.length > 0 && topVoiceChanQuery.rows[0].channelid) {
                favoriteVoiceChannel = `<#${topVoiceChanQuery.rows[0].channelid}>`;
            }

        } catch (err) {
            console.error("Erreur lors de la récupération des statistiques :", err);
        }

        // Conversion des minutes totales en Jours, Heures et Minutes
        const days = Math.floor(totalVoiceMinutes / (24 * 60));
        const hours = Math.floor((totalVoiceMinutes % (24 * 60)) / 60);
        const minutes = totalVoiceMinutes % 60;
        
        let voiceFormatted = `${minutes} min`;
        if (days > 0) {
            voiceFormatted = `${days} jours, ${hours} h et ${minutes} min`;
        } else if (hours > 0) {
            voiceFormatted = `${hours} h et ${minutes} min`;
        }

        // Calcul de l'XP restant
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
                
                { name: '⏱️ Total du temps passé en vocal', value: `\`${voiceFormatted}\``, inline: false },
                { name: '🎧 Salon du vocal préféré', value: `${favoriteVoiceChannel}`, inline: false }
            )
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

        await interaction.editReply({ embeds: [statsEmbed] });
    },
};

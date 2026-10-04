const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats-serv')
        .setDescription('Affiche des statistiques globales et détaillées sur le serveur'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const { guild } = interaction;
        const { database: pool } = require('../systems/levels'); // Ajuste selon ton chemin de base de données

        // --- Récupérations basiques du serveur ---
        const serverName = guild.name;
        const serverId = guild.id;
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        // Membres actifs actuels
        const onlineMembers = guild.members.cache.filter(member => member.presence && member.presence.status !== 'offline').size;
        
        // Membres en vocal
        const voiceMembers = guild.channels.cache
            .filter(channel => channel.isVoiceBased())
            .reduce((acc, channel) => acc + channel.members.size, 0);

        let membersMonth = "Données non dispo";
        let members15Days = "Données non dispo";
        let membersToday = guild.memberCount;

        let msgMonth = 0, msg15Days = 0, msgWeek = 0, msg24h = 0;
        let bestTextChannel = "Aucun";
        let bestTextMember = "Aucun";

        let voiceMonthDays = 0, voiceMonthHours = 0, voiceMonthMinutes = 0;
        let voice15Days = "0h 0min";
        let voiceWeek = "0h 0min";
        let voice24h = "0h 0min";
        let bestVoiceChannel = "Aucun";
        let bestVoiceMember = "Aucun";

        try {
            // 1. Messages des dernières 24h (utilise server_messages ou messages_stats selon ton choix)
            const query24h = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
                [guild.id]
            );
            msg24h = parseInt(query24h.rows[0]?.count) || 0;

            // 2. Messages des 15 derniers jours
            const query15d = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '15 days'`,
                [guild.id]
            );
            msg15Days = parseInt(query15d.rows[0]?.count) || 0;

            // 3. Messages du mois (30 derniers jours)
            const queryMonth = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
                [guild.id]
            );
            msgMonth = parseInt(queryMonth.rows[0]?.count) || 0;

            // 4. Messages de la semaine (7 derniers jours)
            const queryWeek = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
                [guild.id]
            );
            msgWeek = parseInt(queryWeek.rows[0]?.count) || 0;

            // 5. Meilleur salon textuel (sur le mois)
            const topChan = await pool.query(
                `SELECT channelid, COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '30 days' GROUP BY channelid ORDER BY count DESC LIMIT 1`,
                [guild.id]
            );
            if (topChan.rows.length > 0) {
                bestTextChannel = `<#${topChan.rows[0].channelid}>`;
            }

            // 6. Meilleur(e) membre textuel (sur le mois)
            const topMember = await pool.query(
                `SELECT userid, COUNT(*) as count FROM server_messages WHERE guildid = $1 AND created_at >= NOW() - INTERVAL '30 days' GROUP BY userid ORDER BY count DESC LIMIT 1`,
                [guild.id]
            );
            if (topMember.rows.length > 0) {
                bestTextMember = `<@${topMember.rows[0].userid}>`;
            }

        } catch (err) {
            console.error("Erreur lors de la récupération des stats Supabase :", err);
        }

        // Formatage du texte
        const embedDescription = `__**Statistiques du serveur:**__\n\n` +
            `**Nom du serveur**\n` +
            `${serverName}\n\n` +
            
            `**Infos de base**\n` +
            `• Membres actifs à l'écrit : \`${onlineMembers}\`\n` +
            `• Membres actifs en vocal : \`${voiceMembers}\`\n` +
            `• ID du serveur : \`${serverId}\`\n` +
            `• Serveur créé le : <t:${createdAt}:D> (<t:${createdAt}:R>)\n\n` +
            
            `**Membres**\n` +
            `• Il y a un mois : \`${membersMonth}\`\n` +
            `• Il y a 15 jours : \`${members15Days}\`\n` +
            `• Aujourd'hui : \`${membersToday}\`\n\n` +
            
            `**Messages**\n` +
            `• Durant le mois : \`${msgMonth} messages\`\n` +
            `• Les 15 derniers jours : \`${msg15Days} messages\`\n` +
            `• Durant la semaine : \`${msgWeek} messages\`\n` +
            `• Durant les dernières 24h : \`${msg24h} messages\`\n` +
            `• Meilleur salon : ${bestTextChannel}\n` +
            `• Meilleur(e) membre : ${bestTextMember}\n\n` +
            
            `**Vocal**\n` +
            `• Durant le mois : \`${voiceMonthDays} jours, ${voiceMonthHours} heures et${voiceMonthMinutes} minutes\`\n` +
            `• Les 15 derniers jours : \`${voice15Days}\`\n` +
            `• Durant la semaine : \`${voiceWeek}\`\n` +
            `• Durant les dernières 24h : \`${voice24h}\`\n` +
            `• Meilleur salon : ${bestVoiceChannel}\n` +
            `• Meilleur(e) membre : **${bestVoiceMember}**`;

        const statsEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setDescription(embedDescription)
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

        await interaction.editReply({ embeds: [statsEmbed] });
    },
};

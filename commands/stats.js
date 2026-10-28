const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pool = require('../systems/levels/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats-serv')
        .setDescription('Affiche des statistiques globales et détaillées sur le serveur'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const { guild } = interaction;
        const targetRoleId = '894668498180124703'; // Rôle spécifique demandé

        const serverName = guild.name;
        const serverId = guild.id;
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        const onlineMembers = guild.members.cache.filter(member => member.presence && member.presence.status !== 'offline').size;
        const voiceMembers = guild.channels.cache
            .filter(channel => channel.isVoiceBased() && channel.id !== '896742491565473812')
            .reduce((acc, channel) => acc + channel.members.size, 0);

        // Salons ignorés pour les messages
        const ignoredChannels = [
            '1350852883649663040', '894680444698779708', '1534205869909082172', '894671498965561394',
            '864920115270909972', '1094755406829584385', '896545873570455553', '897619009556602971',
            '1011571833704808509', '1011434339076149248', '1011657738994065468', '1011570558607048785',
            '1036503057300729906', '990641310476148766', '1534249654701785168', '1232429441221791836',
            '1549500976317337670', '1208168912353493073', '987031560945553418', '1491749498094092388',
            '990629853801881630', '1533214591201312909', '990642579542536262', '998668844048580609',
            '1534599616681607388', '1534224381109076172', '1533889676513906838', '1547857175878041630',
            '896742491565473812'
        ];

        let membersToday = guild.memberCount;
        let membersMonth = 0;
        let members15Days = 0;

        let msgMonth = 0, msg15Days = 0, msgWeek = 0, msg24h = 0;
        let bestTextChannel = "Aucun";
        let bestTextMember = "Aucun";

        let voiceMonthFormatted = "0h 0min";
        let voice15DaysFormatted = "0h 0min";
        let voiceWeekFormatted = "0h 0min";
        let voice24hFormatted = "0h 0min";
        let bestVoiceChannel = "Aucun";
        let bestVoiceMember = "Aucun";

        // Fonction utilitaire pour formater les minutes en Jours / Heures / Minutes
        function formatMinutes(totalMinutes) {
            const mins = parseInt(totalMinutes) || 0;
            if (mins === 0) return "0h 0min";
            const days = Math.floor(mins / (24 * 60));
            const hours = Math.floor((mins % (24 * 60)) / 60);
            const minutes = mins % 60;

            if (days > 0) return `${days} j, ${hours} h et ${minutes} min`;
            return `${hours} h et ${minutes} min`;
        }

        try {
            const now = Date.now();
            membersMonth = guild.members.cache.filter(m => m.joinedTimestamp && (now - m.joinedTimestamp) >= 30 * 24 * 60 * 60 * 1000).size;
            members15Days = guild.members.cache.filter(m => m.joinedTimestamp && (now - m.joinedTimestamp) >= 15 * 24 * 60 * 60 * 1000).size;

            // Requêtes SQL messages en excluant les salons ignorés
            const placeholders = ignoredChannels.map((_, i) => `$${i + 2}`).join(', ');

            const query24h = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '24 hours'`,
                [guild.id, ...ignoredChannels]
            );
            msg24h = parseInt(query24h.rows[0]?.count) || 0;

            const query15d = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '15 days'`,
                [guild.id, ...ignoredChannels]
            );
            msg15Days = parseInt(query15d.rows[0]?.count) || 0;

            const queryMonth = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '30 days'`,
                [guild.id, ...ignoredChannels]
            );
            msgMonth = parseInt(queryMonth.rows[0]?.count) || 0;

            const queryWeek = await pool.query(
                `SELECT COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '7 days'`,
                [guild.id, ...ignoredChannels]
            );
            msgWeek = parseInt(queryWeek.rows[0]?.count) || 0;

            const topChan = await pool.query(
                `SELECT channelid, COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '30 days' GROUP BY channelid ORDER BY count DESC LIMIT 1`,
                [guild.id, ...ignoredChannels]
            );
            if (topChan.rows.length > 0) bestTextChannel = `<#${topChan.rows[0].channelid}>`;

            const topMember = await pool.query(
                `SELECT userid, COUNT(*) as count FROM server_messages WHERE guildid = $1 AND channelid NOT IN (${placeholders}) AND created_at >= NOW() - INTERVAL '30 days' GROUP BY userid ORDER BY count DESC LIMIT 1`,
                [guild.id, ...ignoredChannels]
            );
            if (topMember.rows.length > 0) bestTextMember = `<@${topMember.rows[0].userid}>`;

            // --- REQUÊTES VOCALES SUPABASE (table voice_logs) ---
            const vMonth = await pool.query(
                `SELECT SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 AND joined_at >= NOW() - INTERVAL '30 days'`,
                [guild.id]
            );
            voiceMonthFormatted = formatMinutes(vMonth.rows[0]?.total);

            const v15d = await pool.query(
                `SELECT SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 AND joined_at >= NOW() - INTERVAL '15 days'`,
                [guild.id]
            );
            voice15DaysFormatted = formatMinutes(v15d.rows[0]?.total);

            const vWeek = await pool.query(
                `SELECT SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 AND joined_at >= NOW() - INTERVAL '7 days'`,
                [guild.id]
            );
            voiceWeekFormatted = formatMinutes(vWeek.rows[0]?.total);

            const v24h = await pool.query(
                `SELECT SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 AND joined_at >= NOW() - INTERVAL '24 hours'`,
                [guild.id]
            );
            voice24hFormatted = formatMinutes(v24h.rows[0]?.total);

            // Meilleur salon vocal du serveur
            const topVoiceChan = await pool.query(
                `SELECT channelid, SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 GROUP BY channelid ORDER BY total DESC LIMIT 1`,
                [guild.id]
            );
            if (topVoiceChan.rows.length > 0 && topVoiceChan.rows[0].channelid) {
                bestVoiceChannel = `<#${topVoiceChan.rows[0].channelid}>`;
            }

            // Meilleur membre en vocal du serveur
            const topVoiceMember = await pool.query(
                `SELECT userid, SUM(duration_minutes) as total FROM voice_logs WHERE guildid = $1 GROUP BY userid ORDER BY total DESC LIMIT 1`,
                [guild.id]
            );
            if (topVoiceMember.rows.length > 0 && topVoiceMember.rows[0].userid) {
                bestVoiceMember = `<@${topVoiceMember.rows[0].userid}>`;
            }

        } catch (err) {
            console.error("Erreur stats-serv :", err);
        }

        const roleMemberCount = guild.members.cache.filter(member => member.roles.cache.has(targetRoleId)).size;

        const embedDescription = `__**Statistiques du serveur:**__\n\n` +
            `**__Nom du serveur__:**\n\n${serverName}\n\n` +
            `**__Infos de base__:**\n` +
            `• Membres actifs à l'écrit : \`${onlineMembers}\`\n` +
            `• Membres actifs en vocal : \`${voiceMembers}\`\n` +
            `• ID du serveur : \`${serverId}\`\n` +
            `• Serveur créé le : <t:${createdAt}:D> (<t:${createdAt}:R>)\n\n` +
            `**__Membres (Rôle <@&${targetRoleId}>)__:**\n` +
            `• Total : \`${roleMemberCount}\`\n` +
            `• Il y a un mois : \`${membersMonth}\`\n` +
            `• Il y a 15 jours : \`${members15Days}\`\n` +
            `• Aujourd'hui : \`${membersToday}\`\n\n` +
            `**__Messages (Hors salons exclus)__:**\n` +
            `• Durant le mois : \`${msgMonth} messages\`\n` +
            `• Les 15 derniers jours : \`${msg15Days} messages\`\n` +
            `• Durant la semaine : \`${msgWeek} messages\`\n` +
            `• Durant les dernières 24h : \`${msg24h} messages\`\n` +
            `• Meilleur salon : ${bestTextChannel}\n` +
            `• Meilleur(e) membre : ${bestTextMember}\n\n` +
            `**__Vocal__:**\n` +
            `• Durant le mois : \`${voiceMonthFormatted}\`\n` +
            `• Les 15 derniers jours : \`${voice15DaysFormatted}\`\n` +
            `• Durant la semaine : \`${voiceWeekFormatted}\`\n` +
            `• Durant les dernières 24h : \`${voice24hFormatted}\`\n` +
            `• Meilleur salon : ${bestVoiceChannel}\n` +
            `• Meilleur(e) membre : ${bestVoiceMember}`;

        const statsEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .setDescription(embedDescription)
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

        await interaction.editReply({ embeds: [statsEmbed] });
    },
};

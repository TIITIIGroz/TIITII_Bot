const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut-serv')
        .setDescription('Affiche toutes les informations du serveur'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const { guild } = interaction;
        const { database: pool } = require('../systems/levels');
        
        // Récupération du propriétaire
        const owner = await guild.fetchOwner().catch(() => null);

        // Comptage des différents types de salons
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // Date de création du serveur
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        // Comptage des membres ayant le rôle spécifique
        const targetRoleId = '894668498180124703';
        const roleMemberCount = guild.members.cache.filter(member => member.roles.cache.has(targetRoleId)).size;

        // 🏆 Récupération du membre ayant le plus haut niveau (via la BDD PostgreSQL)
        let topUserText = "Aucun";
        try {
            const topUserQuery = await pool.query(
                `SELECT userid, totalxp FROM users WHERE guildid = $1 ORDER BY totalxp DESC LIMIT 1`,
                [guild.id]
            );
            if (topUserQuery.rows.length > 0) {
                const topUserId = topUserQuery.rows[0].userid;
                const topUserTotalXp = topUserQuery.rows[0].totalxp;
                topUserText = `<@${topUserId}> (${topUserTotalXp} XP)`;
            }
        } catch (err) {
            console.error("Erreur récupération top user BDD :", err);
        }

        // ⏳ Récupération du plus ancien et du plus récent membre
        let oldestMemberText = "Inconnu";
        let newestMemberText = "Inconnu";
        try {
            await guild.members.fetch();
            
            const sortedByJoin = guild.members.cache.sorted((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            const oldest = sortedByJoin.first();
            const newest = sortedByJoin.last();

            if (oldest) oldestMemberText = `<@${oldest.id}> (<t:${Math.floor(oldest.joinedTimestamp / 1000)}:R>)`;
            if (newest) newestMemberText = `<@${newest.id}> (<t:${Math.floor(newest.joinedTimestamp / 1000)}:R>)`;
        } catch (err) {
            console.error("Erreur tri des membres :", err);
        }

        // Construction de l'embed d'informations
        const serverEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Informations de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Propriétaire', value: owner ? `${owner}` : 'Inconnu', inline: true },
                { name: '🆔 ID du serveur', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                
                { name: '👥 Membres', value: `Total : **${roleMemberCount}**`, inline: true },
                { name: '💬 Salons', value: `Texte : **${textChannels}** | Vocaux : **${voiceChannels}** | Catégories : **${categoryChannels}**`, inline: true },
                { name: '💎 Boosts', value: `Niveau **${guild.premiumTier}** (**${guild.premiumSubscriptionCount || 0}** boosts)`, inline: true },

                { name: '🏆 Top Niveau (XP)', value: topUserText, inline: false },
                { name: '📜 Plus ancien membre', value: oldestMemberText, inline: true },
                { name: '🆕 Plus récent membre', value: newestMemberText, inline: true }
            )
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

        if (guild.bannerURL()) {
            serverEmbed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.editReply({ embeds: [serverEmbed] });
    },
};

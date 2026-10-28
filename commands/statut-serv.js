const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const pool = require('../systems/levels/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut-serv')
        .setDescription('Affiche toutes les informations du serveur'),
    
    async execute(interaction) {
        // TOUJOURS en tout premier pour éviter l'expiration "Unknown interaction"
        await interaction.deferReply();

        const { guild } = interaction;
        
        // Récupération du propriétaire
        const owner = await guild.fetchOwner().catch(() => null);

        // Comptage des différents types de salons
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
        const categoryChannels = channels.filter(c => c.type === ChannelType.GuildCategory).size;

        // Date de création du serveur
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        // Comptage des membres ayant les rôles spécifiques
        const targetRoleId = '894668498180124703';
        const frRoleId = '1094758355085574204';
        const enRoleId = '1094758180938067989';

        const roleMemberCount = guild.members.cache.filter(member => member.roles.cache.has(targetRoleId)).size;
        const frRoleCount = guild.members.cache.filter(member => member.roles.cache.has(frRoleId)).size;
        const enRoleCount = guild.members.cache.filter(member => member.roles.cache.has(enRoleId)).size;

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

        // ⏳ Récupération du plus ancien et du plus récent membre via le cache
        let oldestMemberText = "Inconnu";
        let newestMemberText = "Inconnu";
        try {
            const membersArray = Array.from(guild.members.cache.values()).filter(m => m.joinedTimestamp);
            
            if (membersArray.length > 0) {
                membersArray.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

                const oldest = membersArray[0];
                const newest = membersArray[membersArray.length - 1];

                if (oldest) oldestMemberText = `<@${oldest.id}> (<t:${Math.floor(oldest.joinedTimestamp / 1000)}:R>)`;
                if (newest) newestMemberText = `<@${newest.id}> (<t:${Math.floor(newest.joinedTimestamp / 1000)}:R>)`;
            }
        } catch (err) {
            console.error("Erreur tri des membres :", err);
        }

        // Construction de l'embed d'informations
        const serverEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Informations de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                // Groupe 1 : Les 3 premiers (2 côte à côte + 1 ligne entière)
                { name: '👑 Propriétaire', value: owner ? `${owner}` : 'Inconnu', inline: true },
                { name: '🆔 ID du serveur', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                
                // Groupe 2 : Membres et Salons (2 par 2)
                { name: '👥 Membres', value: `Total : **${roleMemberCount}**`, inline: true },
                { name: '💬 Salons', value: `Texte : **${textChannels}** | Vocaux : **${voiceChannels}** | Catégories : **${categoryChannels}**`, inline: true },
                
                // Groupe 3 : Rôle Fr et Rôle En (2 par 2)
                { name: '🇫🇷 Rôle Français', value: `**${frRoleCount}** membres`, inline: true },
                { name: '🇬🇧 Rôle Anglais', value: `**${enRoleCount}** membres`, inline: true },

                // Groupe 4 : Boost et Top Niveau (2 par 2)
                { name: '💎 Boosts', value: `Niveau **${guild.premiumTier}** (**${guild.premiumSubscriptionCount || 0}** boosts)`, inline: true },
                { name: '🏆 Top Niveau (XP)', value: topUserText, inline: true },

                // Groupe 5 : Plus ancien et plus récent membre (2 par 2)
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

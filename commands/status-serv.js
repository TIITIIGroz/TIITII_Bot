const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status-serv')
        .setDescription('Affiche toutes les informations et statistiques du serveur'),
    
    async execute(interaction) {
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

        // Niveau de vérification
        const verificationLevels = {
            0: 'Aucun',
            1: 'Faible (Email vérifié)',
            2: 'Moyen (Inscrit depuis > 5 min)',
            3: 'Élevé (Membre du serveur depuis > 10 min)',
            4: 'Très élevé (Téléphone vérifié)'
        };

        // Construction de l'embed d'informations
        const serverEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 Informations de ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Propriétaire', value: owner ? `${owner.user.tag}` : 'Inconnu', inline: true },
                { name: '🆔 ID du serveur', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Créé le', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
                
                { name: '👥 Membres', value: `Total : **${guild.memberCount}**`, inline: true },
                { name: '💬 Salons', value: `Texte : **${textChannels}** | Vocaux : **${voiceChannels}** | Catégories : **${categoryChannels}**`, inline: true },
                { name: '💎 Boosts', value: `Niveau **${guild.premiumTier}** (**${guild.premiumSubscriptionCount || 0}** boosts)`, inline: true },

            )
            .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

        // Si le serveur a une bannière, on l'ajoute à l'embed
        if (guild.bannerURL()) {
            serverEmbed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.editReply({ embeds: [serverEmbed] });
    },
};

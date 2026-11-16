const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('my-stats')
        .setDescription('Affiche tes statistiques détaillées (24h, 15 jours, 1 mois)')
        .setDescriptionLocalizations({
            fr: "Affiche tes statistiques détaillées (24h, 15 jours, 1 mois)",
            "en-US": "Displays your detailed statistics (24h, 15 days, 1 month)"
        }),

    async execute(interaction) {
        const userId = interaction.user.id;
        const member = interaction.member;

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            // =========================================================================
            // 📌 SECTION DATA : À connecter avec ta base de données / ton système d'XP
            // =========================================================================
            // Exemple de structure de données que tu dois récupérer selon les timestamps :
            // const now = Date.now();
            // const oneDayAgo = now - (24 * 60 * 60 * 1000);
            // const fifteenDaysAgo = now - (15 * 24 * 60 * 60 * 1000);
            // const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
            
            // Valeurs fictives pour l'exemple (à remplacer par tes requêtes de base de données)
            const stats24h = { xp: 120, voiceMinutes: 45, messages: 15 };
            const stats15days = { xp: 1850, voiceMinutes: 620, messages: 230 };
            const stats1Month = { xp: 3900, voiceMinutes: 1400, messages: 510 };
            // =========================================================================

            const statsEmbed = new EmbedBuilder()
                .setColor('#5865F2') // Couleur Discord Blurple
                .setAuthor({ 
                    name: member.displayName, 
                    iconURL: member.user.displayAvatarURL({ dynamic: true }) 
                })
                .setTitle('📊 Vos statistiques d\'activité / Activity Statistics')
                .setDescription('Voici un récapitulatif de ton activité sur le serveur selon différentes périodes :\n*Here is a summary of your server activity across different timeframes:*')
                .addFields(
                    {
                        name: '⏱️ Dernières 24 heures / Last 24 hours',
                        value: `• **XP gagné :** \`${stats24h.xp} XP\`\n• **Temps vocal :** \`${Math.floor(stats24h.voiceMinutes / 60)}h ${stats24h.voiceMinutes % 60}m\`\n• **Messages :** \`${stats24h.messages}\``,
                        inline: false
                    },
                    {
                        name: '📅 Les 15 derniers jours / Last 15 days',
                        value: `• **XP gagné :** \`${stats15days.xp} XP\`\n• **Temps vocal :** \`${Math.floor(stats15days.voiceMinutes / 60)}h ${stats15days.voiceMinutes % 60}m\`\n• **Messages :** \`${stats15days.messages}\``,
                        inline: false
                    },
                    {
                        name: '🗓️ Le dernier mois (30 jours) / Last 1 month',
                        value: `• **XP gagné :** \`${stats1Month.xp} XP\`\n• **Temps vocal :** \`${Math.floor(stats1Month.voiceMinutes / 60)}h ${stats1Month.voiceMinutes % 60}m\`\n• **Messages :** \`${stats1Month.messages}\``,
                        inline: false
                    }
                )
                .setFooter({ text: 'Système de statistiques • Famille Groz' })
                .setTimestamp();

            return await interaction.editReply({
                embeds: [statsEmbed]
            });

        } catch (error) {
            console.error("❌ Erreur lors de la récupération des stats :", error);
            return await interaction.editReply({
                content: "❌ Une erreur est survenue lors du chargement de tes statistiques."
            });
        }
    },
};

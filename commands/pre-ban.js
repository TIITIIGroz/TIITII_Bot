const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../supabase'); // Ajuste le chemin vers ton client Supabase

// Fonction utilitaire pour convertir le format (ex: "5d", "3h", "15m", "30s") en millisecondes
function parseDuration(durationStr) {
    const match = durationStr.match(/^(\d+)([dhms])$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 0);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pre-ban')
        .setDescription('Programme un bannissement différé avec un lien de retour')
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre à cibler')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duree')
                .setDescription('Temps avant le ban (ex: 3h, 2d, 30m, 60s)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('raison')
                .setDescription('Raison du pré-ban')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: [1 << 6] }); // Réponse éphémère

        const targetUser = interaction.options.getUser('membre');
        const durationStr = interaction.options.getString('duree');
        const reason = interaction.options.getString('raison');

        const durationMs = parseDuration(durationStr);
        if (!durationMs || durationMs <= 0) {
            return interaction.editReply({ 
                content: "❌ Format de durée invalide. Utilise par exemple : `30s`, `15m`, `3h`, `2d`." 
            });
        }

        const banAt = new Date(Date.now() + durationMs);
        const guildId = interaction.guild.id;
        const authorId = interaction.user.id;

        // Enregistrement persistant dans Supabase
        const { error } = await supabase.from('scheduled_bans').insert([{
            user_id: targetUser.id,
            guild_id: guildId,
            author_id: authorId,
            reason: reason,
            ban_at: banAt.toISOString()
        }]);

        if (error) {
            console.error("Erreur insertion pré-ban:", error);
            return interaction.editReply({ content: "❌ Erreur lors de l'enregistrement en base de données." });
        }

        // Envoi du log dans le salon demandé : 1552573413850218587
        const logChannelId = '1552573413850218587';
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (logChannel) {
            const embed = new EmbedBuilder()
                .setTitle('⏳ Nouveau Pré-Ban Programmé')
                .setColor('#FFA500')
                .addFields(
                    { name: '👤 Membre ciblé', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '🛡️ Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏱️ Exécution dans', value: durationStr, inline: true },
                    { name: '📝 Raison', value: reason },
                    { name: '🔗 Lien de retour', value: 'https://discord.gg/ZrZy5d9Mgd' }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [embed] });
        }

        await interaction.editReply({ 
            content: `✅ Le pré-ban de **${targetUser.tag}** a été programmé avec succès. Il sera banni dans **${durationStr}**.` 
        });
    }
};

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../supabase'); // Ajuste le chemin vers ton client Supabase

// Fonction utilitaire pour convertir la durée (ex: "5d", "3h", "15m", "30s") en ms
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
        const guildId = interaction.guild.id;
        const authorId = interaction.user.id;

        // 1. Vérifier si une sanction future existe déjà pour ce membre
        const { data: existingBan, error: checkError } = await supabase
            .from('scheduled_bans')
            .select('id, ban_at')
            .eq('guild_id', guildId)
            .eq('user_id', targetUser.id)
            .maybeSingle();

        if (checkError) {
            console.error("Erreur lors de la vérification des pré-bans existants :", checkError);
        }

        if (existingBan) {
            const banTimestamp = Math.floor(new Date(existingBan.ban_at).getTime() / 1000);
            return await interaction.editReply({ 
                content: `⚠️ Impossible de programmer ce pré-ban : **${targetUser.tag}** a déjà une sanction programmée qui s'exécutera le <t:${banTimestamp}:F> (<t:${banTimestamp}:R>).\n\n*Utilise \`/unpre-ban\` si tu souhaites annuler ou modifier la sanction actuelle.*` 
            });
        }

        // 2. Validation de la durée
        const durationMs = parseDuration(durationStr);
        if (!durationMs || durationMs <= 0) {
            return interaction.editReply({ 
                content: "❌ Format de durée invalide. Utilise par exemple : `30s`, `15m`, `3h`, `2d`." 
            });
        }

        const banAt = new Date(Date.now() + durationMs);

        // 3. Enregistrement persistant dans Supabase
        const { error: insertError } = await supabase.from('scheduled_bans').insert([{
            user_id: targetUser.id,
            guild_id: guildId,
            author_id: authorId,
            reason: reason,
            ban_at: banAt.toISOString()
        }]);

        if (insertError) {
            console.error("Erreur insertion pré-ban :", insertError);
            return interaction.editReply({ content: "❌ Erreur lors de l'enregistrement en base de données." });
        }

        // 4. Message Privé (MP) au membre ciblé
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Avertissement : Sanction programmée')
                .setColor('#E74C3C')
                .setDescription(`Tu as été programmé pour un bannissement sur le serveur **${interaction.guild.name}**.`)
                .addFields(
                    { name: '⏱️ Temps avant application', value: durationStr, inline: true },
                    { name: '📝 Raison', value: reason },
                    { name: '🔗 Lien de retour (si non définitif)', value: 'https://discord.gg/ZrZy5d9Mgd' }
                )
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })

            await targetUser.send({ embeds: [dmEmbed] });
        } catch (dmErr) {
            console.warn(`Impossible d'envoyer un MP à ${targetUser.tag}.`);
        }

        // 5. Log dans le salon dédié : 1552573413850218587
        const logChannelId = '1552573413850218587';
        const logChannel = interaction.guild.channels.cache.get(logChannelId);

        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('⏳ Nouveau Pré-Ban Programmé')
                .setColor('#FFA500')
                .addFields(
                    { name: '👤 Membre ciblé', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                    { name: '🛡️ Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '⏱️ Exécution dans', value: durationStr, inline: true },
                    { name: '📝 Raison', value: reason },
                    { name: '🔗 Lien de retour', value: 'https://discord.gg/ZrZy5d9Mgd' }
                )
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })


            await logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.editReply({ 
            content: `✅ Le pré-ban de **${targetUser.tag}** a été programmé. Un message privé lui a été envoyé et il sera banni dans **${durationStr}**.` 
        });
    }
};

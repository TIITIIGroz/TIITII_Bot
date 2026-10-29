const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unpre-ban')
        .setDescription('Annule un bannissement différé programmé')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('membre')
                .setDescription('Le membre dont tu veux annuler le pré-ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('Raison de l\'annulation (optionnel)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        await interaction.deferReply({ flags: [1 << 6] }); // Réponse éphémère

        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const guildId = interaction.guild.id;

        try {
            // 1. Suppression du pré-ban dans Supabase
            const { data, error } = await supabase
                .from('scheduled_bans')
                .delete()
                .eq('guild_id', guildId)
                .eq('user_id', targetUser.id)
                .select();

            if (error) throw error;

            // Si aucune ligne n'a été supprimée
            if (!data || data.length === 0) {
                return await interaction.editReply({ 
                    content: `⚠️ **${targetUser.tag}** n'a aucun pré-ban en attente.` 
                });
            }

            // 2. Envoi du Message Privé (MP)
            let dmSent = true;
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('✅ Sanction annulée')
                    .setColor('#2ECC71')
                    .setDescription(`Bonne nouvelle ! Le bannissement différé qui te ciblait sur **${interaction.guild.name}** a été **annulé**.`)
                    .addFields({ name: '📝 Raison de l\'annulation', value: reason })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (dmErr) {
                dmSent = false;
                console.warn(`Impossible d'envoyer un MP à ${targetUser.tag} (DMs fermés).`);
            }

            // 3. Log sécurisé dans le salon dédié : 1552573413850218587
            try {
                const logChannel = await interaction.guild.channels.fetch('1552573413850218587').catch(() => null);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🟢 Pré-Ban Annulé')
                        .setColor('#2ECC71')
                        .addFields(
                            { name: '👤 Membre concerné', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                            { name: '🛡️ Modérateur', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '📝 Raison de l\'annulation', value: reason },
                            { name: '📩 MP envoyé', value: dmSent ? 'Oui' : 'Non (DMs fermés)', inline: true }
                        )
                        .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (logErr) {
                console.error("Erreur d'envoi du log de pré-ban :", logErr);
            }

            // 4. Confirmation finale à l'utilisateur
            await interaction.editReply({ 
                content: `✅ Le pré-ban de **${targetUser.tag}** a bien été annulé.${dmSent ? ' Un message privé lui a été envoyé.' : ' (MP non envoyé : DMs fermés)'}` 
            });

        } catch (err) {
            console.error("Erreur lors de l'annulation du pré-ban :", err);
            await interaction.editReply({ 
                content: "❌ Une erreur est survenue lors de l'annulation du pré-ban." 
            });
        }
    }
};

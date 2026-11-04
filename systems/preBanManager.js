const { EmbedBuilder } = require('discord.js');
const supabase = require('../supabase');

function initPreBanChecker(client) {
    // Vérification toutes les 30 secondes
    setInterval(async () => {
        try {
            const now = new Date().toISOString();

            // Récupère tous les pré-bans dont l'heure est dépassée
            const { data: bans, error } = await supabase
                .from('scheduled_bans')
                .select('*')
                .lte('ban_at', now);

            if (error) {
                console.error("Erreur lors de la vérification des pré-bans:", error);
                return;
            }

            if (!bans || bans.length === 0) return;

            for (const ban of bans) {
                try {
                    const guild = await client.guilds.fetch(ban.guild_id);
                    if (!guild) continue;

                    // Exécution du bannissement sur Discord
                    await guild.members.ban(ban.user_id, { 
                        reason: `Pré-ban expiré. Raison initiale : ${ban.reason}` 
                    });

                    // Log de l'exécution dans le salon 1552573413850218587 avec un Embed ROUGE
                    const logChannel = guild.channels.cache.get('1552573413850218587');
                    if (logChannel) {
                        const banLogEmbed = new EmbedBuilder()
                            .setTitle('🔨 Pré-Ban Exécuté (Membre Banni)')
                            .setColor('#E74C3C') // <-- Couleur ROUGE demandée
                            .addFields(
                                { name: '👤 Membre banni', value: `<@${ban.user_id}> (\`${ban.user_id}\`)`, inline: true },
                                { name: '📝 Raison', value: ban.reason },
                                { name: '🔗 Lien de retour', value: 'https://discord.gg/ZrZy5d9Mgd' }
                            )
                            .setTimestamp()
                            .setFooter({ 
                                text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                                    timeZone: 'Europe/Paris', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                })}` 
                            });

                        await logChannel.send({ embeds: [banLogEmbed] });
                    }

                } catch (banErr) {
                    console.error(`Impossible de bannir l'utilisateur ${ban.user_id}:`, banErr);
                }

                // Suppression de l'entrée en BDD pour ne pas la relancer en boucle
                await supabase
                    .from('scheduled_bans')
                    .delete()
                    .eq('id', ban.id);
            }

        } catch (err) {
            console.error("Erreur dans la boucle du pré-ban:", err);
        }
    }, 30000);
}

module.exports = initPreBanChecker;

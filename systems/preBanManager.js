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

                    // Log de l'exécution dans le salon 1552573413850218587
                    const logChannel = guild.channels.cache.get('1552573413850218587');
                    if (logChannel) {
                        logChannel.send(`🔨 Le délai est écoulé : <@${ban.user_id}> vient d'être **banni** automatiquement (Raison : ${ban.reason}) | Lien de retour : https://discord.gg/ZrZy5d9Mgd`);
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

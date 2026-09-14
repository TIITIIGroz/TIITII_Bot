const { Events } = require('discord.js');
// Si tu as un fichier de base de données (ex: pool pg ou supabase), importe-le ici :
// const pool = require('../../path/to/your/db');

module.exports = (client) => {
    // Vérification toutes les 60 secondes (60000 ms)
    setInterval(async () => {
        try {
            // Parcourt tous les serveurs où est le bot
            for (const guild of client.guilds.cache.values()) {
                // Parcourt tous les salons vocaux du serveur
                for (const channel of guild.channels.cache.values()) {
                    if (!channel.isVoiceBased()) continue;

                    // Parcourt tous les membres connectés dans ce salon vocal (en excluant les bots)
                    for (const member of channel.members.values()) {
                        if (member.user.bot) continue;

                        const VOICE_XP_AMOUNT = 5; // 👈 Moins d'XP qu'à l'écrit

                        // TODO: Insère ici ta logique d'ajout d'XP en base de données pour member.id
                        // Exemple en SQL / Supabase :
                        /*
                        await pool.query(
                            `INSERT INTO user_xp (user_id, guild_id, xp) VALUES ($1, $2, $3)
                             ON CONFLICT (user_id, guild_id) DO UPDATE SET xp = user_xp.xp + $3`,
                            [member.id, guild.id, VOICE_XP_AMOUNT]
                        );
                        */
                        
                        // console.log(`+${VOICE_XP_AMOUNT} XP vocal pour ${member.user.tag}`);
                    }
                }
            }
        } catch (error) {
            console.error("Erreur lors de l'attribution de l'XP vocal :", error);
        }
    }, 60000); // 60 secondes
};

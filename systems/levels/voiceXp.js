const pool = require('./database');
const { getLevelFromXp } = require('./level');
const { checkAndReward } = require('./rewards');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    // Vérification toutes les 60 secondes (60000 ms)
    setInterval(async () => {
        try {
            // Parcourt tous les serveurs du bot
            for (const guild of client.guilds.cache.values()) {
                // Parcourt tous les salons vocaux
                for (const channel of guild.channels.cache.values()) {
                    if (!channel.isVoiceBased()) continue;

                    // Parcourt les membres connectés dans le vocal (on ignore les bots)
                    for (const member of channel.members.values()) {
                        if (member.user.bot) continue;

                        const userId = member.id;
                        const guildId = guild.id;
                        const voiceXpEarned = 2; // 👈 Moins d'XP qu'à l'écrit (ajuste si tu veux 3 ou 5)

                        // Vérifie si l'utilisateur existe déjà en BDD
                        const res = await pool.query(
                            `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
                            [userId, guildId]
                        );
                        let user = res.rows[0];

                        if (user) {
                            const newXp = parseInt(user.xp) + voiceXpEarned;
                            const newTotalXp = parseInt(user.totalxp) + voiceXpEarned;
                            const newLevel = getLevelFromXp(newTotalXp);
                            const oldLevel = parseInt(user.level);

                            // Mise à jour de l'XP en BDD
                            await pool.query(
                                `UPDATE users SET xp = $1, totalXp = $2, level = $3 WHERE userId = $4 AND guildId = $5`,
                                [newXp, newTotalXp, newLevel, userId, guildId]
                            );

                            // Gestion du passage de niveau si l'XP vocal le fait monter
                            if (newLevel > oldLevel) {
                                await checkAndReward(member, newLevel);
                                
                                const channelId = "1011649291124744212";
                                const targetChannel = client.channels.cache.get(channelId);
                                
                                if (targetChannel) {
                                    const levelUpEmbed = new EmbedBuilder()
                                        .setColor('#3498DB')
                                        .setDescription(`***<@${userId}>*** !\n\nTu viens de passer _niveau ${newLevel}_ grâce au vocal !\n\nYou just passed _level ${newLevel}_ via voice!`);

                                    await targetChannel.send({ embeds: [levelUpEmbed] });
                                }
                            }
                        } else {
                            // Si l'utilisateur n'a jamais écrit ni gagné d'XP, on l'initialise
                            const newLevel = getLevelFromXp(voiceXpEarned);
                            const now = Date.now();
                            await pool.query(
                                `INSERT INTO users (userId, guildId, xp, totalXp, level, messages, lastMessage, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                                [userId, guildId, voiceXpEarned, voiceXpEarned, newLevel, 0, now, now]
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error("❌ Erreur dans le système d'XP vocal :", error);
        }
    }, 60000); // S'exécute toutes les 60 secondes
};

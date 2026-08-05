const pool = require('./database');
const config = require('./config');
const { getRandomXp, isValidMessage } = require('./utils');
const { getLevelFromXp } = require('./level');
const { checkAndReward } = require('./rewards');

async function handleXpMessage(message, client) {
    if (!isValidMessage(message)) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    try {
        // Récupérer l'utilisateur dans Supabase
        const res = await pool.query(
            `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
            [userId, guildId]
        );
        let user = res.rows[0];

        if (user) {
            // Vérifier le cooldown
            if (now - user.lastmessage < config.COOLDOWN) return;

            const xpEarned = getRandomXp();
            const newXp = user.xp + xpEarned;
            const newTotalXp = user.totalxp + xpEarned;
            const newMessages = user.messages + 1;
            const newLevel = getLevelFromXp(newTotalXp);
            const oldLevel = user.level;

            // Mettre à jour l'utilisateur
            await pool.query(
                `UPDATE users SET xp = $1, totalXp = $2, level = $3, messages = $4, lastMessage = $5 WHERE userId = $6 AND guildId = $7`,
                [newXp, newTotalXp, newLevel, newMessages, now, userId, guildId]
            );

            // Vérifier si l'utilisateur a monté de niveau
            if (newLevel > oldLevel) {
                await checkAndReward(message.member, newLevel);

                const channelId = config.LEVELUP_CHANNEL_ID || message.channel.id;
                const targetChannel = client.channels.cache.get(channelId);

                if (targetChannel) {
                    await targetChannel.send(`🎉 Félicitations <@${userId}> ! Tu passes au niveau **${newLevel}** ! 👑`);
                }
            }
        } else {
            // Créer l'utilisateur s'il n'existe pas encore
            const xpEarned = getRandomXp();
            const newLevel = getLevelFromXp(xpEarned);

            await pool.query(
                `INSERT INTO users (userId, guildId, xp, totalXp, level, messages, lastMessage, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, guildId, xpEarned, xpEarned, newLevel, 1, now, now]
            );
        }
    } catch (err) {
        console.error("❌ Erreur dans le système d'XP :", err);
    }
}

module.exports = {
    handleXpMessage
};

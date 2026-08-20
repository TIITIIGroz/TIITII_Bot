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
        const res = await pool.query(
            `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
            [userId, guildId]
        );
        let user = res.rows[0];

        if (user) {
            // PostgreSQL renvoie les colonnes en minuscules
            if (now - parseInt(user.lastmessage) < config.COOLDOWN) return;

            const xpEarned = getRandomXp();
            const newXp = parseInt(user.xp) + xpEarned;
            const newTotalXp = parseInt(user.totalxp) + xpEarned;
            const newMessages = parseInt(user.messages) + 1;
            const newLevel = getLevelFromXp(newTotalXp);
            const oldLevel = parseInt(user.level);

            await pool.query(
                `UPDATE users SET xp = $1, totalXp = $2, level = $3, messages = $4, lastMessage = $5 WHERE userId = $6 AND guildId = $7`,
                [newXp, newTotalXp, newLevel, newMessages, now, userId, guildId]
            );

            if (newLevel > oldLevel) {
                await checkAndReward(message.member, newLevel);
                const channelId = config.LEVELUP_CHANNEL_ID || message.channel.id;
                const targetChannel = client.channels.cache.get(channelId);
                if (targetChannel) {
                    // Nouveau format de message demandé (sans embed)
                    const levelUpMessage = `***<@${userId}>*** !\n\nTu viens de passer _niveau ${newLevel}_ !\n\n You just passed _level ${newLevel}_ !`;
                    await targetChannel.send(levelUpMessage);
                }
            }
        } else {
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

module.exports = { handleXpMessage };

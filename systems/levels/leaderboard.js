const pool = require('./database');

async function getLeaderboard(guildId) {
    try {
        const result = await pool.query(
            `SELECT userid, totalxp, level, messages FROM users WHERE guildId = $1 ORDER BY totalxp DESC LIMIT 10`,
            [guildId]
        );
        return result.rows || [];
    } catch (err) {
        console.error("❌ Erreur lors de la récupération du leaderboard :", err.message);
        throw err;
    }
}

module.exports = {
    getLeaderboard
};

const pool = require('../systems/levels/database');

// Système de cache pour éviter de faire des requêtes Supabase à chaque message
const cache = new Map();

async function getIgnoredChannels(guildId) {
    if (cache.has(guildId)) {
        return cache.get(guildId);
    }

    try {
        const result = await pool.query(
            `SELECT channelid FROM ignored_channels WHERE guildid = $1`,
            [guildId]
        );
        const channels = result.rows.map(row => row.channelid);
        cache.set(guildId, channels);
        return channels;
    } catch (err) {
        console.error("Erreur lors de la récupération des salons ignorés :", err);
        return [];
    }
}

// Fonction pour vérifier si un salon est ignoré
async function isChannelIgnored(guildId, channelId) {
    const ignored = await getIgnoredChannels(guildId);
    return ignored.includes(channelId);
}

module.exports = { getIgnoredChannels, isChannelIgnored };

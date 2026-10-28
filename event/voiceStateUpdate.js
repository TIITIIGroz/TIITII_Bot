const pool = require('../systems/levels/database');

// Map pour stocker l'instant où un utilisateur rejoint un vocal : "guildId-userId" -> { channelId, timestamp }
const voiceSessions = new Map();

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const guildId = newState.guild.id;
        const userId = member.id;
        const key = `${guildId}-${userId}`;

        const oldChannelId = oldState.channelId;
        const newChannelId = newState.channelId;

        // 1. L'utilisateur rejoint un salon vocal ou change de salon
        if (!oldChannelId && newChannelId) {
            voiceSessions.set(key, { channelId: newChannelId, timestamp: Date.now() });
        } 
        // 2. L'utilisateur quitte un salon vocal ou change de salon
        else if (oldChannelId && (!newChannelId || oldChannelId !== newChannelId)) {
            const session = voiceSessions.get(key);
            if (session) {
                const durationSeconds = Math.floor((Date.now() - session.timestamp) / 1000);

                if (durationSeconds > 5) { // On n'enregistre pas les micro-connexions de moins de 5 secondes
                    try {
                        await pool.query(
                            `INSERT INTO server_voice_activity (guildid, userid, channelid, duration_seconds) VALUES ($1, $2, $3, $4)`,
                            [guildId, userId, session.channelId, durationSeconds]
                        );
                    } catch (err) {
                        console.error("Erreur lors de l'enregistrement du temps vocal :", err);
                    }
                }
            }

            // Si l'utilisateur a juste changé de salon, on relance une session pour le nouveau salon
            if (newChannelId) {
                voiceSessions.set(key, { channelId: newChannelId, timestamp: Date.now() });
            } else {
                voiceSessions.delete(key);
            }
        }
    },
};

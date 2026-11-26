const tmi = require('tmi.js');

const DISCORD_CHANNEL_ID = '987031560945553418'; // Remplace par l'ID du salon Discord cible
const TWITCH_CHANNEL = 'tiitii_groz';            // Chaîne Twitch à lire (en minuscules)

module.exports = (client) => {
    const twitchClient = new tmi.Client({
        options: { debug: false },
        connection: {
            secure: true,
            reconnect: true
        },
        channels: [TWITCH_CHANNEL]
    });

    twitchClient.connect().catch(err => {
        console.error('❌ [TwitchChatReader] Erreur de connexion au tchat Twitch :', err);
    });

    twitchClient.on('connected', (addr, port) => {
        console.log(`📺 [TwitchChatReader] Connecté au tchat Twitch (#${TWITCH_CHANNEL}) sur ${addr}:${port}`);
    });

    twitchClient.on('message', async (channel, tags, message, self) => {
        if (self) return;
        if (!message || !message.trim()) return;

        const username = tags['display-name'] || tags.username || 'Inconnu';

        // Protège contre les pings @everyone / @here et respecte la limite de 2000 caractères de Discord
        const safeMessage = message
            .replace(/@everyone/gi, '@\u200beveryone')
            .replace(/@here/gi, '@\u200bhere')
            .slice(0, 1900);

        try {
            const discordChannel = await client.channels.fetch(DISCORD_CHANNEL_ID).catch(() => null);
            if (!discordChannel) {
                console.warn(`⚠️ [TwitchChatReader] Salon Discord introuvable : ${DISCORD_CHANNEL_ID}`);
                return;
            }

            await discordChannel.send(`${username}: ${safeMessage}`);
        } catch (err) {
            console.error('❌ [TwitchChatReader] Erreur lors de l’envoi vers Discord :', err);
        }
    });
};

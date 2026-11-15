const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. Ignorer les messages des bots et les propres messages du bot
        if (message.author.bot || message.author.id === client.user.id) return;

        // 2. FILTRE STRICT : Uniquement en Messages Privés (DM), ignore les serveurs
        if (message.guild) return;

        const content = message.content.toLowerCase();

        // Expression régulière pour détecter "réseau", "réseaux", "social", "liens", "twitch", "tiktok", "discord", etc.
        const socialsRegex = /\b(reseaux?|réseaux?|socials?|liens?|links?|twitch|tiktok|discord|youtube)\w*\b/i;

        if (socialsRegex.test(content)) {
            const logsChannelId = "1552573413850218587";
            const inviteLink = "https://discord.gg/ZrZy5d9Mgd";

            try {
                const socialsResponseText = `
🇫🇷 ___**Français**___ 🇫🇷

Bonjour ! 

Tu souhaites retrouver mes réseaux et mes liens ? Les voici :

___**Tous les liens de TIITII_Groz:**___

• **Serveur Discord :** ${inviteLink}
• **Twitch :** https://twitch.tv/TIITII_Groz
• **TikTok :** https://tiktok.com/@TIITII_Groz
• **YouTube :** https://youtube.com/@TIITII_Groz

----------------------------------------------

🇬🇧 ___**English**___ 🇬🇧

Hello! 

Looking for my social media and links? Here they are:

___**All the links of TIITII_Groz:**___

• **Server Discord :** ${inviteLink}
• **Twitch :** https://twitch.tv/TIITII_Groz
• **TikTok :** https://tiktok.com/@TIITII_Groz
• **YouTube :** https://youtube.com/@TIITII_Groz
                `.trim();

                // Répondre directement en MP à la personne
                await message.reply(socialsResponseText);

                // Envoyer la notification dans ton salon de logs
                const logsChannel = client.channels.cache.get(logsChannelId);
                if (logsChannel) {
                    await logsChannel.send(`🛡️ **${message.author.tag}** vient de m'envoyer un message pour les réseaux en MP, j'ai répondu.`);
                }

            } catch (error) {
                console.error("❌ Erreur dans le système de détection des réseaux en MP :", error);
            }
        }
    },
};

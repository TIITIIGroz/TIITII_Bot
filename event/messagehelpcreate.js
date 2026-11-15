const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. Ignorer les messages des bots et les propres messages du bot
        if (message.author.bot || message.author.id === client.user.id) return;

        // 2. FILTRE STRICT : Si le message vient d'un serveur (guild), on l'ignore totalement !
        // Le bot ne réagit QUE s'il est en Message Privé (DM).
        if (message.guild) return;

        const content = message.content.toLowerCase();

        // Expression régulière pour détecter "aide", "aider", "aidons", "aides", etc., ou "help", "helping", "helps", etc.
        const helpRegex = /\b(aid\w*|help\w*)\b/i;

        if (helpRegex.test(content)) {
            const serverName = "𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛";
            const helpChannelId = "988382286221299813";
            const logsChannelId = "1552573413850218587";
            const inviteLink = "https://discord.gg/nuRh7bjYRk";

            try {
                const helpResponseText = `
🇫🇷 ___**Français**___ 🇫🇷

Bonjour !
J'ai remarqué que tu parlais d'aide.
Si tu as besoin d'assistance sur le serveur **${serverName}**, n'hésite pas à te rendre dans le salon d'aide <#${helpChannelId}> ou à rejoindre notre communauté et demander de l'aide:
${inviteLink}.

----------------------------------------------

🇬🇧 ___**English**___ 🇬🇧

Hello!
I noticed you were talking about help.
If you need assistance on the **${serverName}** server, feel free to check out the help channel <#${helpChannelId}> or join our community and ask for help:
${inviteLink}.
                `.trim();

                // Répondre directement en MP à la personne
                await message.reply(helpResponseText);

                // 2. Envoyer le message de notification dans le salon de logs (sur ton serveur principal)
                const logsChannel = client.channels.cache.get(logsChannelId);
                if (logsChannel) {
                    await logsChannel.send(`🛡️ **${message.author.tag}** vient de m'envoyer un message d'aide en MP, j'ai répondu.`);
                }

            } catch (error) {
                console.error("❌ Erreur dans le système de détection d'aide en MP :", error);
            }
        }
    },
};

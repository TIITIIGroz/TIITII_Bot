const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate, // ou simplement 'messageCreate'
    async execute(message, client) {
        // Ignorer les messages des bots pour éviter les boucles infinies
        if (message.author.bot) return;

        const content = message.content.toLowerCase();

        // Expression régulière pour détecter "aide", "aider", "aidons", "aides", etc., ou "help", "helping", "helps", etc.
        const helpRegex = /\b(aid\w*|help\w*)\b/i;

        if (helpRegex.test(content)) {
            const serverName = "𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛";
            const helpChannelId = "988382286221299813";
            const logsChannelId = "1552573413850218587";
            const inviteLink = "https://discord.gg/ZrZy5d9Mgd";

            try {
                // 1. Envoyer le message privé (ou réponse) à l'utilisateur avec la version Française et Anglaise
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

                // Envoyer en MP si possible, sinon en réponse dans le salon
                await message.author.send(helpResponseText).catch(() => {
                    return message.reply(helpResponseText);
                });

                // 2. Envoyer le message de notification dans le salon de logs
                const logsChannel = client.channels.cache.get(logsChannelId);
                if (logsChannel) {
                    await logsChannel.send(`🛡️ **${message.author.tag}** vient d'envoyer un message d'aide, j'ai répondu.`);
                }

            } catch (error) {
                console.error("❌ Erreur dans le système de détection d'aide :", error);
            }
        }
    },
};

const { Events } = require('discord.js');

const ADMIS_ROLE_ID = '1492064548101034076';
const RULES_ROLE_ID = '894668498180124703'; 

const RULES_CHANNEL_ID = '864920115270909972';
const LANG_CHANNEL_ID = '896545873570455553';

// Salons de discussion où envoyer les messages de bienvenue selon la langue
const FR_CHAT_CHANNEL_ID = '894671498965561394'; // Remplace par l'ID de ton salon de discussion FR si besoin
const EN_CHAT_CHANNEL_ID = '1026121915951230987'; // Remplace par l'ID de ton salon de discussion EN si besoin

const FR_ROLE_ID = '1094758355085574204';
const EN_ROLE_ID = '1094758180938067989';

const rulesMessages = new Map();
const langMessages = new Map(); 
const welcomeChatSent = new Map(); // Anti-spam pour éviter l'envoi répété dans les chats de discussion

async function deleteUserMentionMessage(channel, userId, knownMsgId = null) {
    if (!channel) return;

    if (knownMsgId) {
        const msg = await channel.messages.fetch(knownMsgId).catch(() => null);
        if (msg) {
            await msg.delete().catch(() => {});
            return;
        }
    }

    const fetchedMessages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (fetchedMessages) {
        const targetMsg = fetchedMessages.find(m => m.author.id === channel.client.user.id && m.content.includes(`<@${userId}>`));
        if (targetMsg) {
            await targetMsg.delete().catch(() => {});
        }
    }
}

module.exports = (client) => {
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const hadAdmis = oldMember.roles.cache.has(ADMIS_ROLE_ID);
        const hasAdmis = newMember.roles.cache.has(ADMIS_ROLE_ID);

        const hadRulesRole = oldMember.roles.cache.has(RULES_ROLE_ID);
        const hasRulesRole = newMember.roles.cache.has(RULES_ROLE_ID);

        const hadFr = oldMember.roles.cache.has(FR_ROLE_ID);
        const hasFr = newMember.roles.cache.has(FR_ROLE_ID);

        const hadEn = oldMember.roles.cache.has(EN_ROLE_ID);
        const hasEn = newMember.roles.cache.has(EN_ROLE_ID);

        const hadLang = hadFr || hadEn;
        const hasLang = hasFr || hasEn;

        // 1. Obtention du rôle "admis"
        if (!hadAdmis && hasAdmis) {
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            if (rulesChannel && !hasRulesRole) {
                const existingMsgId = rulesMessages.get(newMember.id);
                if (!existingMsgId) {
                    const msgRules = await rulesChannel.send(
                        `<@${newMember.id}> Lisez et acceptez en appuyant sur le bouton ✅\n\n----------------------------------------------\n<@${newMember.id}> Read and accept by pressing the button ✅`
                    ).catch(() => null);
                    if (msgRules) rulesMessages.set(newMember.id, msgRules.id);
                }
            }
        }

        // 2. Validation des règles
        if (!hadRulesRole && hasRulesRole) {
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(rulesChannel, newMember.id, rulesMessages.get(newMember.id));
            rulesMessages.delete(newMember.id);

            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel && !hasLang) {
                const existingLangMsgId = langMessages.get(newMember.id);
                if (!existingLangMsgId) {
                    const msgLang = await langChannel.send(
                        `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                    ).catch(() => null);
                    if (msgLang) langMessages.set(newMember.id, msgLang.id);
                }
            }
        }

        // 3. Sélection de la ou des langues -> Envoi dans les discussions selon le choix
        if (!hadLang && hasLang) {
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(langChannel, newMember.id, langMessages.get(newMember.id));
            langMessages.delete(newMember.id);

            // Vérification anti-spam (s'assure que le message de discussion n'a pas déjà été envoyé récemment)
            if (!welcomeChatSent.get(newMember.id)) {
                welcomeChatSent.set(newMember.id, true);

                // Si le membre a choisi le Français
                if (hasFr) {
                    const frChat = await newMember.guild.channels.fetch(FR_CHAT_CHANNEL_ID).catch(() => null);
                    if (frChat) {
                        await frChat.send(`Bienvenue en français ! ${newMember} vient de nous rejoindre 🇫🇷`);
                    }
                }

                // Si le membre a choisi l'Anglais
                if (hasEn) {
                    const enChat = await newMember.guild.channels.fetch(EN_CHAT_CHANNEL_ID).catch(() => null);
                    if (enChat) {
                        await enChat.send(`Welcome in English! ${newMember} just joined us 🇬🇧`);
                    }
                }

                // Reset du verrou anti-spam après 30 secondes pour de futures modifications si nécessaire
                setTimeout(() => {
                    welcomeChatSent.delete(newMember.id);
                }, 30000);
            }
        }

        // 4. Retrait de toutes les langues -> Relance unique
        if (hadLang && !hasLang && hasAdmis) {
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel) {
                const existingLangMsgId = langMessages.get(newMember.id);
                if (!existingLangMsgId) {
                    const msgLang = await langChannel.send(
                        `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                    ).catch(() => null);
                    if (msgLang) langMessages.set(newMember.id, msgLang.id);
                }
            }
        }
    });
};

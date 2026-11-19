const { Events } = require('discord.js');

const ADMIS_ROLE_ID = '1492064548101034076';
const RULES_ROLE_ID = '894668498180124703'; 

const RULES_CHANNEL_ID = '864920115270909972';
const LANG_CHANNEL_ID = '896545873570455553';

// Salons de discussion où envoyer les messages de bienvenue selon la langue
const FR_CHAT_CHANNEL_ID = '894671498965561394';
const EN_CHAT_CHANNEL_ID = '1026121915951230987';

const FR_ROLE_ID = '1094758355085574204';
const EN_ROLE_ID = '1094758180938067989';

const DELAY_MS = 45000; // 45 secondes d'attente avant d'identifier la personne

const rulesMessages = new Map();
const langMessages = new Map(); 
const rulesTimers = new Map(); // Minuteurs en attente pour les règles
const langTimers = new Map();  // Minuteurs en attente pour la langue
const welcomeChatSent = new Map();

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

        // 1. Obtention du rôle "admis" -> Attente de 45s avant de mentionner dans le salon règles
        if (!hadAdmis && hasAdmis && !hasRulesRole) {
            if (!rulesTimers.has(newMember.id) && !rulesMessages.has(newMember.id)) {
                const timer = setTimeout(async () => {
                    rulesTimers.delete(newMember.id);

                    // Re-vérifier l'état actuel du membre après les 45 secondes
                    const freshMember = await newMember.guild.members.fetch(newMember.id).catch(() => null);
                    if (!freshMember || !freshMember.roles.cache.has(ADMIS_ROLE_ID) || freshMember.roles.cache.has(RULES_ROLE_ID)) {
                        return;
                    }

                    const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
                    if (rulesChannel && !rulesMessages.has(newMember.id)) {
                        const msgRules = await rulesChannel.send(
                            `<@${newMember.id}> Lisez et acceptez en appuyant sur le bouton ✅\n\n----------------------------------------------\n<@${newMember.id}> Read and accept by pressing the button ✅`
                        ).catch(() => null);
                        if (msgRules) rulesMessages.set(newMember.id, msgRules.id);
                    }
                }, DELAY_MS);

                rulesTimers.set(newMember.id, timer);
            }
        }

        // 2. Validation des règles -> Annule le timer/supprime le message règles + Attente de 45s pour la langue
        if (!hadRulesRole && hasRulesRole) {
            if (rulesTimers.has(newMember.id)) {
                clearTimeout(rulesTimers.get(newMember.id));
                rulesTimers.delete(newMember.id);
            }

            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(rulesChannel, newMember.id, rulesMessages.get(newMember.id));
            rulesMessages.delete(newMember.id);

            if (!hasLang && !langTimers.has(newMember.id) && !langMessages.has(newMember.id)) {
                const timer = setTimeout(async () => {
                    langTimers.delete(newMember.id);

                    // Re-vérifier l'état actuel du membre après les 45 secondes
                    const freshMember = await newMember.guild.members.fetch(newMember.id).catch(() => null);
                    if (!freshMember) return;

                    const currentlyHasLang = freshMember.roles.cache.has(FR_ROLE_ID) || freshMember.roles.cache.has(EN_ROLE_ID);
                    if (currentlyHasLang) return;

                    const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
                    if (langChannel && !langMessages.has(newMember.id)) {
                        const msgLang = await langChannel.send(
                            `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                        ).catch(() => null);
                        if (msgLang) langMessages.set(newMember.id, msgLang.id);
                    }
                }, DELAY_MS);

                langTimers.set(newMember.id, timer);
            }
        }

        // 3. Sélection de la ou des langues -> Annule le timer/supprime le message langue + Envoi bienvenue
        if (!hadLang && hasLang) {
            if (langTimers.has(newMember.id)) {
                clearTimeout(langTimers.get(newMember.id));
                langTimers.delete(newMember.id);
            }

            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(langChannel, newMember.id, langMessages.get(newMember.id));
            langMessages.delete(newMember.id);

            if (!welcomeChatSent.get(newMember.id)) {
                welcomeChatSent.set(newMember.id, true);

                if (hasFr) {
                    const frChat = await newMember.guild.channels.fetch(FR_CHAT_CHANNEL_ID).catch(() => null);
                    if (frChat) {
                        await frChat.send(`Bienvenue en français ! ${newMember} vient de nous rejoindre 🇫🇷`);
                    }
                }

                if (hasEn) {
                    const enChat = await newMember.guild.channels.fetch(EN_CHAT_CHANNEL_ID).catch(() => null);
                    if (enChat) {
                        await enChat.send(`Welcome in English! ${newMember} just joined us 🇬🇧`);
                    }
                }

                setTimeout(() => {
                    welcomeChatSent.delete(newMember.id);
                }, 30000);
            }
        }

        // 4. Retrait de toutes les langues -> Relance unique après 45 secondes
        if (hadLang && !hasLang && hasAdmis) {
            if (!langTimers.has(newMember.id) && !langMessages.has(newMember.id)) {
                const timer = setTimeout(async () => {
                    langTimers.delete(newMember.id);

                    const freshMember = await newMember.guild.members.fetch(newMember.id).catch(() => null);
                    if (!freshMember || !freshMember.roles.cache.has(ADMIS_ROLE_ID)) return;

                    const currentlyHasLang = freshMember.roles.cache.has(FR_ROLE_ID) || freshMember.roles.cache.has(EN_ROLE_ID);
                    if (currentlyHasLang) return;

                    const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
                    if (langChannel && !langMessages.has(newMember.id)) {
                        const msgLang = await langChannel.send(
                            `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                        ).catch(() => null);
                        if (msgLang) langMessages.set(newMember.id, msgLang.id);
                    }
                }, DELAY_MS);

                langTimers.set(newMember.id, timer);
            }
        }
    });
};

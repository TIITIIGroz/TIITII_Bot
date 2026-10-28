const { Events } = require('discord.js');

const ADMIS_ROLE_ID = '1492064548101034076';
const RULES_ROLE_ID = '894668498180124703'; // ID du rôle attribué lors de l'acceptation des règles

const RULES_CHANNEL_ID = '864920115270909972';
const LANG_CHANNEL_ID = '896545873570455553';

const FR_ROLE_ID = '1094758355085574204';
const EN_ROLE_ID = '1094758180938067989';

// Mémorisation temporaire des IDs de messages
const rulesMessages = new Map(); // userId -> messageId
const langMessages = new Map();  // userId -> messageId

// Fonction utilitaire pour chercher et supprimer un message ciblant un utilisateur
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

        const hadLang = oldMember.roles.cache.has(FR_ROLE_ID) || oldMember.roles.cache.has(EN_ROLE_ID);
        const hasLang = newMember.roles.cache.has(FR_ROLE_ID) || newMember.roles.cache.has(EN_ROLE_ID);

        // 1. Obtention du rôle "admis" -> Envoi unique du message des règles d'abord
        if (!hadAdmis && hasAdmis) {
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            if (rulesChannel && !hasRulesRole) {
                // Vérifie s'il n'a pas déjà un message en cours pour éviter les doublons
                const existingMsgId = rulesMessages.get(newMember.id);
                if (!existingMsgId) {
                    const msgRules = await rulesChannel.send(
                        `<@${newMember.id}> Lisez et acceptez en appuyant sur le bouton ✅\n\n----------------------------------------------\n<@${newMember.id}> Read and accept by pressing the button ✅`
                    ).catch(() => null);
                    if (msgRules) rulesMessages.set(newMember.id, msgRules.id);
                }
            }
        }

        // 2. Validation des règles -> Suppression propre du message des règles ET envoi unique du message de langue juste après
        if (!hadRulesRole && hasRulesRole) {
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(rulesChannel, newMember.id, rulesMessages.get(newMember.id));
            rulesMessages.delete(newMember.id);

            // Une fois les règles acceptées, on envoie le message de langue un par un s'il ne l'a pas encore
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

        // 3. Sélection d'une ou deux langues -> Suppression propre du message Langues
        if (!hadLang && hasLang) {
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            await deleteUserMentionMessage(langChannel, newMember.id, langMessages.get(newMember.id));
            langMessages.delete(newMember.id);
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

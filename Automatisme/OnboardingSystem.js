const { Events } = require('discord.js');

const ADMIS_ROLE_ID = '1492064548101034076';
const RULES_CHANNEL_ID = '864920115270909972';
const LANG_CHANNEL_ID = '896545873570455553';
const FR_ROLE_ID = '1094758355085574204';
const EN_ROLE_ID = '1094758180938067989';

// Cartes pour stocker l'ID des messages envoyés par utilisateur
const rulesMessages = new Map(); // userId -> messageId
const langMessages = new Map();  // userId -> messageId

module.exports = (client) => {
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const hadAdmis = oldMember.roles.cache.has(ADMIS_ROLE_ID);
        const hasAdmis = newMember.roles.cache.has(ADMIS_ROLE_ID);

        const hadLang = oldMember.roles.cache.has(FR_ROLE_ID) || oldMember.roles.cache.has(EN_ROLE_ID);
        const hasLang = newMember.roles.cache.has(FR_ROLE_ID) || newMember.roles.cache.has(EN_ROLE_ID);

        // 1. Obtention du rôle "admis" -> Envoi des messages d'identification
        if (!hadAdmis && hasAdmis) {
            // Salon des Règles
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            if (rulesChannel) {
                const msgRules = await rulesChannel.send(
                    `<@${newMember.id}> Lisez et acceptez en appuyant sur le bouton ✅\n\n----------------------------------------------\nRead and accept by pressing the button ✅`
                ).catch(() => null);
                if (msgRules) rulesMessages.set(newMember.id, msgRules.id);
            }

            // Salon Choix de Langue
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel && !hasLang) {
                const msgLang = await langChannel.send(
                    `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                ).catch(() => null);
                if (msgLang) langMessages.set(newMember.id, msgLang.id);
            }
        }

        // 2. Attribution d'une langue -> Suppression du message de langue
        if (!hadLang && hasLang) {
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel && langMessages.has(newMember.id)) {
                const msgId = langMessages.get(newMember.id);
                const msg = await langChannel.messages.fetch(msgId).catch(() => null);
                if (msg) await msg.delete().catch(() => {});
                langMessages.delete(newMember.id);
            }
        }

        // 3. Perte de toutes les langues alors que le membre est toujours admis -> Relance
        if (hadLang && !hasLang && hasAdmis) {
            const langChannel = await newMember.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel) {
                const msgLang = await langChannel.send(
                    `<@${newMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${newMember.id}> don’t forget to choose your language !`
                ).catch(() => null);
                if (msgLang) langMessages.set(newMember.id, msgLang.id);
            }
        }
    });
};

const { Events } = require('discord.js');

const PRE_JEU_ROLE_ID = '1573018817112571914'; // Rôle "pré jeu"
const FR_ROLE_ID = '1094758355085574204';      // Rôle FR
const EN_ROLE_ID = '1094758180938067989';      // Rôle EN

const TARGET_ROLES = [
    '1533558027825840218',
    '1509584318203433001'
];

// Verrou temporaire pour éviter que deux événements simultanés ne bouclent sur le même membre
const processingMembers = new Set();

async function syncPreJeuRoles(member) {
    if (!member || member.user.bot) return;
    if (processingMembers.has(member.id)) return;

    processingMembers.add(member.id);

    try {
        const hasPreJeu = member.roles.cache.has(PRE_JEU_ROLE_ID);
        const hasFr = member.roles.cache.has(FR_ROLE_ID);
        const hasEn = member.roles.cache.has(EN_ROLE_ID);
        const hasLang = hasFr || hasEn;

        const hasAllTargetRoles = TARGET_ROLES.every(roleId => member.roles.cache.has(roleId));
        const hasAnyTargetRole = TARGET_ROLES.some(roleId => member.roles.cache.has(roleId));

        // CAS 1 : La personne a "pré jeu" ET a choisi au moins une langue (FR et/ou EN)
        // -> On retire "pré jeu" et on ajoute les deux rôles cibles
        if (hasPreJeu && hasLang) {
            await member.roles.remove(PRE_JEU_ROLE_ID).catch(err =>
                console.error(`❌ Erreur retrait rôle pré jeu pour ${member.user.tag} :`, err)
            );

            const rolesToAdd = TARGET_ROLES.filter(roleId => !member.roles.cache.has(roleId));
            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd).catch(err =>
                    console.error(`❌ Erreur ajout rôles finaux pour ${member.user.tag} :`, err)
                );
            }
        }
        // CAS 2 : La personne n'a AUCUNE langue (ni FR ni EN), mais avait déjà les rôles finaux (ou vient de retirer sa langue)
        // -> On lui retire les rôles finaux et on lui remet "pré jeu"
        else if (!hasLang && (hasAnyTargetRole || hasAllTargetRoles)) {
            const rolesToRemove = TARGET_ROLES.filter(roleId => member.roles.cache.has(roleId));
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove).catch(err =>
                    console.error(`❌ Erreur retrait rôles finaux pour ${member.user.tag} :`, err)
                );
            }

            if (!hasPreJeu) {
                await member.roles.add(PRE_JEU_ROLE_ID).catch(err =>
                    console.error(`❌ Erreur réattribution rôle pré jeu pour ${member.user.tag} :`, err)
                );
            }
        }
    } finally {
        setTimeout(() => {
            processingMembers.delete(member.id);
        }, 1000);
    }
}

module.exports = (client) => {
    // 1. Vérification à chaque changement de rôle sur le serveur
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const watchedRoles = [PRE_JEU_ROLE_ID, FR_ROLE_ID, EN_ROLE_ID, ...TARGET_ROLES];
        const hasRelevantChange = watchedRoles.some(
            roleId => oldMember.roles.cache.has(roleId) !== newMember.roles.cache.has(roleId)
        );

        if (!hasRelevantChange) return;

        await syncPreJeuRoles(newMember);
    });

    // 2. Vérification au démarrage du bot pour les membres qui auraient déjà "pré jeu" + une langue en attente
    client.once(Events.ClientReady, () => {
        setTimeout(async () => {
            for (const [, guild] of client.guilds.cache) {
                for (const [, member] of guild.members.cache) {
                    if (member.roles.cache.has(PRE_JEU_ROLE_ID)) {
                        await syncPreJeuRoles(member);
                    }
                }
            }
        }, 15000);
    });
};

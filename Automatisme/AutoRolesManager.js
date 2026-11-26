const { Events } = require('discord.js');

const processingMembers = new Set();

// ============================================================================
// ÉTAPE 1 : Rôle obligatoire si "jeu" et/ou "accès salon tiitii"
// ============================================================================

const STEP_1_TRIGGER_ROLES = [
    '1533558027825840218', // Rôle jeu
    '1269778023826067699'  // Rôle accès salon tiitii
];
const STEP_1_REQUIRED_ROLE = '1509584318203433001'; // Rôle obligatoire

async function applyStep1Rule(member) {
    if (!member || member.user.bot) return;

    const hasTrigger = STEP_1_TRIGGER_ROLES.some(roleId => member.roles.cache.has(roleId));
    const hasRequired = member.roles.cache.has(STEP_1_REQUIRED_ROLE);

    if (hasTrigger && !hasRequired) {
        await member.roles.add(STEP_1_REQUIRED_ROLE).catch(err => {
            console.error(`❌ [AutoRoles - Étape 1] Erreur ajout rôle ${STEP_1_REQUIRED_ROLE} pour ${member.user.tag} :`, err);
        });
    }
}

// ============================================================================
// ÉTAPE 2 : Rôle obligatoire instantané pour les rôles staff / ticket / king / co-fondateur
// ============================================================================

const STEP_2_TRIGGER_ROLES = [
    '894668340902125618',  // King
    '1012357140679229511', // Co fondateur
    '894669520902451220',  // Ministre
    '1534812883081232545', // Ministre twitch
    '987485855474147368',  // Modo
    '1549456282392465418', // Apprenti modo
    '1008853465415553075'  // Ticket
];
const STEP_2_REQUIRED_ROLE = '1575389500820029441'; // Rôle obligatoire instantané

async function applyStep2Rule(member) {
    if (!member || member.user.bot) return;

    const hasTrigger = STEP_2_TRIGGER_ROLES.some(roleId => member.roles.cache.has(roleId));
    const hasRequired = member.roles.cache.has(STEP_2_REQUIRED_ROLE);

    if (hasTrigger && !hasRequired) {
        await member.roles.add(STEP_2_REQUIRED_ROLE).catch(err => {
            console.error(`❌ [AutoRoles - Étape 2] Erreur ajout rôle ${STEP_2_REQUIRED_ROLE} pour ${member.user.tag} :`, err);
        });
    }
}

// ============================================================================
// EXÉCUTION GLOBALE DE TOUTES LES ÉTAPES
// ============================================================================

async function evaluateAllRules(member) {
    if (!member || member.user.bot) return;
    if (processingMembers.has(member.id)) return;

    processingMembers.add(member.id);
    try {
        await applyStep1Rule(member);
        await applyStep2Rule(member);
    } finally {
        setTimeout(() => {
            processingMembers.delete(member.id);
        }, 400);
    }
}

module.exports = (client) => {
    const allWatchedIds = [
        ...STEP_1_TRIGGER_ROLES,
        STEP_1_REQUIRED_ROLE,
        ...STEP_2_TRIGGER_ROLES,
        STEP_2_REQUIRED_ROLE
    ];

    // 1. À chaque mise à jour des rôles d'un membre
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const changed = allWatchedIds.some(
            id => oldMember.roles.cache.has(id) !== newMember.roles.cache.has(id)
        );

        if (!changed) return;
        await evaluateAllRules(newMember);
    });

    // 2. À l'arrivée d'un membre
    client.on(Events.GuildMemberAdd, async (member) => {
        await evaluateAllRules(member);
    });

    // 3. Vérification au démarrage du bot (sur le cache existant, sans fetch massif)
    client.once(Events.ClientReady, () => {
        setTimeout(async () => {
            for (const [, guild] of client.guilds.cache) {
                for (const [, member] of guild.members.cache) {
                    await evaluateAllRules(member);
                }
            }
        }, 12000);
    });
};

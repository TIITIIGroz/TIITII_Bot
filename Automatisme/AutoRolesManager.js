const { Events } = require('discord.js');

// ============================================================================
// CONFIGURATION DES RÈGLES AUTOMATIQUES (PAR ÉTAPES)
// ============================================================================

// --- ÉTAPE 1 : Rôle obligatoire si "jeu" et/ou "accès salon tiitii" ---
const STEP_1_TRIGGER_ROLES = [
    '1533558027825840218', // Rôle jeu
    '1269778023826067699'  // Rôle accès salon tiitii
];
const STEP_1_REQUIRED_ROLE = '1509584318203433001'; // Rôle obligatoire

// ============================================================================

const processingMembers = new Set();

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

async function evaluateAllRules(member) {
    if (!member || member.user.bot) return;
    if (processingMembers.has(member.id)) return;

    processingMembers.add(member.id);
    try {
        // Exécution des étapes dans l'ordre
        await applyStep1Rule(member);
    } finally {
        setTimeout(() => {
            processingMembers.delete(member.id);
        }, 800);
    }
}

module.exports = (client) => {
    // 1. À chaque mise à jour des rôles d'un membre
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const watchedIds = [...STEP_1_TRIGGER_ROLES, STEP_1_REQUIRED_ROLE];
        const changed = watchedIds.some(
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

const config = require('./config');

async function checkAndReward(member, newLevel) {
    // 1. Rôle obligatoire unique (ex: niveau 1 ou plus)
    const mandatoryRoleId = "1509577333584171038";
    if (mandatoryRoleId && newLevel >= 1) {
        const mandatoryRole = member.guild.roles.cache.get(mandatoryRoleId);
        if (mandatoryRole && !member.roles.cache.has(mandatoryRoleId)) {
            await member.roles.add(mandatoryRole).catch(err => 
                console.error(`❌ Impossible d'attribuer le rôle obligatoire :`, err)
            );
        }
    }

    // 2. Gestion cumulative de TOUS les rôles de niveaux mérités jusqu'à présent
    if (!config.LEVEL_ROLES) return;

    for (const [levelThreshold, rolesConfig] of Object.entries(config.LEVEL_ROLES)) {
        const threshold = parseInt(levelThreshold);
        
        // Si le membre a atteint ou dépassé ce palier
        if (newLevel >= threshold) {
            const rolesToAssign = Array.isArray(rolesConfig) ? rolesConfig : [rolesConfig];

            for (const roleId of rolesToAssign) {
                const role = member.guild.roles.cache.get(roleId);
                if (role) {
                    try {
                        if (!member.roles.cache.has(roleId)) {
                            await member.roles.add(role);
                            console.log(`🎁 Rattrapage/Attribution : Rôle ${role.name} attribué à ${member.user.tag} (Niv. Actuel: ${newLevel} >= Palier ${threshold})`);
                        }
                    } catch (error) {
                        console.error(`❌ Erreur attribution rôle ${role.name} à ${member.user.tag} :`, error);
                    }
                }
            }
        }
    }
}

module.exports = {
    checkAndReward
};

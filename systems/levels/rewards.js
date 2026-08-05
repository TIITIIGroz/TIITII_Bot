const config = require('./config');

async function checkAndReward(member, newLevel) {
    // Vérifie si un rôle est configuré pour ce niveau exact
    const roleId = config.LEVEL_ROLES[newLevel];
    if (!roleId) return; // Pas de rôle pour ce niveau

    const role = member.guild.roles.cache.get(roleId);
    if (!role) {
        console.warn(`⚠️ Le rôle avec l'ID ${roleId} configuré pour le niveau ${newLevel} est introuvable sur le serveur.`);
        return;
    }

    try {
        // Vérifie si le membre a déjà le rôle pour éviter les doublons
        if (!member.roles.cache.has(roleId)) {
            await member.roles.add(role);
            console.log(`👑 Rôle ${role.name} attribué avec succès à ${member.user.tag} (Niveau ${newLevel})`);
        }
    } catch (error) {
        console.error(`❌ Impossible d'attribuer le rôle ${role.name} à ${member.user.tag} :`, error);
    }
}

module.exports = {
    checkAndReward
};

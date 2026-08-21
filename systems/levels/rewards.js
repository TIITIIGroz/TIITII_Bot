async function checkAndReward(member, newLevel) {
    // ID du rôle obligatoire unique à attribuer (remplace par ton ID de rôle)
    const mandatoryRoleId = "1509577333584171038"; 

    // Si l'utilisateur atteint le niveau 1 ou plus
    if (newLevel >= 1) {
        const role = member.guild.roles.cache.get(mandatoryRoleId);
        if (!role) {
            console.warn(`⚠️ Le rôle obligatoire avec l'ID ${mandatoryRoleId} est introuvable sur le serveur.`);
            return;
        }

        try {
            // Vérifie si le membre a déjà le rôle pour éviter les doublons
            if (!member.roles.cache.has(mandatoryRoleId)) {
                await member.roles.add(role);
                console.log(`👑 Rôle obligatoire ${role.name} attribué avec succès à ${member.user.tag} (Niveau ${newLevel})`);
            }
        } catch (error) {
            console.error(`❌ Impossible d'attribuer le rôle obligatoire ${role.name} à ${member.user.tag} :`, error);
        }
    }
}

module.exports = {
    checkAndReward
};

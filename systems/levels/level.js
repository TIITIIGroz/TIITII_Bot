// Formule pour calculer l'XP nécessaire pour atteindre un niveau donné (Inspirée de MEE6)
// Formule standard : 5 * (niveau ^ 2) + 50 * niveau + 100
function getXpForLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

// Fonction pour déterminer le niveau d'un joueur en fonction de son XP total
function calculateLevel(totalXp) {
    let level = 0;
    while (totalXp >= getXpForLevel(level)) {
        totalXp -= getXpForLevel(level);
        level++;
    }
    return level;
}

// Calcule l'XP actuel et l'XP requis pour le niveau en cours
function getLevelProgress(totalXp) {
    let level = 0;
    let xpRemaining = totalXp;
    
    while (xpRemaining >= getXpForLevel(level)) {
        xpRemaining -= getXpForLevel(level);
        level++;
    }
    
    const xpRequired = getXpForLevel(level);
    return {
        level: level,
        currentXp: xpRemaining,
        requiredXp: xpRequired
    };
}

module.exports = {
    getXpForLevel,
    calculateLevel,
    getLevelProgress
};

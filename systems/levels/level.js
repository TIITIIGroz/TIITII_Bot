// Formule pour calculer l'XP nécessaire pour atteindre un niveau donné (Inspirée de MEE6)
// Formule standard : 5 * (niveau ^ 2) + 50 * niveau + 100
function getXpForLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

// Fonction pour déterminer le niveau d'un joueur en fonction de son XP total
function getLevelFromXp(totalXp) {
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
    let xpNeeded = getXpForLevel(level);

    // Tant qu'on a assez d'XP pour passer au niveau supérieur, on déduit le coût du palier
    while (totalXp >= xpNeeded) {
        totalXp -= xpNeeded;
        level++;
        xpNeeded = getXpForLevel(level);
    }

    return {
        level: level,
        currentXp: totalXp,     // L'XP actuel accumulé dans le niveau en cours
        requiredXp: xpNeeded    // L'XP total requis pour valider ce niveau
    };
}

module.exports = {
    getXpForLevel,
    calculateLevel: getLevelFromXp, // Gardé au cas où un autre fichier l'appelle ainsi
    getLevelFromXp,
    getLevelProgress
};

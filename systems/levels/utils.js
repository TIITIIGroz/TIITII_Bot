const config = require('./config');

function getRandomXp() {
    return Math.floor(Math.random() * (config.XP_MAX - config.XP_MIN + 1)) + config.XP_MIN;
}

function isValidMessage(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;

    // 1. Vérifier si le salon est exclu
    if (config.EXCLUDED_CHANNELS.includes(message.channel.id)) return false;

    // 2. Vérifier si l'utilisateur possède un rôle exclu
    if (message.member && config.EXCLUDED_ROLES) {
        const hasExcludedRole = config.EXCLUDED_ROLES.some(roleId => message.member.roles.cache.has(roleId));
        if (hasExcludedRole) return false;
    }

    // 3. Vérifier les conditions du message (texte minimum ou image)
    const hasValidText = message.content && message.content.length >= config.MIN_CHARACTERS;
    const hasImage = message.attachments.size > 0;

    if (!hasValidText && !hasImage) return false;

    return true;
}

module.exports = {
    getRandomXp,
    isValidMessage
};

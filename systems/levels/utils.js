const config = require('./config');

function getRandomXp() {
    return Math.floor(Math.random() * (config.XP_MAX - config.XP_MIN + 1)) + config.XP_MIN;
}

function isValidMessage(message) {
    if (message.author.bot) {
        // console.log("Rejeté : c'est un bot");
        return false;
    }
    if (!message.guild) {
        console.log("Rejeté : pas sur un serveur (guild)");
        return false;
    }

    // 1. Vérifier si le salon est exclu
    if (config.EXCLUDED_CHANNELS && config.EXCLUDED_CHANNELS.includes(message.channel.id)) {
        console.log(`Rejeté : salon exclu (${message.channel.id})`);
        return false;
    }

    // 2. Vérifier si l'utilisateur possède un rôle exclu
    if (message.member && config.EXCLUDED_ROLES) {
        const hasExcludedRole = config.EXCLUDED_ROLES.some(roleId => message.member.roles.cache.has(roleId));
        if (hasExcludedRole) {
            console.log("Rejeté : l'utilisateur a un rôle exclu");
            return false;
        }
    }

    // 3. Vérifier les conditions du message (texte minimum ou image)
    const minChars = config.MIN_CHARACTERS || 1; // Sécurité au cas où c'est undefined
    const hasValidText = message.content && message.content.length >= minChars;
    const hasImage = message.attachments.size > 0;

    if (!hasValidText && !hasImage) {
        console.log(`Rejeté : message trop court (${message.content?.length || 0} car. / min requis : ${minChars}) ou sans image`);
        return false;
    }

    console.log("✅ Message validé avec succès !");
    return true;
}

module.exports = {
    getRandomXp,
    isValidMessage
};

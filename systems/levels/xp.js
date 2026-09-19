const pool = require('./database');
const config = require('./config');
const { getRandomXp, isValidMessage } = require('./utils');
const { getLevelFromXp } = require('./level');
const { checkAndReward } = require('./rewards');
const { EmbedBuilder } = require('discord.js');

async function handleXpMessage(message, client) {
    // 🔍 TEST BRUT : S'affiche dès qu'un message passe par l'événement
    console.log(`🔍 [TEST BRUT] Message capté de ${message.author?.tag} (Bot: ${message.author?.bot}) dans le salon ${message.channel?.id}`);

    if (!isValidMessage(message)) {
        console.log(`🔍 [TEST BRUT] Message rejeté par isValidMessage()`);
        return;
    }

    // 🔒 RÔLES PRISON : Si l'utilisateur a l'un des rôles, il ne gagne aucun XP textuel
    const PRISON_ROLES = ["1549495761761214484", "913882559363043388"];
    if (message.member && message.member.roles.cache.some(role => PRISON_ROLES.includes(role.id))) {
        console.log(`🔒 [XP TEXTE BLOQUÉ] ${message.author.tag} est en prison.`);
        return;
    }

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    console.log(`💬 [DEBUG XP] Message valide de ${message.author.tag} dans la guilde ${guildId}`);

    try {
        console.log(`💬 [DEBUG XP] Étape 1 : Requête SELECT dans la BDD...`);
        const res = await pool.query(
            `SELECT * FROM users WHERE userId = $1 AND guildId = $2`,
            [userId, guildId]
        );
        let user = res.rows[0];
        console.log(`💬 [DEBUG XP] Étape 1 réussie. Utilisateur trouvé ? ${user ? "Oui" : "Non (Création)"}`);

        if (user) {
            if (now - parseInt(user.lastmessage) < config.COOLDOWN) {
                console.log(`💬 [DEBUG XP] Ignoré (Cooldown actif).`);
                return;
            }

            const xpEarned = getRandomXp();
            const newXp = parseInt(user.xp) + xpEarned;
            const newTotalXp = parseInt(user.totalxp) + xpEarned;
            const newMessages = parseInt(user.messages) + 1;
            const newLevel = getLevelFromXp(newTotalXp);
            const oldLevel = parseInt(user.level);

            console.log(`💬 [DEBUG XP] Étape 2 : Requête UPDATE en cours...`);
            await pool.query(
                `UPDATE users SET xp = $1, totalXp = $2, level = $3, messages = $4, lastMessage = $5 WHERE userId = $6 AND guildId = $7`,
                [newXp, newTotalXp, newLevel, newMessages, now, userId, guildId]
            );
            console.log(`💬 [DEBUG XP] Étape 2 réussie (Update OK).`);

            if (newLevel > oldLevel) {
                console.log(`🎉 [DEBUG XP] Level Up ! Passage du niveau ${oldLevel} au niveau ${newLevel}`);
                await checkAndReward(message.member, newLevel);
                
                const channelId = "1011649291124744212";
                const targetChannel = client.channels.cache.get(channelId);
                
                if (targetChannel) {
                    const levelUpEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setDescription(`***<@${userId}>*** !\n\nTu viens de passer _niveau ${newLevel}_ !\n\nYou just passed _level ${newLevel}_ !`);

                    await targetChannel.send({ embeds: [levelUpEmbed] });
                }
            }
        } else {
            const xpEarned = getRandomXp();
            const newLevel = getLevelFromXp(xpEarned);
            console.log(`💬 [DEBUG XP] Étape 2b : Insertion d'un nouvel utilisateur...`);
            await pool.query(
                `INSERT INTO users (userId, guildId, xp, totalXp, level, messages, lastMessage, createdAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [userId, guildId, xpEarned, xpEarned, newLevel, 1, now, now]
            );
            console.log(`💬 [DEBUG XP] Insertion réussie.`);
        }
    } catch (err) {
        console.error("❌ ERREUR CRITIQUE dans le système d'XP texte :", err);
    }
}

module.exports = { handleXpMessage };

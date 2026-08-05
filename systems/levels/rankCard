const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getLevelProgress } = require('./level');

async function generateRankCard(member, userData) {
    // 1. Création du canvas (dimensions 930x282 pour un format bannière élégant)
    const canvas = createCanvas(930, 282);
    const ctx = canvas.getContext('2d');

    // 2. Fond bordeaux/sombre aux couleurs de Famille Groz
    ctx.fillStyle = '#18191c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Décoration de fond subtile (rectangle stylisé)
    ctx.fillStyle = '#800020'; // Rouge bordeaux
    ctx.fillRect(24, 24, 882, 234);

    // Intérieur sombre de la carte
    ctx.fillStyle = '#2f3136';
    ctx.fillRect(28, 28, 874, 226);

    // 3. Calculs de progression pour la barre d'XP
    const totalXp = userData.totalXp || 0;
    const progress = getLevelProgress(totalXp);
    
    const currentXp = progress.currentXp;
    const requiredXp = progress.requiredXp;
    const level = progress.level;

    // 4. Barre de progression XP
    const barX = 260;
    const barY = 175;
    const barWidth = 600;
    const barHeight = 30;

    // Fond de la barre
    ctx.fillStyle = '#1e1f22';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 15);
    ctx.fill();

    // Remplissage de la barre selon le pourcentage
    const percentage = Math.min(Math.max(currentXp / requiredXp, 0), 1);
    const fillWidth = barWidth * percentage;
    if (fillWidth > 0) {
        ctx.fillStyle = '#800020'; // Bordeaux
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, 15);
        ctx.fill();
    }

    // 5. Textes (Pseudo, Niveau, XP)
    // Nom d'utilisateur
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    const username = member.user.username;
    ctx.fillText(username, 260, 110);

    // Texte Niveau et XP (aligné à droite)
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.textAlign = 'right';
    ctx.fillText(`NIVEAU ${level}`, 860, 75);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#8e9297';
    ctx.fillText(`${currentXp} / ${requiredXp} XP`, 860, 150);

    ctx.textAlign = 'left'; // Reset alignment

    // 6. Avatar du membre (circulaire)
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    try {
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        // Cercle positionné à gauche (X: 140, Y: 141, Rayon: 75)
        ctx.arc(140, 141, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 65, 66, 150, 150);
        ctx.restore();

        // Contour de l'avatar
        ctx.strokeStyle = '#800020';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(140, 141, 75, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        console.error("❌ Erreur lors du chargement de l'avatar pour la carte rank :", e);
    }

    // 7. Génération du fichier final à envoyer sur Discord
    const buffer = canvas.toBuffer('image/png');
    return new AttachmentBuilder(buffer, { name: 'rank-card.png' });
}

module.exports = {
    generateRankCard
};

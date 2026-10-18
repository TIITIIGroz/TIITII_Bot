const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events 
} = require('discord.js');
const crypto = require('crypto');
const Confession = require('../../models/Confession');

const CONFESSION_CHANNEL_ID = "1561085138350383185";
const LOGS_CONFESSION_CHANNEL_ID = "1561152254520590449";

const SECRET_PASSWORD = process.env.CONFESSION_PASSWORD || "4321confession";

// Persistance globale en mémoire pour la session de numéro d'embed
if (global.confessionCounter === undefined) {
    global.confessionCounter = 1;
}
if (global.replyCounter === undefined) {
    global.replyCounter = 1;
}

function encryptUserId(userId, password) {
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(userId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// Convertisseur de couleurs basiques (hex ou noms)
function parseColor(inputColor, defaultColor = '#2ECC71') {
    if (!inputColor) return defaultColor;
    const colorLower = inputColor.trim().toLowerCase();
    const colorMap = {
        'red': '#FF0000',
        'rouge': '#FF0000',
        'blue': '#0000FF',
        'bleu': '#0000FF',
        'green': '#00FF00',
        'vert': '#00FF00',
        'yellow': '#FFFF00',
        'jaune': '#FFFF00',
        'purple': '#800080',
        'violet': '#800080',
        'pink': '#FFC0CB',
        'rose': '#FFC0CB',
        'black': '#000001',
        'noir': '#000001',
        'white': '#FFFFFF',
        'blanc': '#FFFFFF',
        'orange': '#FFA500',
        'cyan': '#00FFFF'
    };

    if (colorMap[colorLower]) return colorMap[colorLower];
    if (/^#?[0-9A-Fa-f]{6}$/.test(colorLower)) {
        return colorLower.startsWith('#') ? colorLower : `#${colorLower}`;
    }
    return defaultColor;
}

module.exports = (client) => {

    client.on(Events.InteractionCreate, async (interaction) => {

        // --- CLIC SUR BOUTON ---
        if (interaction.isButton()) {

            if (interaction.customId === 'btn_open_confession') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_submit_confession')
                    .setTitle('Nouvelle confession / New confession');

                const inputContent = new TextInputBuilder()
                    .setCustomId('confession_content')
                    .setLabel('Contenu / Content *')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Écris ta confession ici / Write your confession here...')
                    .setRequired(true)
                    .setMaxLength(3000);

                const inputCode = new TextInputBuilder()
                    .setCustomId('confession_code')
                    .setLabel('Code (Obligatoire / Required) *')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: secret123, monCode, etc.')
                    .setRequired(true)
                    .setMaxLength(50);

                const inputColor = new TextInputBuilder()
                    .setCustomId('confession_color')
                    .setLabel('Custom Color')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: ff0000, #ff0000, red, bleu, etc.')
                    .setRequired(false);

                const inputMedia = new TextInputBuilder()
                    .setCustomId('confession_media')
                    .setLabel('Lien Fichier / Media Link (Optionnel)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Lien direct image/vidéo (https://...)')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputContent),
                    new ActionRowBuilder().addComponents(inputCode),
                    new ActionRowBuilder().addComponents(inputColor),
                    new ActionRowBuilder().addComponents(inputMedia)
                );

                return await interaction.showModal(modal);
            }

            if (interaction.customId.startsWith('btn_reply_confession_')) {
                const confessionId = interaction.customId.replace('btn_reply_confession_', '');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_submit_reply_${confessionId}`)
                    .setTitle('Réponse / Answer');

                const inputReply = new TextInputBuilder()
                    .setCustomId('reply_content')
                    .setLabel('Réponse / Answer *')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Écris ta réponse anonyme / Write your answer here...')
                    .setRequired(true)
                    .setMaxLength(3000);

                const inputCode = new TextInputBuilder()
                    .setCustomId('reply_code')
                    .setLabel('Code (Obligatoire / Required) *')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: rep123, secretCode, etc.')
                    .setRequired(true)
                    .setMaxLength(50);

                const inputColor = new TextInputBuilder()
                    .setCustomId('reply_color')
                    .setLabel('Custom Color')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: ff0000, #ff0000, red, bleu, etc.')
                    .setRequired(false);

                const inputMedia = new TextInputBuilder()
                    .setCustomId('reply_media')
                    .setLabel('Lien Fichier / Media Link (Optionnel)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Lien direct image/vidéo (https://...)')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputReply),
                    new ActionRowBuilder().addComponents(inputCode),
                    new ActionRowBuilder().addComponents(inputColor),
                    new ActionRowBuilder().addComponents(inputMedia)
                );

                return await interaction.showModal(modal);
            }
        }

        // --- SOUMISSION DU FORMULAIRE ---
        if (interaction.isModalSubmit()) {

            // Confession
            if (interaction.customId === 'modal_submit_confession') {
                await interaction.deferReply({ flags: [1 << 6] });

                const content = interaction.fields.getTextInputValue('confession_content');
                const userCode = interaction.fields.getTextInputValue('confession_code').toLowerCase().trim();
                const rawColor = interaction.fields.getTextInputValue('confession_color');
                const mediaUrl = interaction.fields.getTextInputValue('confession_media');
                
                // Vérifier si le code existe déjà dans MongoDB
                const existingEntry = await Confession.findOne({ code: userCode });
                if (existingEntry) {
                    return await interaction.editReply({ 
                        content: `❌ **Le code \`${userCode}\` est déjà utilisé !** Veuillez en choisir un autre.` 
                    });
                }

                const embedColor = parseColor(rawColor, '#2ECC71');
                const currentNum = global.confessionCounter++;

                const confessionEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`🤫 Confession #${currentNum}`)
                    .setDescription(content)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });

                if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
                    confessionEmbed.setImage(mediaUrl);
                }

                const buttonsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_open_confession')
                        .setLabel('Confession')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`btn_reply_confession_${currentNum}`)
                        .setLabel('Répondre / Answer')
                        .setStyle(ButtonStyle.Primary)
                );

                const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
                if (!channel) return interaction.editReply("❌ Erreur : Salon de confession introuvable.");

                const sentMsg = await channel.send({ embeds: [confessionEmbed], components: [buttonsRow] });

                await sentMsg.startThread({
                    name: `💬 Réponses - Confession #${currentNum}`,
                    autoArchiveDuration: 1440
                }).catch(() => null);

                // Enregistrement sécurisé dans MongoDB Atlas
                const encryptedUserId = encryptUserId(interaction.user.id, SECRET_PASSWORD);
                await Confession.create({
                    code: userCode,
                    encryptedUserId: encryptedUserId,
                    content: content,
                    url: sentMsg.url
                });

                // Log dans le salon privé
                await logConfessionEncrypted(client, userCode, content, sentMsg.url, mediaUrl);

                return await interaction.editReply({ content: "✅ Ta confession anonyme a été publiée avec succès ! / Your confession has been published!" });
            }

            // Réponse
            if (interaction.customId.startsWith('modal_submit_reply_')) {
                await interaction.deferReply({ flags: [1 << 6] });

                const confessionNum = interaction.customId.replace('modal_submit_reply_', '');
                const replyContent = interaction.fields.getTextInputValue('reply_content');
                const userCode = interaction.fields.getTextInputValue('reply_code').toLowerCase().trim();
                const rawColor = interaction.fields.getTextInputValue('reply_color');
                const mediaUrl = interaction.fields.getTextInputValue('reply_media');

                // Vérifier si le code existe déjà dans MongoDB
                const existingEntry = await Confession.findOne({ code: userCode });
                if (existingEntry) {
                    return await interaction.editReply({ 
                        content: `❌ **Le code \`${userCode}\` est déjà utilisé !** Veuillez en choisir un autre.` 
                    });
                }

                const embedColor = parseColor(rawColor, '#3498DB');
                const replyNum = global.replyCounter++;

                const replyEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`💬 Réponse Anonyme à la Confession #${confessionNum}`)
                    .setDescription(replyContent)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛` })
                    .setTimestamp();

                if (mediaUrl && (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://'))) {
                    replyEmbed.setImage(mediaUrl);
                }

                const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
                let replyMsg = null;
                if (channel) {
                    const message = interaction.message || await interaction.channel.messages.fetch(interaction.reference?.messageId).catch(() => null);
                    
                    if (message && message.thread) {
                        replyMsg = await message.thread.send({ embeds: [replyEmbed] });
                    } else {
                        replyMsg = await channel.send({ embeds: [replyEmbed] });
                    }
                }

                const replyUrl = replyMsg ? replyMsg.url : null;

                // Enregistrement sécurisé dans MongoDB Atlas
                const encryptedUserId = encryptUserId(interaction.user.id, SECRET_PASSWORD);
                await Confession.create({
                    code: userCode,
                    encryptedUserId: encryptedUserId,
                    content: replyContent,
                    url: replyUrl
                });

                await logReplyEncrypted(client, userCode, confessionNum, replyContent, replyUrl, mediaUrl);

                return await interaction.editReply({ content: "✅ Ta réponse anonyme a été envoyée ! / Your answer has been sent!" });
            }
        }
    });
};

async function logConfessionEncrypted(client, codeName, content, messageUrl, mediaUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - Code: ${codeName}`)
            .addFields(
                { name: '💬 Contenu', value: content },
                { name: '🔗 Lien', value: `[Voir la confession](${messageUrl})` },
                { name: '🔑 Code d\'identification', value: `\`\`\`${codeName}\`\`\`` }
            )
            .setFooter({ text: 'Utilisez /reveal avec ce code et le mot de passe secret pour voir l\'auteur.' })
            .setTimestamp();

        if (mediaUrl) {
            logEmbed.addFields({ name: '📎 Fichier / Média joint', value: mediaUrl });
        }

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log confession :", err);
    }
}

async function logReplyEncrypted(client, codeName, confessionNum, content, messageUrl, mediaUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - Code: ${codeName} (Réponse à #${confessionNum})`)
            .addFields(
                { name: '💬 Réponse', value: content },
                { name: '🔗 Lien', value: messageUrl ? `[Voir la réponse](${messageUrl})` : "N/A" },
                { name: '🔑 Code d\'identification', value: `\`\`\`${codeName}\`\`\`` }
            )
            .setFooter({ text: 'Utilisez /reveal avec ce code et le mot de passe secret pour voir l\'auteur.' })
            .setTimestamp();

        if (mediaUrl) {
            logEmbed.addFields({ name: '📎 Fichier / Média joint', value: mediaUrl });
        }

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log réponse :", err);
    }
}

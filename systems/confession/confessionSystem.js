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

const CONFESSION_CHANNEL_ID = "1561085138350383185";
const LOGS_CONFESSION_CHANNEL_ID = "1552573413850218587";

const SECRET_PASSWORD = process.env.CONFESSION_PASSWORD || "TON_MOT_DE_PASSE_SECRET";

let confessionCounter = 1;
let replyCounter = 1;

// Stockage sécurisé en mémoire partagée globale
if (!global.confessionStorage) {
    global.confessionStorage = new Map();
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

                const inputColor = new TextInputBuilder()
                    .setCustomId('confession_color')
                    .setLabel('Custom Color (user premium only)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: ff0000, #ff0000, or red')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputContent),
                    new ActionRowBuilder().addComponents(inputColor)
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

                const inputRef = new TextInputBuilder()
                    .setCustomId('reply_ref')
                    .setLabel('Répondre à la Confession / Answer to Confession')
                    .setStyle(TextInputStyle.Short)
                    .setValue(`#${confessionId}`)
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputReply),
                    new ActionRowBuilder().addComponents(inputRef)
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
                const rawColor = interaction.fields.getTextInputValue('confession_color');
                
                let embedColor = '#2ECC71';
                if (rawColor && /^#?[0-9A-FA-f]{6}$/.test(rawColor)) {
                    embedColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
                }

                const currentNum = confessionCounter++;
                const codeName = `confess-${currentNum}`;

                const confessionEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`🤫 Confession #${currentNum}`)
                    .setDescription(content)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })
                    .setTimestamp();

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

                // Enregistrement chiffré + métadonnées (contenu et URL)
                const encryptedUserId = encryptUserId(interaction.user.id, SECRET_PASSWORD);
                global.confessionStorage.set(codeName, {
                    encryptedUserId: encryptedUserId,
                    content: content,
                    url: sentMsg.url
                });

                // Log dans le salon privé
                await logConfessionEncrypted(client, codeName, content, sentMsg.url);

                return await interaction.editReply({ content: "✅ Ta confession anonyme a été publiée avec succès ! / Your confession has been published!" });
            }

            // Réponse
            if (interaction.customId.startsWith('modal_submit_reply_')) {
                await interaction.deferReply({ flags: [1 << 6] });

                const confessionNum = interaction.customId.replace('modal_submit_reply_', '');
                const replyContent = interaction.fields.getTextInputValue('reply_content');

                const replyNum = replyCounter++;
                const codeName = `reply-${replyNum}`;

                const replyEmbed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle(`💬 Réponse Anonyme à la Confession #${confessionNum}`)
                    .setDescription(replyContent)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\` })
                    .setTimestamp();

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

                // Enregistrement chiffré + métadonnées
                const encryptedUserId = encryptUserId(interaction.user.id, SECRET_PASSWORD);
                global.confessionStorage.set(codeName, {
                    encryptedUserId: encryptedUserId,
                    content: replyContent,
                    url: replyUrl
                });

                await logReplyEncrypted(client, codeName, confessionNum, replyContent, replyUrl);

                return await interaction.editReply({ content: "✅ Ta réponse anonyme a été envoyée ! / Your answer has been sent!" });
            }
        }
    });
};

async function logConfessionEncrypted(client, codeName, content, messageUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - ${codeName}`)
            .addFields(
                { name: '💬 Contenu', value: content },
                { name: '🔗 Lien', value: `[Voir la confession](${messageUrl})` },
                { name: '🔑 Code d\'identification', value: `\`\`\`${codeName}\`\`\`` }
            )
            .setFooter({ text: 'Utilisez /reveal avec ce code et le mot de passe secret pour voir l\'auteur.' })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log confession :", err);
    }
}

async function logReplyEncrypted(client, codeName, confessionNum, content, messageUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - ${codeName} (Réponse à #${confessionNum})`)
            .addFields(
                { name: '💬 Réponse', value: content },
                { name: '🔗 Lien', value: messageUrl ? `[Voir la réponse](${messageUrl})` : "N/A" },
                { name: '🔑 Code d\'identification', value: `\`\`\`${codeName}\`\`\`` }
            )
            .setFooter({ text: 'Utilisez /reveal avec ce code et le mot de passe secret pour voir l\'auteur.' })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log réponse :", err);
    }
}

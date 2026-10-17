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

const CONFESSION_CHANNEL_ID = "1561085138350383185";
const LOGS_CONFESSION_CHANNEL_ID = "1552573413850218587"; // Nouveau salon de logs sécurisé

let confessionCounter = 1;

// Fonction de masquage / chiffrement de l'ID pour empêcher la lecture directe dans le salon de logs
function encryptUserId(userId) {
    return Buffer.from(userId).toString('base64');
}

module.exports = (client) => {

    client.on(Events.InteractionCreate, async (interaction) => {

        // --- CLIC SUR UN BOUTON ---
        if (interaction.isButton()) {

            // A. Bouton : "Confession"
            if (interaction.customId === 'btn_open_confession') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_submit_confession')
                    .setTitle('Soumettre une confession / Submit a confession');

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

            // B. Bouton : "Répondre / Answer"
            if (interaction.customId.startsWith('btn_reply_confession_')) {
                const confessionId = interaction.customId.replace('btn_reply_confession_', '');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_submit_reply_${confessionId}`)
                    .setTitle('Soumettre une réponse / Submit an answer');

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

        // --- SOUMISSION DE FORMULAIRE (MODAL) ---
        if (interaction.isModalSubmit()) {

            // A. Traitement de la Confession
            if (interaction.customId === 'modal_submit_confession') {
                await interaction.deferReply({ flags: [1 << 6] });

                const content = interaction.fields.getTextInputValue('confession_content');
                const rawColor = interaction.fields.getTextInputValue('confession_color');
                
                let embedColor = '#2ECC71';
                if (rawColor && /^#?[0-9A-FA-f]{6}$/.test(rawColor)) {
                    embedColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
                }

                const currentNum = confessionCounter++;

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

                // Logs sécurisés masqués
                await logConfessionSecurity(client, interaction, currentNum, content, sentMsg.url);

                return await interaction.editReply({ content: "✅ Ta confession anonyme a été publiée avec succès ! / Your confession has been published!" });
            }

            // B. Traitement de la Réponse Anonyme
            if (interaction.customId.startsWith('modal_submit_reply_')) {
                await interaction.deferReply({ flags: [1 << 6] });

                const confessionNum = interaction.customId.replace('modal_submit_reply_', '');
                const replyContent = interaction.fields.getTextInputValue('reply_content');

                const replyEmbed = new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle(`💬 Réponse Anonyme à la Confession #${confessionNum}`)
                    .setDescription(replyContent)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\` })
                    .setTimestamp();

                const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
                if (channel) {
                    const message = interaction.message || await interaction.channel.messages.fetch(interaction.reference?.messageId).catch(() => null);
                    
                    if (message && message.thread) {
                        await message.thread.send({ embeds: [replyEmbed] });
                    } else {
                        await channel.send({ embeds: [replyEmbed] });
                    }
                }

                await logReplySecurity(client, interaction, confessionNum, replyContent);

                return await interaction.editReply({ content: "✅ Ta réponse anonyme a été envoyée ! / Your answer has been sent!" });
            }
        }
    });
};

// 🔒 LOGS MASQUÉS & CHIFFRÉS POUR GARANTIR L'ANONYMAT VISUEL
async function logConfessionSecurity(client, interaction, num, content, messageUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const encryptedToken = encryptUserId(interaction.user.id);

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - Confession #${num}`)
            .addFields(
                { name: '🔑 Jeton de l\'auteur (Masqué)', value: `\`\`\`${encryptedToken}\`\`\``, inline: false },
                { name: '🙈 Identité (Spoiler Protect)', value: `||<@${interaction.user.id}> (${interaction.user.tag})||`, inline: false },
                { name: '💬 Contenu', value: content },
                { name: '🔗 Lien du message', value: `[Accéder à la confession](${messageUrl})` }
            )
            .setFooter({ text: 'Données protégées - Seuls les super-admins peuvent lever le spoiler en cas d\'urgence.' })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log confession :", err);
    }
}

async function logReplySecurity(client, interaction, num, content) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const encryptedToken = encryptUserId(interaction.user.id);

        const logEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle(`🔒 LOG SÉCURISÉ - Réponse à la Confession #${num}`)
            .addFields(
                { name: '🔑 Jeton de l\'auteur (Masqué)', value: `\`\`\`${encryptedToken}\`\`\``, inline: false },
                { name: '🙈 Identité (Spoiler Protect)', value: `||<@${interaction.user.id}> (${interaction.user.tag})||`, inline: false },
                { name: '💬 Réponse', value: content }
            )
            .setFooter({ text: 'Données protégées' })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log réponse :", err);
    }
}

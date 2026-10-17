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
const LOGS_CONFESSION_CHANNEL_ID = "1552184275309297675"; // Salon de logs confidentiel / privé Staff

// Compteur dynamique pour numéroter les confessions
let confessionCounter = 1;

module.exports = (client) => {

    // 1. ÉCOUTEUR D'INTERACTIONS (Boutons et Modals)
    client.on(Events.InteractionCreate, async (interaction) => {

        // --- CLIC SUR UN BOUTON ---
        if (interaction.isButton()) {

            // A. Bouton : "Confession" (Ouvrir le formulaire de confession)
            if (interaction.customId === 'btn_open_confession') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_submit_confession')
                    .setTitle('Soumettre une confession');

                const inputContent = new TextInputBuilder()
                    .setCustomId('confession_content')
                    .setLabel('Contenu de la Confession')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Écris ta confession ici...')
                    .setRequired(true)
                    .setMaxLength(3000);

                const inputColor = new TextInputBuilder()
                    .setCustomId('confession_color')
                    .setLabel('Custom Color (Ex: #FF0000 ou #2ECC71)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: ff0000, #ff0000, ou red')
                    .setRequired(false);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(inputContent),
                    new ActionRowBuilder().addComponents(inputColor)
                );

                return await interaction.showModal(modal);
            }

            // B. Bouton : "Répondre" (Ouvrir le formulaire de réponse)
            if (interaction.customId.startsWith('btn_reply_confession_')) {
                const confessionId = interaction.customId.replace('btn_reply_confession_', '');

                const modal = new ModalBuilder()
                    .setCustomId(`modal_submit_reply_${confessionId}`)
                    .setTitle('Soumettre une Réponse');

                const inputReply = new TextInputBuilder()
                    .setCustomId('reply_content')
                    .setLabel('Réponse')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Écris ta réponse anonyme...')
                    .setRequired(true)
                    .setMaxLength(3000);

                const inputRef = new TextInputBuilder()
                    .setCustomId('reply_ref')
                    .setLabel('Répondre à la Confession')
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
                await interaction.deferReply({ flags: [1 << 6] }); // Éphémère pour garder l'anonymat

                const content = interaction.fields.getTextInputValue('confession_content');
                const rawColor = interaction.fields.getTextInputValue('confession_color');
                
                // Couleur personnalisée ou couleur par défaut
                let embedColor = '#2ECC71';
                if (rawColor && /^#?[0-9A-FA-f]{6}$/.test(rawColor)) {
                    embedColor = rawColor.startsWith('#') ? rawColor : `#${rawColor}`;
                }

                const currentNum = confessionCounter++;

                const confessionEmbed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(`🤫 Confession #${currentNum}`)
                    .setDescription(content)
                    .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐~ - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })
                    .setTimestamp();

                const buttonsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_open_confession')
                        .setLabel('Confession')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`btn_reply_confession_${currentNum}`)
                        .setLabel('Répondre')
                        .setStyle(ButtonStyle.Primary)
                );

                const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
                if (!channel) return interaction.editReply("❌ Erreur : Salon de confession introuvable.");

                // 1. Envoi de la confession
                const sentMsg = await channel.send({ embeds: [confessionEmbed], components: [buttonsRow] });

                // 2. Création automatique du Fil de discussion (Thread) pour regrouper les réponses
                const thread = await sentMsg.startThread({
                    name: `💬 Réponses - Confession #${currentNum}`,
                    autoArchiveDuration: 1440
                }).catch(() => null);

                // 3. Envoi des LOGS Sécurisés (Staff / Modération)
                await logConfessionSecurity(client, interaction, currentNum, content, sentMsg.url);

                return await interaction.editReply({ content: "✅ Ta confession anonyme a été publiée avec succès !" });
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

                // Chercher le message de la confession parent
                const channel = interaction.guild.channels.cache.get(CONFESSION_CHANNEL_ID);
                if (channel) {
                    const message = interaction.message || await interaction.channel.messages.fetch(interaction.reference?.messageId).catch(() => null);
                    
                    if (message && message.thread) {
                        await message.thread.send({ embeds: [replyEmbed] });
                    } else {
                        // Si pas de thread, poster en réponse directe sous la confession
                        await channel.send({ embeds: [replyEmbed] });
                    }
                }

                // Logs de sécurité pour la réponse
                await logReplySecurity(client, interaction, confessionNum, replyContent);

                return await interaction.editReply({ content: "✅ Ta réponse anonyme a été envoyée !" });
            }
        }
    });
};

// 🔒 LOGS SÉCURISÉS (Accessible uniquement dans un salon de logs staff privé)
async function logConfessionSecurity(client, interaction, num, content, messageUrl) {
    try {
        const logChannel = await client.channels.fetch(LOGS_CONFESSION_CHANNEL_ID).catch(() => null);
        if (!logChannel) return;

        const logEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`🕵️ LOG SÉCURITÉ - Confession #${num}`)
            .addFields(
                { name: '👤 Auteur réel', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: '🆔 User ID', value: `\`${interaction.user.id}\``, inline: true },
                { name: '📅 Date & Heure', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
                { name: '💬 Contenu', value: content },
                { name: '🔗 Lien du message', value: `[Accéder au message](${messageUrl})` }
            )
            .setFooter({ text: 'Confidentiel - Réservé à l\'administration' })
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

        const logEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle(`🕵️ LOG SÉCURITÉ - Réponse à la Confession #${num}`)
            .addFields(
                { name: '👤 Auteur réel', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: '🆔 User ID', value: `\`${interaction.user.id}\``, inline: true },
                { name: '💬 Réponse', value: content }
            )
            .setFooter({ text: 'Confidentiel - Réservé à l\'administration' })
            .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
        console.error("Erreur log réponse :", err);
    }
}

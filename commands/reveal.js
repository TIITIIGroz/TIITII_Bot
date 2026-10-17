const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const crypto = require('crypto');

const SECRET_PASSWORD = process.env.CONFESSION_PASSWORD || "TON_MOT_DE_PASSE_SECRET";

function decryptData(encryptedData, password) {
    try {
        const key = crypto.scryptSync(password, 'salt', 32);
        const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reveal')
        .setDescription('Déchiffre l\'identité de l\'auteur d\'une confession ou d\'une réponse')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Le numéro de la confession (ex: confess-1 ou reply-1)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Le mot de passe de sécurité')
                .setRequired(true)),

    async execute(interaction) {
        const code = interaction.options.getString('code').toLowerCase().trim();
        const password = interaction.options.getString('password');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Vérification du mot de passe
        if (password !== SECRET_PASSWORD) {
            return await interaction.editReply({
                content: "❌ **Échec du déchiffrement !** Le mot de passe fourni est incorrect."
            });
        }

        const confessionMap = global.confessionStorage;
        if (!confessionMap || !confessionMap.has(code)) {
            return await interaction.editReply({
                content: `❌ **Code introuvable !** Aucune confession ou réponse enregistrée sous l'identifiant \`${code}\`.`
            });
        }

        const record = confessionMap.get(code); // { encryptedUserId, content, url }
        const decryptedUserId = decryptData(record.encryptedUserId, password);

        if (!decryptedUserId) {
            return await interaction.editReply({
                content: "❌ **Erreur de déchiffrement !** Impossible d'extraire les données."
            });
        }

        try {
            const user = await interaction.client.users.fetch(decryptedUserId);
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`🔓 Identité Déchiffrée (${code})`)
                .addFields(
                    { name: '👤 Utilisateur', value: `${user.tag} (<@${user.id}>)`, inline: true },
                    { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                    { name: '💬 Contenu', value: record.content || "*Aucun contenu disponible*", inline: false }
                )
                .setFooter({ text: 'Information confidentielle - Usage administratif' })
                .setTimestamp();

            if (record.url) {
                embed.addFields({ name: '🔗 Lien du message', value: `[Accéder au message](${record.url})`, inline: false });
            }

            return await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            return await interaction.editReply({
                content: `✅ **ID trouvé pour ${code} :** \`${decryptedUserId}\`\n💬 **Contenu :** ${record.content}\n🔗 **Lien :** ${record.url || 'Non spécifié'}`
            });
        }
    }
};

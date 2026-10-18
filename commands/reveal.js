const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const crypto = require('crypto');
const Confession = require('../models/Confession');

const SECRET_PASSWORD = process.env.CONFESSION_PASSWORD || "4321confession";

function decryptData(encryptedData, password) {
    try {
        const key = crypto.scryptSync(password, 'salt', 32);
        const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
        
        if (!ivHex || !authTagHex || !encryptedText) return null;

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
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        .addStringOption(option =>
            option.setName('code')
                .setDescription('Le code saisi lors de la confession')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Le mot de passe de sécurité')
                .setRequired(true)),

    async execute(interaction) {
        const userCode = interaction.options.getString('code').toLowerCase().trim();
        const inputPassword = interaction.options.getString('password');

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // 1. Vérification du mot de passe fourni
        if (inputPassword !== SECRET_PASSWORD) {
            return await interaction.editReply({
                content: "❌ **Échec du déchiffrement !** Le mot de passe fourni est incorrect."
            });
        }

        // 2. Recherche dans la base de données MongoDB
        const record = await Confession.findOne({ code: userCode });
        if (!record) {
            return await interaction.editReply({
                content: `❌ **Code introuvable !** Aucun enregistrement trouvé dans la base de données pour le code \`${userCode}\`.`
            });
        }

        // 3. Déchiffrement de l'ID utilisateur
        const decryptedUserId = decryptData(record.encryptedUserId, inputPassword);

        if (!decryptedUserId) {
            return await interaction.editReply({
                content: "❌ **Erreur de déchiffrement !** La clé de chiffrement est invalide ou corrompue."
            });
        }

        try {
            const user = await interaction.client.users.fetch(decryptedUserId);
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle(`🔓 Identité Déchiffrée (Code: ${userCode})`)
                .addFields(
                    { name: '👤 Utilisateur', value: `${user.tag} (<@${user.id}>)`, inline: true },
                    { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                    { name: '💬 Contenu', value: record.content || "*Aucun contenu disponible*", inline: false }
                )
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\ Information confidentielle - Usage administratif` })

            if (record.url) {
                embed.addFields({ name: '🔗 Lien du message', value: `[Accéder au message](${record.url})`, inline: false });
            }

            return await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            return await interaction.editReply({
                content: `✅ **ID trouvé pour \`${userCode}\` :** \`${decryptedUserId}\`\n💬 **Contenu :** ${record.content}\n🔗 **Lien :** ${record.url || 'Non spécifié'}`
            });
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Liste des IDs Discord des personnes autorisées à utiliser cette commande
const AUTHORIZED_USERS = [
    "894668340902125618", // The King
    "1012357140679229511",  // Co-Fondateur
    "894669520902451220",  // Admin normal
    "987485855474147368",  // Modérateur
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed') // Important: en minuscules pour Discord
        .setDescription('Crée un embed personnalisé dans le salon de ton choix')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le texte/description de l\'embed')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('couleur')
                .setDescription('La couleur en Hexadécimal (ex: #FF0000 pour rouge)')
                .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où envoyer l\'embed (par défaut : le salon actuel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Vérification si l'utilisateur fait partie des personnes autorisées
        if (!AUTHORIZED_USERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const title = interaction.options.getString('Titre');
        const messageText = interaction.options.getString('Message');
        const colorInput = interaction.options.getString('Couleur') || '#FF0000'; // Rouge par défaut
        const targetChannel = interaction.options.getChannel('Salon') || interaction.channel;

        try {
            // Convertir les sauts de ligne littéraux (\n) si tu en écris dans l'option Discord
            const formattedMessage = messageText.replace(/\\n/g, '\n');

            const customEmbed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(formattedMessage)
                .setColor(colorInput)
                .setTimestamp();

            // Envoyer l'embed dans le salon cible
            const sentMessage = await targetChannel.send({ embeds: [customEmbed] });

            await interaction.editReply({
                content: `✅ Embed créé avec succès dans <#${targetChannel.id}> !\n🆔 **ID du message (gardez-le pour le modifier plus tard) :** \`${sentMessage.id}\``
            });

        } catch (error) {
            console.error("❌ Erreur lors de la création de l'embed :", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la création de l'embed. Vérifie que la couleur est valide (ex: `#FF0000`) ou que le bot a les permissions d'écrire dans ce salon.");
        }
    },
};

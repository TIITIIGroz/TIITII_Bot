const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Liste des IDs Discord des personnes autorisées à utiliser cette commande
const AUTHORIZED_USERS = [
    "913798085686198292", // mon id TIITII_Groz
    "707665614067728464", // mon id Nk BoMbe80
    "894668340902125618", // The King
    "1012357140679229511",  // Co-Fondateur
    "894669520902451220",  // Admin normal
    "987485855474147368",  // Modérateur
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crée un embed personnalisé (avec URL d\'image) dans le salon de ton choix')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('titre')
                .setDescription('Le titre de l\'embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Le texte/description de l\'embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('image-url')
                .setDescription('Lien direct permanent de l\'image (URL en .png / .jpg)')
                .setRequired(false)
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

        const title = interaction.options.getString('titre');
        const messageText = interaction.options.getString('message');
        const imageUrl = interaction.options.getString('image-url');
        const colorInput = interaction.options.getString('couleur') || '#FF0000'; // Rouge par défaut
        const targetChannel = interaction.options.getChannel('salon') || interaction.channel;

        // Petite sécurité : vérifier qu'on a au moins mis un titre, un message ou une image
        if (!title && !messageText && !imageUrl) {
            return interaction.editReply("❌ Tu dois fournir au moins un **titre**, un **message** ou une **URL d'image** pour créer l'embed !");
        }

        try {
            const customEmbed = new EmbedBuilder()
                .setColor(colorInput);

            if (title) customEmbed.setTitle(title);
            
            if (messageText) {
                const formattedMessage = messageText.replace(/\\n/g, '\n');
                customEmbed.setDescription(formattedMessage);
            }

            // Si une URL d'image permanente a été fournie, on l'ajoute
            if (imageUrl) {
                customEmbed.setImage(imageUrl);
            }

            // Envoyer l'embed dans le salon cible
            const sentMessage = await targetChannel.send({ embeds: [customEmbed] });

            await interaction.editReply({
                content: `✅ Embed créé avec succès dans <#${targetChannel.id}> !\n🆔 **ID du message (gardez-le pour le modifier plus tard) :** \`${sentMessage.id}\``
            });

        } catch (error) {
            console.error("❌ Erreur lors de la création de l'embed :", error);
            await interaction.editReply("❌ Une erreur est survenue. Vérifie que ton lien d'image est valide et commence par `https://`.");
        }
    },
};

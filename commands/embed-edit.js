const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// Reprends les mêmes IDs autorisés que pour ton /embed classique
const AUTHORIZED_USERS = [
    "894668340902125618", // The King
    "1012357140679229511",  // Co-Fondateur
    "894669520902451220",  // Admin normal
    "987485855474147368",  // Modérateur
    "913798085686198292", // Mon ID TIITII_Groz !
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed-edit')
        .setDescription('Modifie un embed existant envoyé par le bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('L\'ID du message de l\'embed à modifier')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Le salon où se trouve l\'embed à modifier')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('nouveau_titre')
                .setDescription('Le nouveau titre (laisse vide pour ne pas changer)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('nouveau_message')
                .setDescription('Le nouveau texte/description (laisse vide pour ne pas changer)')
                .setRequired(false)
        )
        .addAttachmentOption(option =>
            option.setName('nouvelle_image')
                .setDescription('Une nouvelle image à inclure')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('supprimer_image')
                .setDescription('Mets sur True si tu veux retirer l\'image actuelle de l\'embed')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('nouvelle_couleur')
                .setDescription('Le nouveau code couleur Hexadécimal (ex: #00FF00)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Vérification de la sécurité des utilisateurs autorisés
        if (!AUTHORIZED_USERS.includes(interaction.user.id)) {
            return interaction.reply({
                content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.options.getString('message_id');
        const targetChannel = interaction.options.getChannel('salon');
        const newTitle = interaction.options.getString('nouveau_titre');
        const newMessageText = interaction.options.getString('nouveau_message');
        const newImageAttachment = interaction.options.getAttachment('nouvelle_image');
        const removeImage = interaction.options.getBoolean('supprimer_image');
        const newColorInput = interaction.options.getString('nouvelle_couleur');

        try {
            // Récupérer le message dans le salon cible
            const targetMessage = await targetChannel.messages.fetch(messageId).catch(() => null);

            if (!targetMessage) {
                return interaction.editReply("❌ Impossible de trouver un message avec cet ID dans ce salon. Vérifie l'ID et le salon.");
            }

            // Vérifier si le message vient bien du bot
            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply("❌ Je ne peux modifier que les messages envoyés par ce bot !");
            }

            // Vérifier si le message contient un embed
            if (!targetMessage.embeds || targetMessage.embeds.length === 0) {
                return interaction.editReply("❌ Ce message ne contient aucun embed modifiable.");
            }

            // Récupérer l'embed existant pour le modifier proprement
            const existingEmbed = targetMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(existingEmbed);

            // Mettre à jour les champs si l'utilisateur en a fourni de nouveaux
            if (newTitle !== null) {
                updatedEmbed.setTitle(newTitle);
            }

            if (newMessageText !== null) {
                const formattedMessage = newMessageText.replace(/\\n/g, '\n');
                updatedEmbed.setDescription(formattedMessage);
            }

            // Gestion de l'image (Suppression prioritaire ou ajout d'une nouvelle)
            if (removeImage === true) {
                updatedEmbed.setImage(null);
            } else if (newImageAttachment) {
                updatedEmbed.setImage(newImageAttachment.url);
            }

            if (newColorInput) {
                updatedEmbed.setColor(newColorInput);
            }

            // Modifier le message sur Discord
            await targetMessage.edit({ embeds: [updatedEmbed] });

            await interaction.editReply({
                content: `✅ L'embed a été modifié avec succès dans <#${targetChannel.id}> !`
            });

        } catch (error) {
            console.error("❌ Erreur lors de la modification de l'embed :", error);
            await interaction.editReply("❌ Une erreur est survenue lors de la modification. Vérifie les informations fournies.");
        }
    },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('insta')
        .setDescription('Annonce un nouveau post Instagram sur le serveur')
        .addStringOption(option =>
            option.setName('lien')
                .setDescription('Le lien direct de ton post Instagram')
                .setRequired(true)
        )
        // Restreint la commande aux administrateurs ou modérateurs si tu veux
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const postLink = interaction.options.getString('lien');
        const announcementChannelId = '1534224381109076172'; // ID du salon où poster l'annonce (change-le si besoin)
        const userToPingId = '1547542142354726922'; // L'utilisateur à identifier

        try {
            // Récupère le salon d'annonce
            const channel = await interaction.guild.channels.fetch(announcementChannelId).catch(() => null);
            if (!channel) {
                return interaction.reply({ content: "❌ Le salon d'annonce est introuvable.", ephemeral: true });
            }

            // Envoi du message dans le salon cible
            await channel.send(`<@${userToPingId}>, **TIITII_Groz** vient de faire un post, va regarder ça doit être intéressant !\n\n${postLink}`);

            // Confirmation discrète pour toi que c'est envoyé
            await interaction.reply({ content: "✅ L'annonce Instagram a bien été envoyée !", ephemeral: true });
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'annonce Instagram :", error);
            await interaction.reply({ content: "❌ Une erreur est survenue lors de l'envoi de l'annonce.", ephemeral: true });
        }
    },
};

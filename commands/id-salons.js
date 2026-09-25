const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-salons')
        .setDescription('Affiche la liste de tous les identifiants des salons du serveur.'),

    async execute(interaction) {
        const guild = interaction.guild;

        // Récupérer tous les salons du serveur et les trier par position
        const channels = guild.channels.cache.sort((a, b) => a.position - b.position);

        let salonListText = "";

        channels.forEach(channel => {
            // Déterminer une petite icône selon le type de salon
            let icon = "💬";
            if (channel.isVoiceBased()) icon = "🔊";
            else if (channel.isThread()) icon = "🧵";
            else if (channel.isDMBased()) icon = "👥";

            const line = `${icon} **${channel.name}** : \`${channel.id}\`\n`;

            // Discord limite la taille d'un champ d'embed à 1024 caractères. 
            // Si la liste devient trop longue, on gère la sécurité pour éviter de dépasser.
            if (salonListText.length + line.length > 1024) return;

            salonListText += line;
        });

        if (!salonListText) {
            salonListText = "Aucun salon trouvé sur ce serveur.";
        }

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📋 Identifiants des salons du serveur')
            .setDescription("Voici la liste de tous les salons avec leur nom à gauche et leur identifiant (`ID`) à droite :")
            .addFields({
                name: '\u200b',
                value: salonListText,
                inline: false
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

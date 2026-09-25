const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('id-salons')
        .setDescription('Affiche la liste de tous les identifiants des salons du serveur.'),

    async execute(interaction) {
        const guild = interaction.guild;

        // Récupérer tous les salons, filtrer pour enlever les catégories (GuildCategory), et trier par position
        const channels = guild.channels.cache
            .filter(channel => channel.type !== 4) // Type 4 correspond aux catégories dans Discord
            .sort((a, b) => {
                // Tri par position de salon, puis par position de position brute si besoin
                if (a.rawPosition !== b.rawPosition) return a.rawPosition - b.rawPosition;
                return a.position - b.position;
            });

        let salonListText = "";

        channels.forEach(channel => {
            // Déterminer une icône selon le type de salon
            let icon = "💬";
            if (channel.isVoiceBased()) icon = "🔊";
            else if (channel.isThread()) icon = "🧵";

            // Format propre : Icône Nom du salon -> `ID`
            const line = `${icon} **${channel.name}** : \`${channel.id}\`\n`;

            // Sécurité pour ne pas dépasser la limite globale de la description (4000 caractères)
            if (salonListText.length + line.length > 4000) return;

            salonListText += line;
        });

        if (!salonListText) {
            salonListText = "Aucun salon trouvé sur ce serveur.";
        }

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('📋 Identifiants des salons du serveur')
            .setDescription(`Voici la liste de tous les salons dans l'ordre du serveur (clique ou sélectionne l'identifiant pour le copier) :\n\n${salonListText}`)
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

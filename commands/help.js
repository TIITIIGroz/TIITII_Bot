const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste des commandes / Displays the list of commands')
        .addStringOption(option =>
            option.setName('lang')
                .setDescription('Choisis ta langue / Choose your language')
                .setRequired(false)
                .addChoices(
                    { name: 'Français 🇫🇷', value: 'fr' },
                    { name: 'English 🇬🇧', value: 'en' }
                )
        ),

    async execute(interaction) {
        const lang = interaction.options.getString('lang') || 'fr';
        const isFrench = lang === 'fr';

        // 📝 DESCRIPTIONS DE TES COMMANDES (FR & EN)
        const commandDescriptions = {
            links: {
                fr: "Affiche la liste de toutes les réseaux sociaux de TIITII_Groz.",
                en: "Displays the list of all the network of TIITII_Groz."
            },
            rank: {
                fr: "Affiche le rang du membre identifié ou sans vous identifier vous aurez votre rang.",
                en: "Displays the rank of the identified member or, without identifying yourself, you will have your rank."
            },
            leaderboard: {
                fr: "Affiche le classement des 10 premiers membres (XP).",
                en: "Displays the leaderboard of the 10 first members(XP)."
            },
            anniv: {
                fr: "Ajout de VOTRE anniversaire, vous pouvez le modifier en refaisant la commande.",
                en: "Adding YOUR birthday, you can change it by reordering."
            },
        };

        const embed = new EmbedBuilder()
            .setColor(isFrench ? '#57F287' : '#FEE75C')
            .setTitle(isFrench ? '📖 Liste des commandes / Command List' : '📖 Command List / Liste des commandes')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // Récupère toutes les commandes enregistrées dans le bot dynamiquement
        interaction.client.commands.forEach((cmd, name) => {
            const descObj = commandDescriptions[name];
            let description = isFrench ? "Aucune description." : "No description.";

            if (descObj) {
                description = isFrench ? descObj.fr : descObj.en;
            }

            embed.addFields({
                name: `/${name}`,
                value: description,
                inline: false
            });
        });

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

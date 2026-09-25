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

        // 🔒 LISTE DES COMMANDES SECRETES - ADMIN À NE PAS AFFICHER DANS LE /HELP
        const hiddenCommands = ['add-button', 'dt-button','embed-edit','embed', 'set-level','take-xp','give-xp','admin-anniv','insta','ticket-setup']; // Mets ici le nom de tes commandes admin

        const embed = new EmbedBuilder()
            .setColor(isFrench ? '#57F287' : '#FEE75C')
            .setTitle(isFrench ? '📖 Liste des commandes / Command List' : '📖 Command List / Liste des commandes')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // Récupération dynamique de toutes les commandes SAUF les cachées
        interaction.client.commands.forEach((cmd, name) => {
            // Si la commande est dans la liste des cachées, on l'ignore complètement
            if (hiddenCommands.includes(name)) return;

            let description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");

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

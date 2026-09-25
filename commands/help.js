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
        const hiddenCommands = ['add-button', 'dt-button','embed-edit','embed', 'set-level','take-xp','give-xp','admin-anniv','insta','ticket-setup'];

        const embed = new EmbedBuilder()
            .setColor(isFrench ? '#57F287' : '#FEE75C')
            .setTitle(isFrench ? '📖 Liste des commandes / Command List' : '📖 Command List / Liste des commandes')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // Filtrer d'abord les commandes valides pour savoir combien il y en a
        const availableCommands = Array.from(interaction.client.commands.entries())
            .filter(([name]) => !hiddenCommands.includes(name));

        // Récupération dynamique et ajout avec espace
        availableCommands.forEach(([name, cmd], index) => {
            let description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");

            // Ajout de la commande
            embed.addFields({
                name: `/${name}`,
                value: description,
                inline: false
            });

            // Si ce n'est PAS la dernière commande, on ajoute un champ vide pour faire un espace
            if (index < availableCommands.length - 1) {
                embed.addFields({
                    name: '\u200b', // Caractère espace invisible
                    value: '\u200b',
                    inline: false
                });
            }
        });

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

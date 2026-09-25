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
            .setTitle(isFrench ? '📖 Liste des commandes' : '📖 Command List')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // Filtrer d'abord les commandes valides
        const availableCommands = Array.from(interaction.client.commands.entries())
            .filter(([name]) => !hiddenCommands.includes(name));

        availableCommands.forEach(([name, cmd], index) => {
            // 🌐 GESTION DE LA LANGUE POUR LA DESCRIPTION
            // Si ta commande possède une description gérée en objet (ex: { fr: "...", en: "..." }) 
            // ou si tu veux adapter selon la description native :
            let description = cmd.data.description;

            // Astuce : Si tes descriptions nativaux sont en français, tu peux soit :
            // 1. Traduire directement ici avec un dictionnaire/switch si tu as peu de commandes
            // 2. Ou utiliser la propriété description de la commande si elle est déjà bilingue.
            
            // Exemple simple de traduction manuelle propre pour le /help si tu veux forcer l'anglais :
            if (!isFrench) {
                // Tu peux mapper l'anglais ici si tu veux des textes spécifiques en anglais :
                const englishDescriptions = {
                    'ping': 'Displays the bot latency',
                    'help': 'Displays the list of commands',
                    // Ajoute tes autres commandes ici si besoin, sinon la description par défaut s'affichera
                };
                description = englishDescriptions[name] || cmd.data.description || "No description.";
            } else {
                description = cmd.data.description || "Aucune description.";
            }

            // Ajout de la commande
            embed.addFields({
                name: `${name}`,
                value: description,
                inline: false
            });

            // Espace entre chaque commande (si ce n'est pas la dernière)
            if (index < availableCommands.length - 1) {
                embed.addFields({
                    name: '\u200b',
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

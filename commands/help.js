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

        // 🔒 COMMANDES CACHÉES (Admin)
        const hiddenCommands = ['add-button', 'dt-button','embed-edit','embed', 'set-level','take-xp','give-xp','admin-anniv','insta','ticket-setup'];

        // 🌐 TES 3 COMMANDES FRANÇAISES ET TES 3 ANGLAISES (Remplace par les vrais noms)
        const frenchOnlyCommands = ['commande_fr_1', 'commande_fr_2', 'commande_fr_3'];
        const englishOnlyCommands = ['commande_en_1', 'commande_en_2', 'commande_en_3'];

        const embed = new EmbedBuilder()
            .setColor(isFrench ? '#57F287' : '#FEE75C')
            .setTitle(isFrench ? '📖 Liste des commandes' : '📖 Command List')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // Filtrer les commandes selon la langue
        const availableCommands = Array.from(interaction.client.commands.entries()).filter(([name]) => {
            if (hiddenCommands.includes(name)) return false;

            if (isFrench) {
                return !englishOnlyCommands.includes(name);
            } else {
                return !frenchOnlyCommands.includes(name);
            }
        });

        // 📝 CRÉATION DE LA LISTE COMPACTE
        let commandListText = "";

        availableCommands.forEach(([name, cmd]) => {
            let description = "";

            // 🌐 Gestion spécifique pour la commande /help pour ne garder qu'une seule langue
            if (name === 'help') {
                description = isFrench 
                    ? "Affiche la liste des commandes" 
                    : "Displays the list of commands";
            } else {
                description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");
            }

            // S'assure qu'il y a bien un point à la fin de la description
            if (!description.endsWith('.')) {
                description += '.';
            }
            
            // Format : /nom : description
            commandListText += `**/${name}** : ${description}\n`;
        });

        // Ajout du texte dans un champ unique pour éviter les gros espaces
        embed.addFields({
            name: '\u200b',
            value: commandListText,
            inline: false
        });

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

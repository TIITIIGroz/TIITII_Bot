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

        // 🌐 TES 3 COMMANDES FRANÇAISES ET TES 3 ANGLAISES
        const frenchOnlyCommands = ['anniv-aj', 'anniv-rt', 'anniv-list'];
        const englishOnlyCommands = ['bday-add', 'bday-rm', 'bday-list'];

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

        // 📝 CRÉATION D'UNE LISTE UNIQUE COMPACTE
        // On génère tout le texte dans une seule variable avec un petit saut de ligne simple
        let commandListText = "";

        availableCommands.forEach(([name, cmd]) => {
            let description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");
            
            // Format : `/__nom__` : description avec un saut de ligne simple
            commandListText += `**/${name}** : ${description}\n`;
        });

        // On ajoute tout dans un seul champ (ou directement dans la description si tu préfères)
        embed.addFields({
            name: '\u200b', // Titre vide
            value: commandListText,
            inline: false
        });

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

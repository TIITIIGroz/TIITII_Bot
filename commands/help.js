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
        // Utilise l'option choisie, ou détecte la langue de l'utilisateur sur Discord par défaut ('en-US', 'en-GB' -> 'en')
        const userLang = interaction.options.getString('lang');
        const isFrench = userLang ? userLang === 'fr' : interaction.locale === 'fr';

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

        // 📝 TRADUCTIONS DESCRIPTIVES EN DUR POUR UNE QUALITÉ PARFAITE
        const descriptions = {
            fr: {
                help: "Affiche la liste des commandes.",
                leaderboard: "Affiche le top 10 des membres les plus actifs du serveur.",
                links: "Affiche tous les liens de TIITII_Groz.",
                rank: "Affiche ton niveau et ton XP actuel (ou celui d'un autre membre).",
                "voice-access": "Autorise une ou plusieurs personnes à accéder à ton salon vocal caché.",
                "voice-hide": "Cache ton salon vocal aux autres membres.",
                "bday-add": "Enregistre ta date d'anniversaire.",
                "bday-list": "Affiche la liste des anniversaires du serveur.",
                "bday-rm": "Supprime ta date d'anniversaire enregistrée."
            },
            en: {
                help: "Displays the list of commands.",
                leaderboard: "Displays the top 10 most active members on the server.",
                links: "Displays all links of TIITII_Groz.",
                rank: "Displays your current level and XP (or another member's).",
                "voice-access": "Allows one or more people to access your hidden voice channel.",
                "voice-hide": "Hides your voice channel from other members.",
                "bday-add": "Register your birthday date.",
                "bday-list": "Displays the list of all server birthdays.",
                "bday-rm": "Remove your registered birthday date."
            }
        };

        // 📝 CRÉATION DE LA LISTE AVEC ESPACE LÉGER
        let commandListText = "";

        availableCommands.forEach(([name, cmd]) => {
            let description = "";

            // Récupère la description traduite si elle existe, sinon prend celle par défaut du fichier de la commande
            if (descriptions[isFrench ? 'fr' : 'en'][name]) {
                description = descriptions[isFrench ? 'fr' : 'en'][name];
            } else {
                description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");
            }

            // S'assure qu'il y a bien un point à la fin de la description
            if (!description.endsWith('.')) {
                description += '.';
            }
            
            // Format : /nom : description
            commandListText += `**/${name}** : ${description}\n\n`;
        });

        // Ajout du texte dans un champ unique
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

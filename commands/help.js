const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

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
        await interaction.deferReply();

        const userLang = interaction.options.getString('lang');
        const isFrench = userLang ? userLang === 'fr' : true;

        const hiddenCommands = ['add-button', 'dt-button', 'embed-edit', 'embed', 'set-level', 'take-xp', 'give-xp', 'admin-anniv', 'insta', 'ticket-setup'];
        const frenchOnlyCommands = ['anniv-aj', 'anniv-rt', 'anniv-list'];
        const englishOnlyCommands = ['bday-add', 'bday-rm', 'bday-list'];

        if (!interaction.client.commands) {
            return interaction.editReply("Erreur : collection des commandes introuvable.");
        }

        // 📝 TON ORDRE PERSONNALISÉ STRICT (Modifie l'ordre ici comme tu veux)
        const customOrder = [
            'help',
            'statut',
            'stats-serv',
            'rank',
            'leaderboard',
            'links',
            'id-salons',
            'voice-access',
            'voice-hide',
            'bday-add',
            'bday-list',
            'bday-rm',
            'anniv-aj',
            'anniv-rt',
            'anniv-list'
        ];

        // Filtrer et trier strictement selon ton tableau customOrder
        const availableCommands = Array.from(interaction.client.commands.entries())
            .filter(([name]) => {
                if (hiddenCommands.includes(name)) return false;
                if (isFrench) {
                    return !englishOnlyCommands.includes(name);
                } else {
                    return !frenchOnlyCommands.includes(name);
                }
            })
            .sort(([a], [b]) => {
                const indexA = customOrder.indexOf(a);
                const indexB = customOrder.indexOf(b);
                
                // Si les deux sont dans la liste, on respecte l'index
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // Si seulement A y est, il passe avant
                if (indexA !== -1) return -1;
                // Si seulement B y est, il passe avant
                if (indexB !== -1) return 1;
                // Si aucune des deux n'est dans la liste, elles gardent leur ordre d'origine
                return 0;
            });

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

        const ITEMS_PER_PAGE = 6;
        const totalPages = Math.ceil(availableCommands.length / ITEMS_PER_PAGE);
        let page = 1;

        const generateHelpEmbed = (pageNum) => {
            const start = (pageNum - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentCommands = availableCommands.slice(start, end);

            let commandListText = "";
            currentCommands.forEach(([name, cmd]) => {
                let description = "";
                const langKey = isFrench ? 'fr' : 'en';

                if (descriptions[langKey] && descriptions[langKey][name]) {
                    description = descriptions[langKey][name];
                } else if (cmd && cmd.data && cmd.data.description) {
                    description = cmd.data.description;
                } else {
                    description = isFrench ? "Aucune description." : "No description.";
                }

                if (!description.endsWith('.')) {
                    description += '.';
                }
                
                commandListText += `**/${name}** : ${description}\n\n`;
            });

            return new EmbedBuilder()
                .setColor(isFrench ? '#57F287' : '#FEE75C')
                .setTitle(isFrench ? `📖 Liste des commandes (Page ${pageNum}/${totalPages})` : `📖 Command List (Page ${pageNum}/${totalPages})`)
                .setDescription(isFrench ? "Voici la liste des commandes disponibles :" : "Here is the list of available commands:")
                .addFields({ name: '\u200b', value: commandListText || "Aucune commande.", inline: false })
                .setTimestamp();
        };

        // Boutons minimalistes : uniquement les flèches (◀ et ▶)
        const generateRow = (currentPage) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_prev_${currentPage}_${isFrench ? 'fr' : 'en'}`)
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_next_${currentPage}_${isFrench ? 'fr' : 'en'}`)
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
            );
        };

        await interaction.editReply({
            embeds: [generateHelpEmbed(page)],
            components: [generateRow(page)]
        });

        const filter = i => i.customId.startsWith('help_prev_') || i.customId.startsWith('help_next_');
        const collector = interaction.channel.createMessageComponentCollector({ filter });

        collector.on('collect', async i => {
            const parts = i.customId.split('_');
            const action = parts[1];
            let currentPage = parseInt(parts[2]);
            const btnLang = parts[3];
            const isFr = btnLang === 'fr';

            if (action === 'next') {
                currentPage++;
                if (currentPage > totalPages) currentPage = 1;
            } else if (action === 'prev') {
                currentPage--;
                if (currentPage < 1) currentPage = totalPages;
            }

            const start = (currentPage - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const currentCommands = availableCommands.slice(start, end);

            let commandListText = "";
            currentCommands.forEach(([name, cmd]) => {
                let description = "";
                const langKey = isFr ? 'fr' : 'en';

                if (descriptions[langKey] && descriptions[langKey][name]) {
                    description = descriptions[langKey][name];
                } else if (cmd && cmd.data && cmd.data.description) {
                    description = cmd.data.description;
                } else {
                    description = isFr ? "Aucune description." : "No description.";
                }

                if (!description.endsWith('.')) description += '.';
                commandListText += `**/${name}** : ${description}\n\n`;
            });

            const newEmbed = new EmbedBuilder()
                .setColor(isFr ? '#57F287' : '#FEE75C')
                .setTitle(isFr ? `📖 Liste des commandes (Page ${currentPage}/${totalPages})` : `📖 Command List (Page ${currentPage}/${totalPages})`)
                .setDescription(isFr ? "Voici la liste des commandes disponibles :" : "Here is the list of available commands:")
                .addFields({ name: '\u200b', value: commandListText, inline: false })
                .setTimestamp();

            const newRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_prev_${currentPage}_${btnLang}`)
                    .setLabel('◀')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`help_next_${currentPage}_${btnLang}`)
                    .setLabel('▶')
                    .setStyle(ButtonStyle.Primary)
            );

            if (currentPage === 1) {
                await i.update({
                    embeds: [newEmbed],
                    components: [newRow]
                }).catch(() => {});
            } else {
                await i.reply({
                    embeds: [newEmbed],
                    components: [newRow],
                    ephemeral: true
                }).catch(() => {});
            }
        });
    },
};

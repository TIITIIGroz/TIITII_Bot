const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier JSON qui stockera les textes secrets
const filePath = path.join(__dirname, '../translations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-button')
        .setDescription('Ajoute un bouton personnalisé et interactif à un message existant')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message auquel ajouter le bouton')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('button_name')
                .setDescription('Le texte qui sera écrit SUR le bouton (ex: Translation in English)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('key')
                .setDescription('Un identifiant unique pour ce texte (ex: regles_en, faq_1)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('response_text')
                .setDescription('Le texte secret affiché en éphémère quand on clique dessus')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const messageId = interaction.options.getString('message_id');
        const buttonName = interaction.options.getString('button_name');
        const key = interaction.options.getString('key');
        const responseText = interaction.options.getString('response_text');

        try {
            // 1. Récupérer le message dans le salon actuel
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID dans ce salon." });
            }

            // 2. Charger ou créer le fichier JSON pour stocker le texte secret associé à la clé
            let translations = {};
            if (fs.existsSync(filePath)) {
                translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }

            translations[key] = responseText;
            fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));

            // 3. Créer le nouveau bouton avec le nom choisi
            const newButton = new ButtonBuilder()
                .setCustomId(`translate_${key}`)
                .setLabel(buttonName)
                .setStyle(ButtonStyle.Primary);

            // 4. Gérer l'empilement intelligent des boutons (jusqu'à 5 par ligne, 5 lignes max)
            let rows = message.components.map(row => ActionRowBuilder.from(row));
            let added = false;

            for (let row of rows) {
                if (row.components.length < 5) {
                    row.addComponents(newButton);
                    added = true;
                    break;
                }
            }

            if (!added) {
                if (rows.length >= 5) {
                    return interaction.editReply({ content: "❌ Ce message a atteint la limite maximale de boutons autorisée par Discord." });
                }
                const newRow = new ActionRowBuilder().addComponents(newButton);
                rows.push(newRow);
            }

            // 5. Mettre à jour le message sur Discord avec les nouveaux composants
            await message.edit({
                components: rows
            });

            await interaction.editReply({ content: `✅ Succès ! Le bouton **"${buttonName}"** a bien été ajouté au message.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Une erreur est survenue (Vérifie l'ID du message et les permissions du bot)." });
        }
    },
};

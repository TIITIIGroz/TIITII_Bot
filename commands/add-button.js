const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Chemin vers ton fichier de sauvegarde des traductions/textes
const filePath = path.join(__dirname, '../translations.json'); // Ajuste le chemin selon l'emplacement de ton fichier

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
                .setDescription('Un identifiant unique pour ce texte (ex: regles_1, faq_2)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('response_text')
                .setDescription('Le texte secret affiché en éphémère quand on clique dessus')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const messageId = interaction.options.getString('message_id');
        const buttonName = interaction.options.getString('button_name');
        const key = interaction.options.getString('key');
        const responseText = interaction.options.getString('response_text');

        try {
            // 1. Récupérer le message dans le salon actuel
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply("❌ Impossible de trouver un message avec cet ID dans ce salon.");
            }

            // 2. Charger ou créer le fichier JSON pour stocker le texte associé à la clé
            let translations = {};
            if (fs.existsSync(filePath)) {
                translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }

            translations[key] = responseText;
            fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));

            // 3. Créer le nouveau bouton avec le nom choisi
            const newButton = new ButtonBuilder()
                .setCustomId(`translate_${key}`)
                .setLabel(buttonName) // Le texte que tu veux sur le bouton
                .setStyle(ButtonStyle.Primary);

            // 4. Gérer l'empilement intelligent des boutons
            // Discord autorise max 5 boutons par ligne (ActionRow) et max 5 lignes (soit 25 boutons au total)
            let rows = message.components.map(row => ActionRowBuilder.from(row));
            let added = false;

            // On cherche s'il reste de la place sur une ligne existante (moins de 5 boutons)
            for (let row of rows) {
                if (row.components.length < 5) {
                    row.addComponents(newButton);
                    added = true;
                    break;
                }
            }

            // Si toutes les lignes existantes sont pleines (ou s'il n'y a aucune ligne), on en crée une nouvelle
            if (!added) {
                if (rows.length >= 5) {
                    return interaction.editReply("❌ Ce message a atteint la limite maximale de boutons autorisée par Discord.");
                }
                const newRow = new ActionRowBuilder().addComponents(newButton);
                rows.push(newRow);
            }

            // 5. Mettre à jour le message sur Discord avec tous les boutons
            await message.edit({
                components: rows
            });

            await interaction.editReply(`✅ Succès ! Le bouton **"${buttonName}"** a été ajouté au message.`);
        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ Une erreur est survenue (Vérifie l'ID du message et les permissions du bot).");
        }
    },
};

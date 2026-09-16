const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-button')
        .setDescription('Ajoute un bouton interactif à un message')
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message cible')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('button_name')
                .setDescription('Le nom affiché sur le bouton')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('response_text')
                .setDescription('Le texte secret affiché en éphémère')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const messageId = interaction.options.getString('message_id');
        const buttonName = interaction.options.getString('button_name');
        const responseText = interaction.options.getString('response_text');

        // Génération automatique d'un identifiant unique en arrière-plan basé sur le nom du bouton
        const buttonKey = buttonName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID." });
            }

            // Enregistrement dans Supabase
            const { error: dbError } = await supabase
                .from('button_translations')
                .upsert({ key: buttonKey, response_text: responseText });

            if (dbError) {
                console.error("Erreur Supabase upsert :", dbError);
                return interaction.editReply({ content: "❌ Erreur lors de l'enregistrement en base de données." });
            }

            const newButton = new ButtonBuilder()
                .setCustomId(`translate_${buttonKey}`)
                .setLabel(buttonName)
                .setStyle(ButtonStyle.Primary);

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
                    return interaction.editReply({ content: "❌ Ce message a atteint la limite maximale de boutons." });
                }
                const newRow = new ActionRowBuilder().addComponents(newButton);
                rows.push(newRow);
            }

            await message.edit({ components: rows });

            await interaction.editReply({ content: `✅ Succès ! Le bouton **"${buttonName}"** a bien été ajouté.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Une erreur est survenue." });
        }
    },
};

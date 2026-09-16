// ... (garde le début de ton SlashCommandBuilder)
    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const messageId = interaction.options.getString('message_id');
        const buttonName = interaction.options.getString('button_name');
        const key = interaction.options.getString('key');
        const responseText = interaction.options.getString('response_text');

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID." });
            }

            // Enregistrement ou mise à jour dans Supabase
            const { error: dbError } = await interaction.client.supabase // Ou ton instance supabase
                .from('button_translations')
                .upsert({ key: key, response_text: responseText });

            if (dbError) {
                console.error("Erreur Supabase upsert :", dbError);
                return interaction.editReply({ content: "❌ Erreur lors de l'enregistrement en base de données." });
            }

            const newButton = new ButtonBuilder()
                .setCustomId(`translate_${key}`)
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
                    return interaction.editReply({ content: "❌ Limite maximale de boutons atteinte." });
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

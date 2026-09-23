const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase'); // Ajuste le chemin vers ton fichier supabase.js si besoin

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-add')
        .setNameLocalizations({
            'en-US': 'bday-add',
            'en-GB': 'bday-add'
        })
        .setDescription('Enregistre ta date d\'anniversaire')
        .setDescriptionLocalizations({
            'en-US': 'Register your birthday date',
            'en-GB': 'Register your birthday date'
        })
        .addStringOption(option =>
            option.setName('date')
                .setNameLocalizations({ 'en-US': 'date', 'en-GB': 'date' })
                .setDescription('Ta date d\'anniversaire au format JJ/MM (ex: 25/12)')
                .setDescriptionLocalizations({
                    'en-US': 'Your birthday date in DD/MM format (e.g., 25/12)',
                    'en-GB': 'Your birthday date in DD/MM format (e.g., 25/12)'
                })
                .setRequired(true)
        ),
    async execute(interaction) {
        const dateInput = interaction.options.getString('date');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Validation simple du format JJ/MM
        const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
        if (!regex.test(dateInput)) {
            return interaction.reply({
                content: "❌ Format invalide. Utilise le format **JJ/MM** (ex: `25/12`).",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            const { error } = await supabase
                .from('birthdays')
                .upsert({ user_id: userId, guild_id: guildId, birth_date: dateInput }, { onConflict: 'user_id' });

            if (error) throw error;

            await interaction.reply({
                content: `✅ Ton anniversaire a bien été enregistré à la date du **${dateInput}** !`,
                flags: [MessageFlags.Ephemeral]
            });
        } catch (err) {
            console.error("Erreur bday-add :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'enregistrement de ton anniversaire.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

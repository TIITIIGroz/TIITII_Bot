const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-aj')
        .setDescription('Enregistre ta date d\'anniversaire ou réécris ta date pour la modifier')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Ta date d\'anniversaire au format JJ/MM (ex: 25/12)')
                .setRequired(true)
        ),
    async execute(interaction) {
        const FRENCH_ROLE_ID = "1094758355085574204";
        if (!interaction.member.roles.cache.has(FRENCH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ Cette commande est réservée aux membres ayant le rôle de langue française.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const dateInput = interaction.options.getString('date').trim();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Validation du format JJ/MM
        const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
        if (!regex.test(dateInput)) {
            return interaction.reply({
                content: "❌ Format invalide. Utilise le format **JJ/MM** (ex: `25/12`).",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            // 1. Vérifier si l'utilisateur a déjà un anniversaire enregistré pour ce serveur
            const { data: existingUser, error: fetchError } = await supabase
                .from('birthdays')
                .select('*')
                .eq('user_id', userId)
                .eq('guild_id', guildId)
                .maybeSingle();

            if (fetchError) {
                console.error("Erreur lecture Supabase (birthdays) :", fetchError);
                throw fetchError;
            }

            let queryError;

            if (existingUser) {
                // 2A. Mise à jour si l'utilisateur existe déjà
                const { error } = await supabase
                    .from('birthdays')
                    .update({ birth_date: dateInput })
                    .eq('user_id', userId)
                    .eq('guild_id', guildId);
                queryError = error;
            } else {
                // 2B. Insertion si c'est la première fois
                const { error } = await supabase
                    .from('birthdays')
                    .insert([{ user_id: userId, guild_id: guildId, birth_date: dateInput }]);
                queryError = error;
            }

            if (queryError) throw queryError;

            await interaction.reply({
                content: `✅ Ton anniversaire a bien été enregistré à la date du **${dateInput}** !`,
                flags: [MessageFlags.Ephemeral]
            });
        } catch (err) {
            console.error("Erreur anniv-aj :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'enregistrement de ton anniversaire.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

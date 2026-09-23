const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-list')
        .setDescription('Affiche la liste de tous les anniversaires du serveur.'),

    async execute(interaction) {
        const FRENCH_ROLE_ID = "1094758355085574204";

        if (!interaction.member.roles.cache.has(FRENCH_ROLE_ID)) {
            return await interaction.reply({
                content: "❌ Tu n'as pas le rôle requis pour utiliser cette commande.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            const { data: birthdays, error } = await supabase
                .from('birthdays')
                .select('*');

            if (error) throw error;

            if (!birthdays || birthdays.length === 0) {
                return await interaction.reply({
                    content: "📅 Aucun anniversaire n'a encore été enregistré sur le serveur.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            // Tri des anniversaires par mois et jour
            birthdays.sort((a, b) => {
                const [dayA, monthA] = a.birth_date.split('/').map(Number);
                const [dayB, monthB] = b.birth_date.split('/').map(Number);
                if (monthA !== monthB) return monthA - monthB;
                return dayA - dayB;
            });

            let listText = birthdays.map(b => `• <@${b.user_id}> : **${b.birth_date}**`).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Liste des Anniversaires du Serveur 🎉')
                .setDescription(listText)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erreur anniv-list :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la récupération de la liste.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

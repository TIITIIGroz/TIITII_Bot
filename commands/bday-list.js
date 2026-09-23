const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const supabase = require('../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bday-list')
        .setDescription('Displays the list of all server birthdays.'),

    async execute(interaction) {
        const ENGLISH_ROLE_ID = "1094758180938067989";

        if (!interaction.member.roles.cache.has(ENGLISH_ROLE_ID)) {
            return await interaction.reply({
                content: "❌ You don't have the required role to use this command.",
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
                    content: "📅 No birthdays have been registered on the server yet.",
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
                .setTitle('🎂 Server Birthdays List 🎉')
                .setDescription(listText)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erreur bday-list :", err);
            await interaction.reply({
                content: "❌ An error occurred while fetching the birthday list.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

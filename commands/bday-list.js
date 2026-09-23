const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const supabase = '../supabase';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bday-list')
        .setDescription('Displays the list of server birthdays'),
    async execute(interaction) {
        const ENGLISH_ROLE_ID = "1094758180938067989";
        if (!interaction.member.roles.cache.has(ENGLISH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ This command is restricted to members with the English language role.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const guildId = interaction.guild.id;

        try {
            const { data, error } = await supabase
                .from('birthdays')
                .select('*')
                .eq('guild_id', guildId);

            if (error) throw error;

            if (!data || data.length === 0) {
                return interaction.reply({
                    content: "🎂 No birthdays are registered on this server yet.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const listFormatted = data.map(b => `<@${b.user_id}> : **${b.birth_date}**`).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Server Birthdays List')
                .setDescription(listFormatted)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erreur bday-list :", err);
            await interaction.reply({
                content: "❌ An error occurred while fetching the birthdays.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

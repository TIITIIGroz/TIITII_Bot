const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bday-add')
        .setDescription('Register your birthday date')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Your birthday date in DD/MM format (e.g., 25/12)')
                .setRequired(true)
        ),
    async execute(interaction) {
        const ENGLISH_ROLE_ID = "1094758180938067989";
        if (!interaction.member.roles.cache.has(ENGLISH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ This command is restricted to members with the English language role.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const dateInput = interaction.options.getString('date');
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])$/;
        if (!regex.test(dateInput)) {
            return interaction.reply({
                content: "❌ Invalid format. Please use **DD/MM** format (e.g., `25/12`).",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            const { error } = await supabase
                .from('birthdays')
                .upsert({ user_id: userId, guild_id: guildId, birth_date: dateInput }, { onConflict: 'user_id' });

            if (error) throw error;

            await interaction.reply({
                content: `✅ Your birthday has been successfully registered for **${dateInput}**!`,
                flags: [MessageFlags.Ephemeral]
            });
        } catch (err) {
            console.error("Erreur bday-add :", err);
            await interaction.reply({
                content: "❌ An error occurred while saving your birthday.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

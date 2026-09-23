const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-list')
        .setNameLocalizations({
            'en-US': 'bday-list',
            'en-GB': 'bday-list'
        })
        .setDescription('Affiche la liste des anniversaires du serveur')
        .setDescriptionLocalizations({
            'en-US': 'Displays the list of server birthdays',
            'en-GB': 'Displays the list of server birthdays'
        }),
    async execute(interaction) {
        const guildId = interaction.guild.id;

        try {
            const { data, error } = await supabase
                .from('birthdays')
                .select('*')
                .eq('guild_id', guildId);

            if (error) throw error;

            if (!data || data.length === 0) {
                return interaction.reply({
                    content: "🎂 Aucun anniversaire n'est enregistré sur ce serveur pour le moment.",
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const listFormatted = data.map(b => `<@${b.user_id}> : **${b.birth_date}**`).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#FF69B4')
                .setTitle('🎂 Liste des Anniversaires')
                .setDescription(listFormatted)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error("Erreur bday-list :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la récupération des anniversaires.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

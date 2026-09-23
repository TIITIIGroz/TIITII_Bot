const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const supabase = require('../../supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anniv-list')
        .setDescription('Affiche la liste des anniversaires du serveur'),
    async execute(interaction) {
        const FRENCH_ROLE_ID = "1094758355085574204";
        if (!interaction.member.roles.cache.has(FRENCH_ROLE_ID)) {
            return interaction.reply({
                content: "❌ Cette commande est réservée aux membres ayant le rôle de langue française.",
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
            console.error("Erreur anniv-list :", err);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la récupération des anniversaires.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    }
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('choose')
        .setDescription('Choisit un élément au hasard')
        .addStringOption(option =>
            option.setName('options')
                .setDescription('Sépare les choix par des virgules (ex: Pizza, Tacos, Burger)')
                .setRequired(true)),

    async execute(interaction) {
        const input = interaction.options.getString('options');
        const choices = input.split(',').map(item => item.trim()).filter(item => item.length > 0);

        if (choices.length < 2) {
            return await interaction.reply({
                content: '❌ Veuillez donner au moins 2 choix séparés par une virgule ! / Please provide at least 2 choices separated by a comma!',
                ephemeral: true
            });
        }

        const winner = choices[Math.floor(Math.random() * choices.length)];

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎯 Tirage au sort / Random Choice')
            .addFields(
                { name: '📋 Options', value: choices.join(', ') },
                { name: '✨ Gagnant / Winner', value: `**${winner}**` }
            )
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` })

        await interaction.reply({ embeds: [embed] });
    },
};

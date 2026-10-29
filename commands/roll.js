const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Génère un nombre aléatoire / Generates a random number')
        .addIntegerOption(option =>
            option.setName('min')
                .setDescription('Minimum (Défaut: 1)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('max')
                .setDescription('Maximum (Défaut: 100)')
                .setRequired(false)),

    async execute(interaction) {
        const min = interaction.options.getInteger('min') ?? 1;
        const max = interaction.options.getInteger('max') ?? 100;

        if (min >= max) {
            return await interaction.reply({
                content: '❌ Le minimum doit être inférieur au maximum ! / Min must be less than max!',
                ephemeral: true
            });
        }

        const result = Math.floor(Math.random() * (max - min + 1)) + min;

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🎲 Nombre Aléatoire / Random Number\n')
            .setDescription(`Résultat / Result : **${result}** (Entre ${min} et ${max})`)
            .setFooter({ 
                text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                    timeZone: 'Europe/Paris', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}\\` 
            });
            
        await interaction.reply({ embeds: [embed] });
    },
};

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('statut')
        .setDescription('Affiche la liste des rôles du serveur'),

    async execute(interaction) {
        await interaction.deferReply();

        const roles = interaction.guild.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} (\`${r.members.size} membres\`)`)
            .join('\n');

        const statutEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🛡️ Rôles de ${interaction.guild.name}`)
            .setDescription(roles || "Aucun rôle trouvé.")
            .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛` });

        await interaction.editReply({ embeds: [statutEmbed] });
    },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setUserLevel } = require('../systems/levels/database'); // Ajuste le chemin selon ton fichier de DB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-level')
        .setDescription('Définit directement le niveau d\'un utilisateur')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Le membre concerné')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('niveau')
                .setDescription('Le niveau à attribuer')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('utilisateur');
        const level = interaction.options.getInteger('niveau');

        if (level < 0) {
            return interaction.reply({ content: 'Le niveau ne peut pas être négatif.', ephemeral: true });
        }

        try {
            await setUserLevel(target.id, interaction.guild.id, level);
            await interaction.reply({ content: `⭐ Le niveau de ${target} a été défini à **${level}**.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Une erreur est survenue lors de la modification du niveau.', ephemeral: true });
        }
    },
};

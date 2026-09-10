const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeXpFromUser } = require('../systems/levels/database'); // Ajuste le chemin selon ton fichier de DB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('take-xp')
        .setDescription('Retire de l\'XP à un utilisateur')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Le membre à qui retirer de l\'XP')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('montant')
                .setDescription('La quantité d\'XP à retirer')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('utilisateur');
        const amount = interaction.options.getInteger('montant');

        if (amount <= 0) {
            return interaction.reply({ content: 'Le montant doit être supérieur à 0.', ephemeral: true });
        }

        try {
            await removeXpFromUser(target.id, interaction.guild.id, amount);
            await interaction.reply({ content: `⚠️ **${amount} XP** ont été retirés à ${target}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Une erreur est survenue lors du retrait d\'XP.', ephemeral: true });
        }
    },
};

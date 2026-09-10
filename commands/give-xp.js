const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addXpToUser } = require('../systems/levels/database'); // Ajuste le chemin selon ton fichier de DB

module.exports = {
    data: new SlashCommandBuilder()
        .setName('give-xp')
        .setDescription('Ajoute de l\'XP à un utilisateur')
        .addUserOption(option => 
            option.setName('utilisateur')
                .setDescription('Le membre à qui donner de l\'XP')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('montant')
                .setDescription('La quantité d\'XP à ajouter')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const target = interaction.options.getUser('utilisateur');
        const amount = interaction.options.getInteger('montant');

        if (amount <= 0) {
            return interaction.reply({ content: 'Le montant doit être supérieur à 0.', ephemeral: true });
        }

        try {
            // Fonction personnalisée de ta base de données pour ajouter de l'XP
            await addXpToUser(target.id, interaction.guild.id, amount);
            await interaction.reply({ content: `✅ **${amount} XP** ont été ajoutés avec succès à ${target}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            interaction.reply({ content: '❌ Une erreur est survenue lors de l\'ajout d\'XP.', ephemeral: true });
        }
    },
};

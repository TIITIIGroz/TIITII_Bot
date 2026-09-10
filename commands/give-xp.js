const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../systems/levels/database');

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
            // Insère l'utilisateur s'il n'existe pas, ou met à jour son XP
            await pool.query(
                `INSERT INTO users (userId, guildId, xp, totalXp, createdAt) 
                 VALUES ($1, $2, $3, $3, $4) 
                 ON CONFLICT (userId, guildId) 
                 DO UPDATE SET xp = users.xp + $3, totalXp = users.totalXp + $3`,
                [target.id, interaction.guild.id, amount, Date.now()]
            );

            await interaction.reply({ content: `✅ **${amount} XP** ont été ajoutés avec succès à ${target}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'ajout d\'XP.', ephemeral: true });
        }
    },
};

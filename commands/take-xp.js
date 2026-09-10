const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../systems/levels/database');

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
            // Retire de l'XP en s'assurant de ne pas descendre en dessous de 0
            await pool.query(
                `INSERT INTO users (userId, guildId, xp, totalXp, createdAt) 
                 VALUES ($1, $2, 0, 0, $4) 
                 ON CONFLICT (userId, guildId) 
                 DO UPDATE SET xp = GREATEST(0, users.xp - $3)`,
                [target.id, interaction.guild.id, amount, Date.now()]
            );

            await interaction.reply({ content: `⚠️ **${amount} XP** ont été retirés à ${target}.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors du retrait d\'XP.', ephemeral: true });
        }
    },
};

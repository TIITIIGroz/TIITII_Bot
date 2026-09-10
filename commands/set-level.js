const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const pool = require('../systems/levels/database');

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
            // Met à jour directement le niveau dans la table
            await pool.query(
                `INSERT INTO users (userId, guildId, level, createdAt) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT (userId, guildId) 
                 DO UPDATE SET level = $3`,
                [target.id, interaction.guild.id, level, Date.now()]
            );

            await interaction.reply({ content: `⭐ Le niveau de ${target} a été défini à **${level}**.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Une erreur est survenue lors de la modification du niveau.', ephemeral: true });
        }
    },
};

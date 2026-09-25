const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Affiche la liste des commandes / Displays the list of commands')
        .addStringOption(option =>
            option.setName('lang')
                .setDescription('Choisis ta langue / Choose your language')
                .setRequired(false)
                .addChoices(
                    { name: 'Français 🇫🇷', value: 'fr' },
                    { name: 'English 🇬🇧', value: 'en' }
                )
        ),

    async execute(interaction) {
        const lang = interaction.options.getString('lang') || 'fr';
        const isFrench = lang === 'fr';

        const embed = new EmbedBuilder()
            .setColor(isFrench ? '#57F287' : '#FEE75C')
            .setTitle(isFrench ? '📖 Liste des commandes / Command List' : '📖 Command List / Liste des commandes')
            .setDescription(
                isFrench 
                    ? "Voici la liste des commandes disponibles sur le serveur :" 
                    : "Here is the list of available commands on the server:"
            )
            .setTimestamp();

        // 🔄 Récupération 100% dynamique de toutes les commandes enregistrées dans le bot
        interaction.client.commands.forEach((cmd, name) => {
            // Récupère la description directement depuis la configuration de la commande
            let description = cmd.data.description || (isFrench ? "Aucune description." : "No description.");

            embed.addFields({
                name: `/${name}`,
                value: description,
                inline: false
            });
        });

        await interaction.reply({
            embeds: [embed],
            flags: [MessageFlags.Ephemeral]
        });
    },
};

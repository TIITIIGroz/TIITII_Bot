const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-confess')
        .setDescription('Installe le système de confession anonyme')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const CONFESSION_CHANNEL_ID = "1561085138350383185";
        const channel = await interaction.guild.channels.fetch(CONFESSION_CHANNEL_ID).catch(() => null);

        if (!channel) {
            return interaction.reply({ content: "❌ Salon de confession introuvable.", flags: [1 << 6] });
        }

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🤫 Confessions Anonymes / Anonymous Confessions')
            .setDescription(
                "C'est ici que seront montré les confessions ***__Anonyme__*** ! Ecrivez ce que vous voulez tant que c'est dans le respect. Appuyez sur le bouton 'Confession' pour créer un message en bas du message !\n\n" +
                "----------------------------------------------\n\n" +
                "This is where the confessions will be shown ***__Anonymously__*** ! Write whatever you want as long as it’s respectful. Press the 'Confession' button to create a message at the bottom of the message !"
            )
                .setFooter({ 
                text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                    timeZone: 'Europe/Paris', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}\\` 
            });
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_open_confession')
                .setLabel('Confession')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ Panneau de confession installé dans le salon !", flags: [1 << 6] });
    }
};

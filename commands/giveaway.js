const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Lance un concours')
        .addStringOption(option =>
            option.setName('lot')
                .setDescription('Ce qui est à gagner / What is the prize')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duree')
                .setDescription('Durée en minutes / Duration in minutes')
                .setMinValue(1)
                .setMaxValue(1440)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const prize = interaction.options.getString('lot');
        const durationMinutes = interaction.options.getInteger('duree');
        const endsAt = Date.now() + durationMinutes * 60 * 1000;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(`Lot / Prize : **${prize}**\n\nClique sur le bouton ci-dessous pour participer !\nClick the button below to enter!\n\n⏳ Fin dans / Ends in : <t:${Math.floor(endsAt / 1000)}:R>`)
            .setFooter({ text: `Lancé par ${interaction.user.tag}` })
            .setTimestamp(endsAt);

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_giveaway_join')
                .setLabel('🎉 Participer / Enter')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ content: '✅ Le giveaway a été lancé !', ephemeral: true });
        const msg = await interaction.channel.send({ embeds: [embed], components: [button] });

        // Stockage des participants
        const participants = new Set();

        const collector = msg.createMessageComponentCollector({ time: durationMinutes * 60 * 1000 });

        // Guillemet fermé correctement ici ('collect')
        collector.on('collect', async (i) => {
            if (i.customId === 'btn_giveaway_join') {
                if (participants.has(i.user.id)) {
                    return await i.reply({ content: '❌ Tu PARTICIPES DÉJÀ au giveaway ! / You are already entered!', ephemeral: true });
                }
                participants.add(i.user.id);
                await i.reply({ content: '✅ Ta participation est enregistrée ! / Your entry has been recorded!', ephemeral: true });
            }
        });

        collector.on('end', async () => {
            const usersArray = Array.from(participants);
            if (usersArray.length === 0) {
                return await msg.edit({ content: '❌ Giveaway annulé : Aucun participant.', components: [] }).catch(() => {});
            }

            const winnerId = usersArray[Math.floor(Math.random() * usersArray.length)];

            const winEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 RÉSULTAT DU GIVEAWAY 🎉')
                .setDescription(`Lot : **${prize}**\n\n🏆 Félicitations à <@${winnerId}> qui remporte le lot !`)
                .setFooter({ 
                text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                    timeZone: 'Europe/Paris', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}\\` 
            });
            
            await msg.edit({ embeds: [winEmbed], components: [] });
            await interaction.channel.send(`🎊 Félicitations <@${winnerId}> ! Tu as gagné **${prize}** !`);
        });
    },
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Envoie le panneau de configuration des tickets (FR / EN).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎫 Support & Tickets | Help Desk')
            .setDescription(
                '🇫🇷 **Besoin d\'aide ?** Clique pour ouvrir un ticket en français.\n\n' +
                '🇬🇧 **Need help?** Click to open an English ticket.'
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_fr')
                .setLabel('Ouvrir un ticket (FR)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🇫🇷'),
            new ButtonBuilder()
                .setCustomId('create_ticket_en')
                .setLabel('Open a ticket (EN)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🇬🇧')
        );

        await interaction.reply({
            content: "✅ Panneau de tickets bilingue configuré avec succès !",
            flags: [MessageFlags.Ephemeral]
        });

        await interaction.channel.send({
            embeds: [embed],
            components: [row]
        });
    },

    // Gestion des interactions liées aux tickets (boutons de création et de fermeture)
    async handleButton(interaction) {
        if (interaction.customId === 'create_ticket_fr' || interaction.customId === 'create_ticket_en') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const guild = interaction.guild;
            const member = interaction.member;
            const isFrench = interaction.customId === 'create_ticket_fr';

            const TICKET_CATEGORY_ID = null; 
            const ADMIN_ROLE_ID = "1008853465415553075"; 
            const LOGS_TICKET_ID = "1258726665232842762";

            try {
                const channelName = isFrench ? `ticket-fr-${member.user.username}` : `ticket-en-${member.user.username}`;

                const channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        { id: guild.id, deny: ['ViewChannel'] },
                        { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                        { id: ADMIN_ROLE_ID, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
                    ],
                });

                const ticketEmbed = new EmbedBuilder()
                    .setColor(isFrench ? '#57F287' : '#FEE75C')
                    .setTitle(isFrench ? `Ticket de ${member.user.username} (FR)` : `Ticket for ${member.user.username} (EN)`)
                    .setDescription(isFrench ? "Merci d'avoir ouvert un ticket ! Si c'est une fausse manipulation, ferme-le vite ; sinon, décris ton problème en détail et partage tes preuves sans attendre." : "Thank you for opening a ticket! If this was a mistake, please close it quickly; otherwise, describe your issue in detail and share your proof right away.")
                    .setFooter({ text: 'Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛' })
                    .setTimestamp();

                const closeButtonLabel = isFrench ? 'Fermer le ticket' : 'Close ticket';
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel(closeButtonLabel).setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await channel.send({
                    content: `<@${member.id}> \vert{} <@&${ADMIN_ROLE_ID}>`,
                    embeds: [ticketEmbed],
                    components: [closeRow]
                });

                const logsChannel = await guild.channels.fetch(LOGS_TICKET_ID).catch(() => null);
                if (logsChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(isFrench ? '#3498DB' : '#E67E22')
                        .setTitle('🎫 Nouveau ticket ouvert')
                        .addFields(
                            { name: '👤 Utilisateur', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: '🌐 Langue', value: isFrench ? 'Français (FR)' : 'Anglais (EN)', inline: true },
                            { name: '📂 Salon créé', value: `${channel} (\`${channel.name}\`)`, inline: false },
                            { name: '🆔 ID du membre', value: `\`${member.id}\``, inline: true }
                        )
                        .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}\\` });
                    await logsChannel.send({ embeds: [logEmbed] });
                }

                return await interaction.editReply({ content: isFrench ? `Ton ticket français a été créé : ${channel} !✅` : `Your English ticket has been created: ${channel} !✅` });
            } catch (err) {
                console.error("Erreur création ticket :", err);
                return await interaction.editReply({ content: isFrench ? "❌ Une erreur est survenue." : "❌ An error occurred." });
            }
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Fermeture du ticket... / Closing ticket...' });
            setTimeout(async () => {
                try { await interaction.channel.delete(); } catch (err) { console.error("Erreur suppression salon ticket :", err); }
            }, 5000);
            return;
        }
    }
};

// 🎫 GESTIONNAIRE DES TICKETS (FR & EN)
if (interaction.isButton()) {
    if (interaction.customId === 'create_ticket_fr' || interaction.customId === 'create_ticket_en') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        const guild = interaction.guild;
        const member = interaction.member;
        const isFrench = interaction.customId === 'create_ticket_fr';

        const TICKET_CATEGORY_ID = null; // Remplace par l'ID de ta catégorie si tu en as une
        const ADMIN_ROLE_ID = "1008853465415553075"; // Ton rôle administrateur

        try {
            const channelName = isFrench ? `ticket-fr-${member.user.username}` : `ticket-en-${member.user.username}`;

            // Création du salon avec permissions pour l'utilisateur et le rôle admin
            const channel = await guild.channels.create({
                name: channelName,
                type: 0, // GuildText
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: member.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    },
                    {
                        id: ADMIN_ROLE_ID,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    },
                ],
            });

            // Message embed et texte selon la langue choisie
            const ticketEmbed = new EmbedBuilder()
                .setColor(isFrench ? '#57F287' : '#FEE75C')
                .setTitle(isFrench ? `Ticket de ${member.user.username} (FR)` : `Ticket for ${member.user.username} (EN)`)
                .setDescription(
                    isFrench 
                        ? '🇫🇷 Merci d\'avoir ouvert un ticket ! Explique ton problème en détail, un administrateur va te répondre.' 
                        : '🇬🇧 Thank you for opening a ticket! Explain your issue in detail, an administrator will be with you shortly.'
                );

            const closeButtonLabel = isFrench ? 'Fermer le ticket' : 'Close ticket';
            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel(closeButtonLabel)
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            // Mention automatique de l'utilisateur et du rôle administrateur dans le salon
            await channel.send({
                content: `<@${member.id}> | <@&${ADMIN_ROLE_ID}>`,
                embeds: [ticketEmbed],
                components: [closeRow]
            });

            return await interaction.editReply({
                content: isFrench 
                    ? `✅ Ton ticket français a été créé : ${channel}` 
                    : `✅ Your English ticket has been created: ${channel}`
            });

        } catch (err) {
            console.error("Erreur création ticket :", err);
            return await interaction.editReply({
                content: isFrench ? "❌ Une erreur est survenue." : "❌ An error occurred."
            });
        }
    }

    // 🔒 FERMETURE DU TICKET
    if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Fermeture du ticket... / Closing ticket...' });
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
            } catch (err) {
                console.error("Erreur suppression salon ticket :", err);
            }
        }, 5000);
        return;
    }
}

const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-unaccess')
        .setDescription('Retire l\'accès à ton salon vocal personnalisé à un ou plusieurs amis')
        .setDescriptionLocalizations({
            fr: "Retire l'accès à ton salon vocal personnalisé à un ou plusieurs amis",
            "en-US": "Revokes access to your custom voice channel from one or more friends"
        })
        .addStringOption(option =>
            option.setName('cacher')
                .setDescription('Cacher le salon aux autres membres ? / Hide channel?')
                .setRequired(true)
                .addChoices(
                    { name: 'Oui (Masquer / Private)', value: 'oui' },
                    { name: 'Non (Laisser visible)', value: 'non' }
                )
        )
        .addUserOption(option =>
            option.setName('ami1')
                .setDescription('Le premier ami à retirer')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('ami2')
                .setDescription('Deuxième ami (optionnel)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('ami3')
                .setDescription('Troisième ami (optionnel)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('ami4')
                .setDescription('Quatrième ami (optionnel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const member = interaction.member;
        const PILOT_CHANNEL_ID = "1533281900318167060";
        const userVoiceChannel = member.voice.channel;

        // 1. Vérifier que l'utilisateur est dans un vocal (et pas dans le salon pilote)
        if (!userVoiceChannel || userVoiceChannel.id === PILOT_CHANNEL_ID) {
            return await interaction.reply({
                content: `❌ Tu dois d'abord rejoindre ton salon vocal personnalisé pour utiliser cette commande !`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // 2. Sécurité : Vérifier que l'utilisateur est bien le propriétaire / gestionnaire de ce salon
        if (!userVoiceChannel.permissionsFor(member).has(PermissionFlagsBits.ManageChannels)) {
            return await interaction.reply({
                content: "❌ Tu n'es pas le propriétaire de ce salon vocal, tu ne peux pas modifier ses accès.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        const shouldHide = interaction.options.getString('cacher') === 'oui';

        // 3. Récupérer et filtrer les amis (pas de bots, pas de doublons, pas soi-même)
        const rawFriends = [
            interaction.options.getUser('ami1'),
            interaction.options.getUser('ami2'),
            interaction.options.getUser('ami3'),
            interaction.options.getUser('ami4')
        ].filter(Boolean);

        const uniqueFriends = [...new Map(rawFriends.map(u => [u.id, u])).values()]
            .filter(u => !u.bot && u.id !== member.id);

        if (uniqueFriends.length === 0) {
            return await interaction.reply({
                content: "❌ Tu dois mentionner au moins un ami valide (pas un bot, ni toi-même) dont tu souhaites retirer l'accès.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            // 4. Gérer la visibilité globale (@everyone) selon le choix
            if (shouldHide) {
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: false,
                    [PermissionFlagsBits.Connect]: false
                });
                // S'assurer que le créateur garde ses accès
                await userVoiceChannel.permissionOverwrites.edit(member.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true
                });
            } else {
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: null,
                    [PermissionFlagsBits.Connect]: null
                });
            }

            const revokedNames = [];

            // 5. Supprimer l'override de permission pour chaque ami sélectionné
            for (const friend of uniqueFriends) {
                await userVoiceChannel.permissionOverwrites.delete(friend.id);
                revokedNames.push(friend.toString());
            }

            const statusText = shouldHide ? "🔒 **Salon masqué** à tout le monde" : "🔓 **Visibilité globale rétablie**";

            return await interaction.reply({
                content: `✅ Accès retiré pour ${revokedNames.join(', ')} !\n${statusText}.`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (err) {
            console.error("Erreur lors du retrait des accès au vocal :", err);
            return await interaction.reply({
                content: "❌ Une erreur est survenue lors de la modification des permissions.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};

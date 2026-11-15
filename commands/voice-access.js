const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-access')
        .setDescription('Autorise une ou plusieurs personnes à accéder à ton salon vocal')
        .setDescriptionLocalizations({
            fr: "Autorise une ou plusieurs personnes à accéder à ton salon vocal",
            "en-US": "Grants one or more people access to your voice channel"
        })
        .addStringOption(option =>
            option.setName('cacher')
                .setDescription('Cacher le salon aux autres membres ? / Hide channel?')
                .setRequired(true)
                .addChoices(
                    { name: 'Oui (Privé / Private)', value: 'oui' },
                    { name: 'Non (Public)', value: 'non' }
                )
        )
        .addUserOption(option =>
            option.setName('ami1')
                .setDescription('Le premier ami à autoriser')
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
                content: `❌ Tu dois d'abord rejoindre <#${PILOT_CHANNEL_ID}> pour créer ton salon vocal personnalisé avant d'utiliser cette commande !`,
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

        // 3. Récupérer les amis en filtrant les bots, les doublons et l'auteur lui-même
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
                content: "❌ Tu dois mentionner au moins un ami valide (pas un bot, ni toi-même).",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            // 4. Appliquer la visibilité globale (@everyone) et sécuriser l'accès du créateur
            if (shouldHide) {
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: false,
                    [PermissionFlagsBits.Connect]: false
                });
                // S'assurer que le créateur ne s'enferme pas dehors
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

            // 5. Donner l'accès aux amis sélectionnés
            const allowedNames = [];
            for (const friend of uniqueFriends) {
                await userVoiceChannel.permissionOverwrites.edit(friend.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true
                });
                allowedNames.push(friend.toString());
            }

            const statusText = shouldHide ? "🔒 **Salon masqué** à tout le monde" : "🔓 **Salon visible** par tout le monde";

            return await interaction.reply({
                content: `✅ Accès accordé à ${allowedNames.join(', ')} !\n${statusText}.`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (err) {
            console.error("Erreur lors de l'attribution des accès au vocal :", err);
            return await interaction.reply({
                content: "❌ Une erreur est survenue lors de la modification des permissions.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};

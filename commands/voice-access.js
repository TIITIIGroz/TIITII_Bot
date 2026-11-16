const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { temporaryVoiceChannels } = require('../index.js'); // Ajuste si ton dossier commands est imbriqué (ex: '../../index.js')

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
        let userVoiceChannel = member.voice.channel;

        // 1. Si l'utilisateur n'est pas dans son salon vocal, on le cherche et on le téléporte
        if (!userVoiceChannel || userVoiceChannel.id === PILOT_CHANNEL_ID) {
            let foundChannelId = null;
            for (const [channelId, ownerId] of temporaryVoiceChannels.entries()) {
                if (ownerId === member.id) {
                    foundChannelId = channelId;
                    break;
                }
            }

            if (foundChannelId) {
                const foundChannel = interaction.guild.channels.cache.get(foundChannelId);
                if (foundChannel) {
                    try {
                        await member.voice.setChannel(foundChannel);
                        userVoiceChannel = foundChannel;
                    } catch (err) {
                        return await interaction.reply({
                            content: `❌ Tu n'es dans aucun vocal et je n'ai pas pu te téléporter dans ton salon personnalisé.`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } else {
                    temporaryVoiceChannels.delete(foundChannelId);
                }
            }

            if (!userVoiceChannel || userVoiceChannel.id === PILOT_CHANNEL_ID) {
                return await interaction.reply({
                    content: `❌ Tu ne possèdes aucun salon vocal temporaire actif. Rejoins d'abord <#${PILOT_CHANNEL_ID}> pour en créer un !`,
                    flags: [MessageFlags.Ephemeral]
                });
            }
        }

        // 2. VÉRIFICATION STRICTE DU PROPRIÉTAIRE
        const ownerId = temporaryVoiceChannels.get(userVoiceChannel.id);
        if (!ownerId || ownerId !== member.id) {
            return await interaction.reply({
                content: "❌ **Accès refusé :** Tu n'es pas le propriétaire de ce salon vocal temporaire, tu ne peux pas utiliser cette commande ici.",
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
                content: `✅ Téléporté dans ton salon ! Accès accordé à ${allowedNames.join(', ')} !\n${statusText}.`,
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

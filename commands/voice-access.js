const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-access')
        .setDescription('Autorise une ou plusieurs personnes à accéder à ton salon vocal caché')
        .setDescriptionLocalizations({
            fr: "Autorise une ou plusieurs personnes à accéder à ton salon vocal caché",
            "en-US": "Grants one or more people access to your hidden voice channel"
        })
        .addUserOption(option =>
            option.setName('ami1')
                .setDescription('Le premier ami à autoriser / First friend to allow')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('ami2')
                .setDescription('Un deuxième ami à autoriser (optionnel) / Second friend (optional)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('ami3')
                .setDescription('Un troisième ami à autoriser (optionnel) / Third friend (optional)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('ami4')
                .setDescription('Un quatrième ami à autoriser (optionnel) / Fourth friend (optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const member = interaction.member;
        const PILOT_CHANNEL_ID = "1533281900318167060";

        // 1. Vérifier si l'utilisateur est dans un salon vocal
        const userVoiceChannel = member.voice.channel;

        if (!userVoiceChannel) {
            return await interaction.reply({
                content: `❌ Tu n'es dans aucun salon vocal. Rejoins d'abord le salon vocal <#${PILOT_CHANNEL_ID}> pour gérer les accès de ton salon personnalisé !`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Récupérer tous les amis mentionnés dans les options (jusqu'à 4)
        const friends = [
            interaction.options.getUser('ami1'),
            interaction.options.getUser('ami2'),
            interaction.options.getUser('ami3'),
            interaction.options.getUser('ami4')
        ].filter(Boolean); // Retire les valeurs nulles/non fournies

        if (friends.length === 0) {
            return await interaction.reply({
                content: "❌ Tu dois mentionner au moins un ami (`@utilisateur`) pour lui donner accès.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            const allowedNames = [];

            // Appliquer les permissions pour chaque ami mentionné
            for (const friend of friends) {
                await userVoiceChannel.permissionOverwrites.edit(friend.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true
                });
                allowedNames.push(friend.toString());
            }

            const friendListStr = allowedNames.join(', ');

            return await interaction.reply({
                content: `✅ Accès accordé ! ${friendListStr} peut/peuvent désormais voir et rejoindre ton salon vocal.`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (err) {
            console.error("Erreur lors de l'attribution des accès au vocal :", err);
            return await interaction.reply({
                content: "❌ Une erreur est survenue lors de la modification des permissions pour tes amis.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};

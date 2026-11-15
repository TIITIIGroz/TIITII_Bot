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
                .setDescription('Cacher le salon ? / Hide channel? (oui/non)')
                .setDescriptionLocalizations({
                    fr: "Cacher le salon ? (oui/non)",
                    "en-US": "Hide channel? (yes/no)"
                })
                .setRequired(true)
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

        // 1. Vérifier si l'utilisateur est dans un salon vocal
        const userVoiceChannel = member.voice.channel;

        if (!userVoiceChannel) {
            return await interaction.reply({
                content: `❌ Tu n'es dans aucun salon vocal. Rejoins d'abord le salon vocal <#${PILOT_CHANNEL_ID}> pour gérer les accès de ton salon personnalisé !`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Récupérer le choix de l'option "cacher" (converti en minuscules)
        const cacherInput = interaction.options.getString('cacher').trim().toLowerCase();

        const ouiValues = ['oui', 'yes'];
        const nonValues = ['non', 'no'];

        if (!ouiValues.includes(cacherInput) && !nonValues.includes(cacherInput)) {
            return await interaction.reply({
                content: `❌ Réponse invalide. Tu dois écrire **oui** ou **non** (ou *yes* / *no*).`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const shouldHide = ouiValues.includes(cacherInput);

        // Récupérer tous les amis mentionnés dans les options (jusqu'à 4)
        const friends = [
            interaction.options.getUser('ami1'),
            interaction.options.getUser('ami2'),
            interaction.options.getUser('ami3'),
            interaction.options.getUser('ami4')
        ].filter(Boolean);

        if (friends.length === 0) {
            return await interaction.reply({
                content: "❌ Tu dois mentionner au moins un ami (`@utilisateur`) dont tu souhaites retirer l'accès.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            // 2. Si l'utilisateur a répondu "oui", on cache le salon à tout le monde (@everyone)
            if (shouldHide) {
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: false,
                    [PermissionFlagsBits.Connect]: false
                });
            } else {
                // Si l'utilisateur a répondu "non", on s'assure de ré-autoriser la visibilité globale si besoin, ou on supprime l'override restrictif de everyone
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: null,
                    [PermissionFlagsBits.Connect]: null
                });
            }

            const revokedNames = [];

            // 3. Supprimer l'override de permission pour chaque ami mentionné
            for (const friend of friends) {
                await userVoiceChannel.permissionOverwrites.delete(friend.id);
                revokedNames.push(friend.toString());
            }

            const friendListStr = revokedNames.join(', ');
            const hideMessage = shouldHide ? " (et le salon a été masqué à tout le monde)" : " (et le salon a été rendu visible)";

            return await interaction.reply({
                content: `✅ Accès retiré${hideMessage} ! ${friendListStr} ne peut/peuvent plus accéder à ton salon vocal.`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (err) {
            console.error("Erreur lors du retrait des accès au vocal :", err);
            return await interaction.reply({
                content: "❌ Une erreur est survenue lors de la modification des permissions pour tes amis.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};

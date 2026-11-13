const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-access')
        .setDescription('Autorise une ou plusieurs personnes à accéder à ton salon vocal et gère sa visibilité')
        .setDescriptionLocalizations({
            fr: "Autorise une ou plusieurs personnes à accéder à ton salon vocal et gère sa visibilité",
            "en-US": "Grants one or more people access to your voice channel and manages visibility"
        })
        .addStringOption(option =>
            option.setName('cacher')
                .setDescription('Écris oui ou non pour cacher le salon à tout le monde / Type yes or no to hide the channel from everyone')
                .setDescriptionLocalizations({
                    fr: "Écris oui ou non pour cacher le salon à tout le monde",
                    "en-US": "Type yes or no to hide the channel from everyone"
                })
                .setRequired(true)
        )
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

        // Récupérer le choix de l'option "cacher" (converti en minuscules pour éviter les soucis de casse)
        const cacherInput = interaction.options.getString('cacher').trim().toLowerCase();

        // Vérifier si la réponse correspond à "oui" ou "non" (en acceptant aussi l'anglais yes/no au cas où)
        const ouiValues = ['oui', 'yes'];
        const nonValues = ['non', 'no'];

        if (!ouiValues.includes(cacherInput) && !nonValues.includes(cacherInput)) {
            return await interaction.reply({
                content: `❌ Réponse invalide pour l'option de masquage. Tu dois écrire **oui** ou **non** (ou *yes* / *no* selon la langue de ton Discord).`,
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
        ].filter(Boolean); // Retire les valeurs nulles/non fournies

        if (friends.length === 0) {
            return await interaction.reply({
                content: "❌ Tu dois mentionner au moins un ami (`@utilisateur`) pour lui donner accès.",
                flags: [MessageFlags.Ephemeral]
            });
        }

        try {
            // 2. Si l'utilisateur a répondu "oui", on retire l'accès à tout le monde (@everyone)
            if (shouldHide) {
                await userVoiceChannel.permissionOverwrites.edit(interaction.guild.id, {
                    [PermissionFlagsBits.ViewChannel]: false,
                    [PermissionFlagsBits.Connect]: false
                });
            }

            const allowedNames = [];

            // 3. Appliquer les permissions pour chaque ami mentionné
            for (const friend of friends) {
                await userVoiceChannel.permissionOverwrites.edit(friend.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true
                });
                allowedNames.push(friend.toString());
            }

            const friendListStr = allowedNames.join(', ');
            const hideMessage = shouldHide ? " (et le salon a été masqué à tout le monde)" : "";

            return await interaction.reply({
                content: `✅ Accès accordé${hideMessage} ! ${friendListStr} peut/peuvent désormais voir et rejoindre ton salon vocal.`,
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

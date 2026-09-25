const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-hide')
        .setDescription('Cache ton salon vocal et autorise des personnes spécifiques')
        .setDescriptionLocalizations({
            fr: "Cache ton salon vocal à tout le monde et l'autorise aux personnes mentionnées. Tu dois être dans ton salon ou dans le salon <#1533281900318167060>",
            en: "Hides your custom voice channel and allows specified users. You must be in your voice channel or in <#1533281900318167060>"
        })
        .addUserOption(option =>
            option.setName('utilisateur1')
                .setDescription('La première personne à autoriser / The first user to allow')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('utilisateur2')
                .setDescription('Une deuxième personne (optionnel)')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('utilisateur3')
                .setDescription('Une troisième personne (optionnel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const member = interaction.member;
        const PILOT_CHANNEL_ID = "1533281900318167060";

        // Rôles/groupes à masquer
        const rolesToHide = [
            "1094758180938067989", // EN
            "1094758355085574204", // FR
            "894668498180124703",  // Citoyen
            "1492064548101034076", // admis
            "1509578340141633677"  // Rôle généraux
        ];

        // 1. Vérifier si l'utilisateur est dans un salon vocal
        const userVoiceChannel = member.voice.channel;

        if (!userVoiceChannel) {
            return await interaction.reply({
                content: `❌ Tu n'es dans aucun salon vocal. Rejoins d'abord le salon vocal <#${PILOT_CHANNEL_ID}> pour créer ou gérer ton salon personnalisé !`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Récupérer les utilisateurs mentionnés via les options
        const targetUsers = [
            interaction.options.getUser('utilisateur1'),
            interaction.options.getUser('utilisateur2'),
            interaction.options.getUser('utilisateur3')
        ].filter(Boolean); // Retire les valeurs "null" si elles n'ont pas été remplies

        try {
            // 2. Cacher le salon pour les rôles de base
            for (const roleId of rolesToHide) {
                await userVoiceChannel.permissionOverwrites.edit(roleId, {
                    [PermissionFlagsBits.ViewChannel]: false
                });
            }

            // 3. S'assurer que le créateur garde l'accès total
            await userVoiceChannel.permissionOverwrites.edit(member.id, {
                [PermissionFlagsBits.ViewChannel]: true,
                [PermissionFlagsBits.Connect]: true,
                [PermissionFlagsBits.Speak]: true
            });

            // 4. Donner l'accès aux utilisateurs mentionnés
            for (const targetUser of targetUsers) {
                await userVoiceChannel.permissionOverwrites.edit(targetUser.id, {
                    [PermissionFlagsBits.ViewChannel]: true,
                    [PermissionFlagsBits.Connect]: true,
                    [PermissionFlagsBits.Speak]: true
                });
            }

            const allowedNames = targetUsers.map(u => u.toString()).join(', ');

            return await interaction.reply({
                content: `🔒 Ton salon vocal a été masqué ! Accès accordé à : ${allowedNames}. (Les administrateurs conservent également l'accès).`,
                flags: [MessageFlags.Ephemeral]
            });

        } catch (err) {
            console.error("Erreur lors du masquage du salon vocal :", err);
            return await interaction.reply({
                content: "❌ Une erreur est survenue lors de la modification des permissions du salon.",
                flags: [MessageFlags.Ephemeral]
            });
        }
    },
};

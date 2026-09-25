const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-hide')
        .setDescription('Cache ton salon vocal aux autres membres.')
        .setDescriptionLocalizations({
            fr: "Cache ton salon vocal aux autres membres.",
            "en-US": "Hides your voice channel from members."
        }),

    async execute(interaction) {
        const member = interaction.member;
        const guild = interaction.guild;
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

        try {
            // Modification des permissions du salon vocal actuel de l'utilisateur
            for (const roleId of rolesToHide) {
                await userVoiceChannel.permissionOverwrites.edit(roleId, {
                    [PermissionFlagsBits.ViewChannel]: false
                });
            }

            // S'assurer que le créateur garde l'accès total
            await userVoiceChannel.permissionOverwrites.edit(member.id, {
                [PermissionFlagsBits.ViewChannel]: true,
                [PermissionFlagsBits.Connect]: true,
                [PermissionFlagsBits.Speak]: true
            });

            return await interaction.reply({
                content: "🔒 Ton salon vocal a été masqué avec succès ! Seuls les administrateurs et toi-même pouvez le voir.",
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

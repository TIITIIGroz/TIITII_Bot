const { Events } = require('discord.js');

// 🆔 IDs des salons de statistiques et du rôle concerné
const ROLE_ID_TO_COUNT = "894668498180124703"; 
const STATS_ROLE_CHANNEL_ID = "1132082939119800350"; // Remplace par l'ID de ton salon rôle
const STATS_VOICE_CHANNEL_ID = "1561439640710283287"; // Remplace par l'ID de ton salon vocal

async function updateServerStats(guild) {
    if (!guild) return;

    try {
        await guild.members.fetch().catch(() => null);

        // 1. Compter les membres ayant le rôle
        const roleMembersCount = guild.members.cache.filter(member => member.roles.cache.has(ROLE_ID_TO_COUNT)).size;

        // 2. Compter le nombre total de personnes en vocal sur le serveur
        const totalInVoice = guild.voiceStates.cache.filter(vs => vs.channelId !== null).size;

        // Mise à jour du salon Rôle (Conserve ton texte personnalisé et met juste à jour le nombre)
        const roleChannel = guild.channels.cache.get(STATS_ROLE_CHANNEL_ID);
        if (roleChannel) {
            const newRoleChannelName = `力  𝑻𝒐𝒕𝒂𝒍 𝑴𝒆𝒎𝒃𝒆𝒓𝒔: ${roleMembersCount}`; // Modifie ici le texte si tu veux
            if (roleChannel.name !== newRoleChannelName) {
                await roleChannel.setName(newRoleChannelName).catch(() => {});
            }
        }

        // Mise à jour du salon Vocal (Conserve ton texte personnalisé et met juste à jour le nombre)
        const voiceChannel = guild.channels.cache.get(STATS_VOICE_CHANNEL_ID);
        if (voiceChannel) {
            const newVoiceChannelName = `か  𝑻𝒐𝒕𝒂𝒍 𝑽𝒐𝒄-𝑽𝒐𝒊𝒄𝒆: ${totalInVoice}`; // Modifie ici le texte si tu veux
            if (voiceChannel.name !== newVoiceChannelName) {
                await voiceChannel.setName(newVoiceChannelName).catch(() => {});
            }
        }

    } catch (error) {
        console.error("Erreur lors de la mise à jour des stats :", error);
    }
}

module.exports = (client) => {
    // 🔄 Au démarrage du bot
    client.once(Events.ClientReady, async () => {
        client.guilds.cache.forEach(guild => updateServerStats(guild));
    });

    // 🎙 Ultra réactif : Dès qu'un utilisateur change de salon vocal (rejoint/quitte/mute/etc.)
    client.on(Events.VoiceStateUpdate, (oldState, newState) => {
        const guild = newState.guild || oldState.guild;
        if (guild) updateServerStats(guild);
    });

    // 👤 Ultra réactif : Dès qu'un membre gagne ou perd un rôle
    client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
        if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
            updateServerStats(newMember.guild);
        }
    });

    // 📥 Ultra réactif : Dès qu'un nouveau membre arrive sur le serveur
    client.on(Events.GuildMemberAdd, (member) => {
        updateServerStats(member.guild);
    });

    // 📤 Ultra réactif : Dès qu'un membre quitte le serveur
    client.on(Events.GuildMemberRemove, (member) => {
        updateServerStats(member.guild);
    });
};

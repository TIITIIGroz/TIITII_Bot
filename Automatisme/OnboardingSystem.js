const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ADMIS_ROLE_ID = '1492064548101034076';
const RULES_CHANNEL_ID = '864920115270909972';
const LANG_CHANNEL_ID = '896545873570455553';
const FR_ROLE_ID = '1094758355085574204';
const EN_ROLE_ID = '1094758180938067989';

module.exports = (client) => {
    // 1. Détection de l'attribution du rôle Admis
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const hadAdmis = oldMember.roles.cache.has(ADMIS_ROLE_ID);
        const hasAdmis = newMember.roles.cache.has(ADMIS_ROLE_ID);

        // Si le membre vient de recevoir le rôle "admis"
        if (!hadAdmis && hasAdmis) {
            const rulesChannel = await newMember.guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);
            if (rulesChannel) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('rules_accept')
                        .setLabel('✅ Accepter / Accept')
                        .setStyle(ButtonStyle.Success)
                );

                await rulesChannel.send({
                    content: `<@${newMember.id}> Lisez et acceptez en appuyant sur le bouton ✅\n\n----------------------------------------------\n<@${newMember.id}> Read and accept by pressing the button ✅`,
                    components: [row]
                });
            }
        }
    });

    // 2. Gestion des boutons (Règles et Langues)
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        const member = interaction.member;

        // Bouton d'acceptation des règles
        if (interaction.customId === 'rules_accept') {
            await interaction.deferUpdate().catch(() => {});

            // Supprimer le message des règles
            try {
                await interaction.message.delete().catch(() => {});
            } catch (err) {}

            // Envoyer le message de choix de langue
            const langChannel = await interaction.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
            if (langChannel) {
                const langRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lang_fr')
                        .setLabel('🇫🇷 Français')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('lang_en')
                        .setLabel('🇬🇧 English')
                        .setStyle(ButtonStyle.Secondary)
                );

                await langChannel.send({
                    content: `<@${member.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${member.id}> don’t forget to choose your language !`,
                    components: [langRow]
                });
            }
        }

        // Boutons de choix de langue (Français / Anglais)
        if (interaction.customId === 'lang_fr' || interaction.customId === 'lang_en') {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
            
            const roleIdToAdd = interaction.customId === 'lang_fr' ? FR_ROLE_ID : EN_ROLE_ID;
            const roleName = interaction.customId === 'lang_fr' ? 'Français' : 'English';

            let actionText = '';
            if (!member.roles.cache.has(roleIdToAdd)) {
                await member.roles.add(roleIdToAdd).catch(console.error);
                actionText = `✅ Rôle ${roleName} attribué !`;
            } else {
                await member.roles.remove(roleIdToAdd).catch(console.error);
                actionText = `❌ Rôle ${roleName} retiré.`;
            }

            await interaction.editReply({ content: actionText }).catch(() => {});

            // Vérifier après l'action si la personne a encore au moins un rôle de langue
            // On rafraîchit le cache du membre
            const updatedMember = await interaction.guild.members.fetch(member.id).catch(() => member);
            const hasLangRole = updatedMember.roles.cache.has(FR_ROLE_ID) || updatedMember.roles.cache.has(EN_ROLE_ID);

            // Si la personne n'a plus AUCUN rôle de langue (si elle a retiré son choix), on relance le message de choix de langue
            if (!hasLangRole) {
                const langChannel = await interaction.guild.channels.fetch(LANG_CHANNEL_ID).catch(() => null);
                if (langChannel) {
                    const langRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('lang_fr')
                            .setLabel('🇫🇷 Français')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('lang_en')
                            .setLabel('🇬🇧 English')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await langChannel.send({
                        content: `<@${updatedMember.id}> n’oubliez pas de choisir votre langue !\n\n----------------------------------------------\n<@${updatedMember.id}> don’t forget to choose your language !`,
                        components: [langRow]
                    });
                }
            } else {
                // Si elle a bien choisi au moins une langue, on supprime le message de choix de langue actuel
                try {
                    await interaction.message.delete().catch(() => {});
                } catch (err) {}
            }
        }
    });
};

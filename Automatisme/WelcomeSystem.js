const { Events, AttachmentBuilder } = require('discord.js');
const path = require('path');
const supabase = require('../supabase'); // Connexion Supabase

const MEMBRE_ROLE_ID = '894668498180124703'; // ID du rôle "Membre" qui déclenche l'accueil unique

module.exports = (client) => {
    // Uniquement le salon avec l'image de bienvenue
    const welcomeChannelId = '894671498965561394';

    // 1. Événement lorsqu'un membre obtient le rôle Membre (pour la première fois)
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const hadMembreRole = oldMember.roles.cache.has(MEMBRE_ROLE_ID);
        const hasMembreRole = newMember.roles.cache.has(MEMBRE_ROLE_ID);

        if (!hadMembreRole && hasMembreRole) {
            const guildId = newMember.guild.id;
            const userId = newMember.id;

            try {
                // Vérifier dans Supabase si l'utilisateur a déjà été accueilli
                const { data: existingUser, error: selectError } = await supabase
                    .from('welcomed_users')
                    .select('user_id')
                    .eq('guild_id', guildId)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (selectError) {
                    console.error("Erreur vérification welcomed_users :", selectError);
                }

                // S'il a déjà été accueilli, on ne fait rien
                if (existingUser) return;

                // Enregistrer l'utilisateur en BDD pour garantir l'accueil unique
                const { error: insertError } = await supabase
                    .from('welcomed_users')
                    .insert([{ guild_id: guildId, user_id: userId }]);

                if (insertError) {
                    console.error("Erreur insertion welcomed_users :", insertError);
                    return;
                }

                // A. Envoi de l'image et du message bilingue dans le salon dédié à la photo
                const welcomeChannel = await newMember.guild.channels.fetch(welcomeChannelId).catch(() => null);
                if (welcomeChannel) {
                    const imagePath = path.join(__dirname, '../Images/Welcome.png');
                    const attachment = new AttachmentBuilder(imagePath, { name: 'Welcome.png' });
                    const welcomeMessage = `Bienvenu(e) ! ${newMember} vient de nous rejoindre, j'espère que tu as pris tes chips 🍟!\n----------------------------------------------\nWelcome ! ${newMember} just joined us, I hope you took your chips 🍟!`;

                    await welcomeChannel.send({
                        content: welcomeMessage,
                        files: [attachment]
                    });
                }

                // B. Envoi du message de présentation en Message Privé (DM)
                try {
                    const dmMessage = `┌━━━━━━━━━━━━━┐⚕️ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ⚕️┌━━━━━━━━━━━━━┐

▬▬▬▬▬▬▬▬▬▬▬▬⊰ ♛ ⊱▬▬▬▬▬▬▬▬▬▬▬▬▬

🛡️ ✦ sᴇʀᴠᴇᴜʀ ɢᴀᴍɪɴɢ & ᴄʜɪʟʟ ᴏᴜᴠᴇʀᴛ ᴀ̀ ᴛᴏᴜs.

🎮 ✦ ᴊᴇᴜx ᴘʀɪɴᴄɪᴘᴀᴜx :
➤ Rocket League  
➤ Call of Duty  
➤ Minecraft  
➤ Rainbow Six Siege  
➤ ᴇᴛ ʙɪᴇɴ ᴅ’ᴀᴜᴛʀᴇs sᴇʟᴏɴ ᴠᴏs ᴇɴᴠɪᴇs !

🤝 ✦ ᴜɴᴇ ᴄᴏᴍᴍᴜɴᴀᴜᴛᴇ́ ᴄʜɪʟʟ ᴇᴛ ғᴜɴ.

🎧 ✦ ᴅᴇs sᴀʟᴏɴs ᴠᴏᴄᴀᴜx ᴘᴏᴜʀ ᴊᴏᴜᴇʀ ᴇɴsᴇᴍʙʟᴇ.

💬 ✦ ᴅᴇs ᴅɪsᴄᴜssɪᴏɴs ᴘᴏᴜʀ ᴄʜɪʟʟ ᴇᴛ ғᴀɪʀᴇ ᴅᴇs ʀᴇɴᴄᴏɴᴛʀᴇs.

🤖 ✦ ᴅᴇs ْبots ᴘᴏᴜʀ ᴀᴍᴇ́ʟɪᴏʀᴇʀ ᴠᴏᴛʀᴇ ᴇxᴘᴇ́ʀɪᴇɴᴄᴇ.

📷 ✦ ᴘᴀʀᴛᴀɢᴇ de ᴄʀᴇ́ᴀᴛɪᴏɴs, ᴄʟɪps et ᴍᴏᴍᴇɴᴛs.

😂 ✦ ʙᴏɴɴᴇ ʜᴜᴍᴇᴜʀ ᴏʙʟɪɢᴀᴛᴏɪʀᴇ (2ᴇ ᴅᴇɢʀᴇ́ ᴄᴏnsᴇɪʟʟᴇ́ 😏).

💎 ✦ ɪᴄɪ, ᴛᴜ ᴛʀᴏᴜᴠᴇs ᴛᴏᴜᴊᴏᴜʀs ᴅᴇs ᴊᴏᴜᴇᴜʀs ᴘᴏᴜʀ ᴛᴇ ʟᴀɴᴄᴇʀ.

🔥 ✦ ʀᴇᴊᴏɪɢɴᴇᴢ ʟᴀ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ᴅᴇ̀s ᴍᴀɪɴᴛᴇɴᴀɴْت !

🎟️ ✦ ᴛᴏɴ ᴛɪᴄᴋᴇᴛ ➝ https://invites.gg/TIITII_Groz
                    https://discord.gg/ZrZy5d9Mgd

📹 ✦ ʀᴇ́sᴇᴀᴜx ➝ https://beacons.ai/tiitii_groz

▬▬▬▬▬▬▬▬▬▬▬▬⊰ ♛ ⊱▬▬▬▬▬▬▬▬▬▬▬▬▬

└━━━━━━━━━━━━━┘⚕️ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ⚕️└━━━━━━━━━━━━━┘`;

                    await newMember.send(dmMessage);
                } catch (dmError) {
                    console.log(`Impossible d'envoyer le MP de bienvenue à ${newMember.user.tag} (DMs fermés).`);
                }

            } catch (err) {
                console.error("Erreur critique dans le système de bienvenue :", err);
            }
        }
    });

    // 2. Si le membre quitte le serveur, on supprime son entrée de Supabase
    client.on(Events.GuildMemberRemove, async (member) => {
        try {
            await supabase
                .from('welcomed_users')
                .delete()
                .eq('guild_id', member.guild.id)
                .eq('user_id', member.id);
        } catch (err) {
            console.error("Erreur lors de la suppression du membre de welcomed_users :", err);
        }
    });
};

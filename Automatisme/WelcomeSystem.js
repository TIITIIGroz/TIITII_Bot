const { Events, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = (client) => {
    const welcomeChannelId = '894671498965561394'; // Salon avec la photo
    const notificationChannelId = '895430893416636417'; // Salon pour le message textuel (Config/Alertes ou autre)

    client.on(Events.GuildMemberAdd, async (member) => {
        try {
            // 1. Envoi de l'image et du message dans le salon de bienvenue
            const welcomeChannel = await member.guild.channels.fetch(welcomeChannelId).catch(() => null);
            if (welcomeChannel) {
                const imagePath = path.join(__dirname, '../Images/Welcome.png'); 
                const attachment = new AttachmentBuilder(imagePath, { name: 'Welcome.png' });
                const welcomeMessage = `Bienvenu(e) ! ${member} vient de nous rejoindre, j'espère que tu as pris tes chips 🍟!`;

                await welcomeChannel.send({
                    content: welcomeMessage,
                    files: [attachment]
                });
            }

            // 2. Envoi du message spécial dans l'autre salon
            const notificationChannel = await member.guild.channels.fetch(notificationChannelId).catch(() => null);
            if (notificationChannel) {
                await notificationChannel.send(`${member} vient d'arriver dans le royaume !`);
            }

            // 3. Envoi du message de présentation en Message Privé (DM) à l'utilisateur
            try {
                const dmMessage = 
`┌━━━━━━━━━━━━━┐⚕️ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ⚕️┌━━━━━━━━━━━━━┐

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

🤖 ✦ ᴅᴇs ʙᴏᴛs ᴘᴏᴜʀ ᴀᴍᴇ́ʟɪᴏʀᴇʀ ᴠᴏᴛʀᴇ ᴇxᴘᴇ́ʀɪᴇɴᴄᴇ.

📷 ✦ ᴘᴀʀᴛᴀɢᴇ de ᴄʀᴇ́ᴀᴛɪᴏɴs, ᴄʟɪps et ᴍᴏᴍᴇɴᴛs.

😂 ✦ ʙᴏɴɴᴇ ʜᴜᴍᴇᴜʀ ᴏʙʟɪɢᴀᴛᴏɪʀᴇ (2ᴇ ᴅᴇɢʀᴇ́ ᴄᴏnsᴇɪʟʟᴇ́ 😏).

💎 ✦ ɪᴄɪ, ᴛᴜ ᴛʀᴏᴜᴠᴇs ᴛᴏᴜᴊᴏᴜʀs ᴅᴇs ᴊᴏᴜᴇᴜʀs ᴘᴏᴜʀ ᴛᴇ ʟᴀɴᴄᴇʀ.

🔥 ✦ ʀᴇᴊᴏɪɢɴᴇᴢ ʟᴀ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ᴅᴇ̀s ᴍᴀɪɴᴛᴇɴᴀɴᴛ !

🎟️ ✦ ᴛᴏɴ ᴛɪᴄᴋᴇᴛ ➝ https://invites.gg/TIITII_Groz

📹 ✦ ʀᴇ́sᴇᴀᴜx ➝ https://beacons.ai/tiitii_groz
▬▬▬▬▬▬▬▬▬▬▬▬⊰ ♛ ⊱▬▬▬▬▬▬▬▬▬▬▬▬▬

└━━━━━━━━━━━━━┘⚕️ 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ⚕️└━━━━━━━━━━━━━┘`;

                await member.send(dmMessage);
            } catch (dmError) {
                // L'utilisateur a probablement ses messages privés fermés (bloqués)
                console.log(`Impossible d'envoyer le MP de bienvenue à ${member.user.tag} (DMs fermés).`);
            }

        } catch (error) {
            console.error("Erreur lors de l'envoi du message de bienvenue :", error);
        }
    });
};

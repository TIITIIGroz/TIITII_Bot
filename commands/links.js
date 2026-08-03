const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("links")
        .setDescription("Affiche tous les liens de 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛"),

    async execute(interaction) {

        const embed = new EmbedBuilder()

            .setColor(0x9146FF)

            .setTitle("🔗 Les liens de 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 -- Social media of 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛")

            .setDescription(
`**Salut ! Voici comme demandé les liens de** 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛

*Hey! Here are the socials for* 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛

🌐 *Tous ses réseaux -- All his links:*
https://beacons.ai/𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛

🎥 **Twitch:**
https://twitch.tv/𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛

🎬 **YouTube:**
https://youtube.com/@𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛

📸 **TikTok:**
https://tiktok.com/@𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛`
)

            .setFooter({
                text: "𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛"
            })

            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }

};

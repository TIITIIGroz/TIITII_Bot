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

            .setTitle("🔗 Les liens de 𝑻𝑰𝑰𝑻𝑰𝑰𝑮𝒓𝒐𝒛 - Social media of 𝑻𝑰𝑰𝑻𝑰𝑰𝑮𝒓𝒐𝒛")

            .setDescription(
`**Salut ! Voici comme demandé les liens de** 𝑻𝑰𝑰𝑻𝑰𝑰𝑮𝒓𝒐𝒛

**Hey! Here are the socials for** 𝑻𝑰𝑰𝑻𝑰𝑰𝑮𝒓𝒐𝒛

🌐 **Tous ses réseaux / All his links:**
https://beacons.ai/TIITII_Groz

🎥 **Twitch:**
https://twitch.tv/TIITII_Groz

🎬 **YouTube:**
https://youtube.com/@TIITII_Groz

📸 **TikTok:**
https://tiktok.com/@TIITII_Groz`
)

            .setFooter({
                text: "TIITII_Groz"
            })

            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }

};

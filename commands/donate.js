const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('donate')
        .setDescription('Affiche les liens pour soutenir et faire un don')
        .setDescriptionLocalizations({
            fr: "Affiche les liens pour soutenir et faire un don",
            "en-US": "Displays links to support and donate"
        }),

    async execute(interaction) {
        // Tu peux rendre la réponse visible uniquement pour la personne (true) ou pour tout le salon (false)
        const isEphemeral = false; 

        const donateEmbed = new EmbedBuilder()
            .setColor('#9b59b6') // Vert pour les dons/soutien
            .setTitle('Soutenir le Créateur du serveur / Support the Creator of the server')
            .setDescription(`
🇫🇷 ___**Français**___ 🇫🇷

Merci de vouloir soutenir le projet et la communauté 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 ! 
Tu peux faire un don ou apporter ton soutien via les liens ci-dessous :

• **PayPal :** https://www.paypal.com/paypalme/TiiTiiGroz
• **Tipeee :** https://tipeee.com/TIITIIGROZ
• **Booster le serveur :** Un grand merci si tu décides de booster le serveur !

----------------------------------------------

🇬🇧 ___**English**___ 🇬🇧

Thank you for wanting to support the project and the 𝑭𝒂𝒎𝒊𝒍𝒍𝒆 𝑮𝒓𝒐𝒛 community!
You can donate or show your support using the links below:

• **PayPal :** https://www.paypal.com/paypalme/TiiTiiGroz
• **Tipeee :** https://tipeee.com/TIITIIGROZ
• **Boost the server:** A huge thank you if you decide to boost the server!
            `.trim())
            .setFooter({ text: 'Merci pour ton soutien ! / Thank you for your support!' });

        return await interaction.reply({
            embeds: [donateEmbed],
            ephemeral: isEphemeral
        });
    },
};

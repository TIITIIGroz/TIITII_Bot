const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sondage')
        .setDescription('Crée un sondage interactif avec jusqu\'à 10 choix.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('question')
                .setDescription('La question du sondage')
                .setRequired(true)
        )
        .addStringOption(option => option.setName('choix1').setDescription('Premier choix').setRequired(true))
        .addStringOption(option => option.setName('choix2').setDescription('Deuxième choix').setRequired(true))
        .addStringOption(option => option.setName('choix3').setDescription('Troisième choix').setRequired(false))
        .addStringOption(option => option.setName('choix4').setDescription('Quatrième choix').setRequired(false))
        .addStringOption(option => option.setName('choix5').setDescription('Cinquième choix').setRequired(false))
        .addStringOption(option => option.setName('choix6').setDescription('Sixième choix').setRequired(false))
        .addStringOption(option => option.setName('choix7').setDescription('Septième choix').setRequired(false))
        .addStringOption(option => option.setName('choix8').setDescription('Huitième choix').setRequired(false))
        .addStringOption(option => option.setName('choix9').setDescription('Neuvième choix').setRequired(false))
        .addStringOption(option => option.setName('choix10').setDescription('Dixième choix').setRequired(false)),

    async execute(interaction) {
        const isAdmin = ADMIN_USER_IDS.includes(interaction.user.id) || interaction.member.roles.cache.some(r => ADMIN_ROLE_IDS.includes(r.id));
        if (!isAdmin) return interaction.reply({ content: "❌ Seuls les administrateurs peuvent utiliser cette commande.", flags: [MessageFlags.Ephemeral] });

        const question = interaction.options.getString('question');
        
        // Récupère tous les choix remplis (de 1 à 10)
        const choices = [];
        for (let i = 1; i <= 10; i++) {
            const val = interaction.options.getString(`choix${i}`);
            if (val) choices.push(val);
        }

        // Map pour stocker les votes : idDuMembre -> indexDuChoix
        const votes = new Map();

        const generateEmbed = () => {
            const counts = new Array(choices.length).fill(0);
            votes.forEach(choiceIndex => counts[choiceIndex]++);

            let description = "";
            choices.forEach((choice, index) => {
                const count = counts[index];
                description += `**${index + 1}.** ${choice} — **${count}** vote(s)\n`;
            });

            return new EmbedBuilder()
                .setColor('#57F287')
                .setTitle(`📊 Sondage : ${question}`)
                .setDescription(description)
                .setFooter({ 
                    text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛 - ${new Date().toLocaleTimeString('fr-FR', { 
                        timeZone: 'Europe/Paris', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}\\` 
                });
        }; // ⬅️ L'accolade fermante de generateEmbed était manquante ici !

        const generateRow = (disabled = false) => {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('poll_select')
                .setPlaceholder('Sélectionne ton choix...')
                .setDisabled(disabled);

            choices.forEach((choice, index) => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(choice.length > 100 ? choice.substring(0, 97) + '...' : choice)
                        .setValue(`${index}`)
                );
            });

            return new ActionRowBuilder().addComponents(selectMenu);
        };

        await interaction.reply({
            embeds: [generateEmbed()],
            components: [generateRow()]
        });

        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ time: 86400000 }); // Expire après 24h

        collector.on('collect', async i => {
            if (!i.isStringSelectMenu()) return;

            const choiceIndex = parseInt(i.values[0]);
            
            // Enregistre ou met à jour le vote de l'utilisateur
            votes.set(i.user.id, choiceIndex);

            await i.update({
                embeds: [generateEmbed()],
                components: [generateRow()]
            });

            await i.followUp({ content: `✅ Votre vote pour le choix **${choices[choiceIndex]}** a bien été pris en compte !`, flags: [MessageFlags.Ephemeral] });
        });

        collector.on('end', () => {
            message.edit({ components: [generateRow(true)] }).catch(() => {});
        });
    },
};

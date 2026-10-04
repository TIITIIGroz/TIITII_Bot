const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sondage')
        .setDescription('Crée un sondage interactif.')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('La question du sondage')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('choix1')
                .setDescription('Premier choix')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('choix2')
                .setDescription('Deuxième choix')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('choix3')
                .setDescription('Troisième choix (optionnel)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('choix4')
                .setDescription('Quatrième choix (optionnel)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const question = interaction.options.getString('question');
        const choices = [
            interaction.options.getString('choix1'),
            interaction.options.getString('choix2'),
            interaction.options.getString('choix3'),
            interaction.options.getString('choix4')
        ].filter(Boolean); // Retire les choix vides

        // Map pour stocker les votes : idDuMembre -> indexDuChoix
        const votes = new Map();

        const generateEmbed = () => {
            // Compter les votes
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
                .setFooter({ text: `Sondage lancé par ${interaction.user.tag}` })
                .setTimestamp();
        };

        const generateRow = () => {
            const row = new ActionRowBuilder();
            choices.forEach((_, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${index}`)
                        .setLabel(`${index + 1}`)
                        .setStyle(ButtonStyle.Primary)
                );
            });
            return row;
        };

        await interaction.reply({
            embeds: [generateEmbed()],
            components: [generateRow()]
        });

        const message = await interaction.fetchReply();
        const filter = i => i.customId.startsWith('poll_vote_');
        const collector = message.createMessageComponentCollector({ time: 86400000 }); // Expire après 24h

        collector.on('collect', async i => {
            const choiceIndex = parseInt(i.customId.split('_')[2]);
            
            // Enregistre ou met à jour le vote de l'utilisateur
            votes.set(i.user.id, choiceIndex);

            await i.update({
                embeds: [generateEmbed()],
                components: [generateRow()]
            });

            await i.followUp({ content: `✅ Votre vote pour le choix **${choices[choiceIndex]}** a bien été pris en compte !`, flags: [MessageFlags.Ephemeral] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder();
            choices.forEach((_, index) => {
                disabledRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_expired_${index}`)
                        .setLabel(`${index + 1}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
            });
            message.edit({ components: [disabledRow] }).catch(() => {});
        });
    },
};

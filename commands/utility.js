const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = [
    // 1️⃣ COMMANDE : /random-number (Chiffre aléatoire)
    {
        data: new SlashCommandBuilder()
            .setName('random-number')
            .setDescription('Génère un nombre aléatoire entre Min et Max / Generates a random number')
            .addIntegerOption(opt => 
                opt.setName('min')
                   .setDescription('Valeur minimale / Minimum value')
                   .setRequired(true))
            .addIntegerOption(opt => 
                opt.setName('max')
                   .setDescription('Valeur maximale / Maximum value')
                   .setRequired(true)),
        async execute(interaction) {
            const min = interaction.options.getInteger('min');
            const max = interaction.options.getInteger('max');

            if (min >= max) {
                return interaction.reply({ 
                    content: '❌ **[FR]** Le minimum doit être inférieur au maximum !\n❌ **[EN]** Min must be less than Max!', 
                    flags: [1 << 6] 
                });
            }

            const result = Math.floor(Math.random() * (max - min + 1)) + min;

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('🎲 Nombre Aléatoire / Random Number')
                .addFields(
                    { name: '📊 Plage / Range', value: `\`${min}\` - \`${max}\``, inline: true },
                    { name: '🎯 Résultat / Result', value: `**${result}**`, inline: true }
                )
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },

    // 2️⃣ COMMANDE : /choose-name (Choix aléatoire parmi une liste de noms)
    {
        data: new SlashCommandBuilder()
            .setName('choose-name')
            .setDescription('Choisit un nom au hasard parmi une liste séparée par des virgules / Chooses a random name')
            .addStringOption(opt => 
                opt.setName('names')
                   .setDescription('Noms séparés par des virgules (ex: Alex, Thomas, Sarah) / Names separated by commas')
                   .setRequired(true)),
        async execute(interaction) {
            const rawInput = interaction.options.getString('names');
            const namesArray = rawInput.split(',').map(name => name.trim()).filter(name => name.length > 0);

            if (namesArray.length < 2) {
                return interaction.reply({ 
                    content: '❌ **[FR]** Veuillez entrer au moins 2 noms séparés par une virgule !\n❌ **[EN]** Please enter at least 2 names separated by commas!', 
                    flags: [1 << 6] 
                });
            }

            const chosen = namesArray[Math.floor(Math.random() * namesArray.length)];

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎯 Tirage au Sort / Random Choice')
                .addFields(
                    { name: '👥 Options', value: namesArray.map(n => `• ${n}`).join('\n') },
                    { name: '👑 Gagnant(e) / Winner', value: `🏆 **${chosen}**` }
                )
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        }
    },

    // 3️⃣ COMMANDE : /poll (Sondage avec votes)
    {
        data: new SlashCommandBuilder()
            .setName('poll')
            .setDescription('Crée un sondage avec réaction / Create a poll')
            .addStringOption(opt => 
                opt.setName('question')
                   .setDescription('La question du sondage / Poll question')
                   .setRequired(true)),
        async execute(interaction) {
            const question = interaction.options.getString('question');

            const pollEmbed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('📊 SONDAGE / POLL')
                .setDescription(`**${question}**\n\n🟢 **Oui / Yes**\n🔴 **Non / No**`)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛` })
                .setTimestamp();

            const msg = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });
            await msg.react('🟢');
            await msg.react('🔴');
        }
    },

    // 4️⃣ COMMANDE : /clear (Purge de messages - Admin uniquement)
    {
        data: new SlashCommandBuilder()
            .setName('clear')
            .setDescription('Supprime un nombre précis de messages / Delete a specified amount of messages')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
            .addIntegerOption(opt => 
                opt.setName('amount')
                   .setDescription('Nombre de messages à supprimer (1-100) / Amount of messages to delete (1-100)')
                   .setRequired(true)),
        async execute(interaction) {
            const amount = interaction.options.getInteger('amount');

            if (amount < 1 || amount > 100) {
                return interaction.reply({ 
                    content: '❌ **[FR]** Choisis un nombre entre 1 et 100.\n❌ **[EN]** Choose a number between 1 and 100.', 
                    flags: [1 << 6] 
                });
            }

            const deleted = await interaction.channel.bulkDelete(amount, true).catch(err => {
                console.error(err);
                return null;
            });

            if (!deleted) {
                return interaction.reply({ 
                    content: '❌ **[FR]** Impossible de supprimer des messages datant de plus de 14 jours.\n❌ **[EN]** Cannot delete messages older than 14 days.', 
                    flags: [1 << 6] 
                });
            }

            return interaction.reply({ 
                content: `🗑️ **[FR]** \`${deleted.size}\` messages supprimés avec succès !\n🗑️ **[EN]** \`${deleted.size}\` messages deleted successfully!`, 
                flags: [1 << 6] 
            });
        }
    },

    // 5️⃣ COMMANDE : /giveaway (Concours rapide avec bouton)
    {
        data: new SlashCommandBuilder()
            .setName('giveaway')
            .setDescription('Lance un concours express / Start a quick giveaway')
            .addStringOption(opt => 
                opt.setName('prize')
                   .setDescription('Le lot à gagner / The prize to win')
                   .setRequired(true))
            .addIntegerOption(opt => 
                opt.setName('duration')
                   .setDescription('Durée en minutes / Duration in minutes')
                   .setRequired(true)),
        async execute(interaction) {
            const prize = interaction.options.getString('prize');
            const duration = interaction.options.getInteger('duration');
            const endTime = Math.floor((Date.now() + duration * 60 * 1000) / 1000);

            const participants = new Set();

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🎉 CONCOURS / GIVEAWAY 🎉')
                .setDescription(`**Lot / Prize:** ${prize}\n\n⏳ **Fin / Ends:** <t:${endTime}:R>\n👥 **Participants:** 0`)
                .setFooter({ text: `/Bot créé par 𝑻𝑰𝑰𝑻𝑰𝑰_𝑮𝒓𝒐𝒛\\` })
                .setTimestamp();

            const joinButton = new ButtonBuilder()
                .setCustomId('btn_join_giveaway')
                .setLabel('Participer / Join 🎉')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(joinButton);

            const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: duration * 60 * 1000 });

            collector.on('collect', async (i) => {
                if (i.customId === 'btn_join_giveaway') {
                    if (participants.has(i.user.id)) {
                        participants.delete(i.user.id);
                        await i.reply({ content: '❌ **[FR]** Tu as retiré ta participation.\n❌ **[EN]** You left the giveaway.', flags: [1 << 6] });
                    } else {
                        participants.add(i.user.id);
                        await i.reply({ content: '✅ **[FR]** Ta participation est validée !\n✅ **[EN]** You entered the giveaway!', flags: [1 << 6] });
                    }

                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setDescription(`**Lot / Prize:** ${prize}\n\n⏳ **Fin / Ends:** <t:${endTime}:R>\n👥 **Participants:** ${participants.size}`);

                    await msg.edit({ embeds: [updatedEmbed] });
                }
            });

            collector.on('end', async () => {
                const arrayParticipants = Array.from(participants);
                
                if (arrayParticipants.length === 0) {
                    const endEmbed = EmbedBuilder.from(embed)
                        .setDescription(`**Lot / Prize:** ${prize}\n\n❌ **Aucun participant / No participants.**`);
                    return await msg.edit({ embeds: [endEmbed], components: [] });
                }

                const winnerId = arrayParticipants[Math.floor(Math.random() * arrayParticipants.length)];

                const endEmbed = EmbedBuilder.from(embed)
                    .setDescription(`**Lot / Prize:** ${prize}\n\n🏆 **Gagnant(e) / Winner:** <@${winnerId}>`);

                await msg.edit({ embeds: [endEmbed], components: [] });
                await interaction.channel.send(`🎉 Félicitations / Congratulations <@${winnerId}>! Tu as gagné / You won **${prize}** !`);
            });
        }
    }
];

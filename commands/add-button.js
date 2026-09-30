const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } = require('discord.js');
const supabase = require('../supabase');

// ID du salon où envoyer la notification de création mis à jour
const LOG_CHANNEL_ID = '1553085810369237132';
// ID du rôle Administrateur autorisé
const ADMIN_ROLE_ID = '894669520902451220';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-button')
        .setDescription('Ajoute un bouton interactif avec une clé unique')
        // 🔒 Ceci masque et réserve la commande aux administrateurs sur Discord
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID du message cible')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('button_name')
                .setDescription('Le nom affiché sur le bouton')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('key')
                .setDescription('Une clé unique (ex: regles_en, regles_fr)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('response_text')
                .setDescription('Le texte secret affiché en éphémère')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        // Vérification si le membre possède le rôle admin requis (double sécurité)
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.editReply({ 
                content: "❌ Vous n'avez pas la permission d'utiliser cette commande (rôle administrateur requis)." 
            });
        }

        const messageId = interaction.options.getString('message_id');
        const buttonName = interaction.options.getString('button_name');
        const key = interaction.options.getString('key').trim().toLowerCase();
        const responseText = interaction.options.getString('response_text');
        const channelName = interaction.channel.name;

        try {
            const message = await interaction.channel.messages.fetch(messageId);
            if (!message) {
                return interaction.editReply({ content: "❌ Impossible de trouver un message avec cet ID." });
            }

            // Enregistrement dans Supabase avec la clé unique
            const { error: dbError } = await supabase
                .from('button_translations')
                .upsert({ key: key, response_text: responseText });

            if (dbError) {
                console.error("Erreur Supabase upsert :", dbError);
                return interaction.editReply({ content: "❌ Erreur lors de l'enregistrement en base de données." });
            }

            const newButton = new ButtonBuilder()
                .setCustomId(`translate_${key}`)
                .setLabel(buttonName)
                .setStyle(ButtonStyle.Primary);

            let rows = message.components.map(row => ActionRowBuilder.from(row));
            let added = false;

            for (let row of rows) {
                if (row.components.length < 5) {
                    row.addComponents(newButton);
                    added = true;
                    break;
                }
            }

            if (!added) {
                if (rows.length >= 5) {
                    return interaction.editReply({ content: "❌ Ce message a atteint la limite maximale de boutons." });
                }
                const newRow = new ActionRowBuilder().addComponents(newButton);
                rows.push(newRow);
            }

            await message.edit({ components: rows });

            // Envoi de la notification détaillée dans le nouveau salon de log
            try {
                const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
                if (logChannel) {
                    await logChannel.send(
                        `📥 **Création d'un nouveau bouton :**\n` +
                        `> **Nom du bouton :** ${buttonName}\n` +
                        `> **Key :** \`${key}\`\n` +
                        `> **Salon :** #${channelName} (\`${interaction.channel.id}\`)\n` +
                        `> **ID du message :** \`${messageId}\`\n\n` +
                        `------------------------------------------------`
                    );
                }
            } catch (logError) {
                console.error("Impossible d'envoyer le message de log dans le salon :", logError);
            }

            await interaction.editReply({ content: `✅ Succès ! Le bouton **"${buttonName}"** a bien été ajouté.` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Une erreur est survenue." });
        }
    },
};

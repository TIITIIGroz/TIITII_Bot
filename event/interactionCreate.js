const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const supabase = require('../supabase');

// Cherche translations.json à la racine du projet (ajuste si ton fichier est ailleurs)
const filePath = path.join(__dirname, '..', 'translations.json');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // 1. Gestion des clics sur les boutons
        if (interaction.isButton()) {
            const customId = interaction.customId;
            console.log("--> Clic détecté sur un bouton. ID :", customId);

            // A. Boutons de traduction via JSON ou Supabase
            if (customId.startsWith('translate_')) {
                const key = customId.replace('translate_', '');
                console.log("--> Clé recherchée :", key);

                let translations = {};
                try {
                    if (fs.existsSync(filePath)) {
                        const fileContent = fs.readFileSync(filePath, 'utf8');
                        translations = JSON.parse(fileContent);
                    }
                } catch (err) {
                    console.error("❌ Erreur lors de la lecture de translations.json :", err);
                }

                const responseText = translations[key] || "❌ Texte secret introuvable pour cette clé.";

                try {
                    return await interaction.reply({
                        content: responseText,
                        flags: [MessageFlags.Ephemeral]
                    });
                } catch (replyError) {
                    console.error("❌ Erreur lors du reply de l'interaction bouton :", replyError);
                }
            }

            // B. Gestion des autres boutons (ex: Tickets)
            const ticketCommand = interaction.client.commands.get('ticket-setup');
            if (ticketCommand && typeof ticketCommand.handleButton === 'function') {
                try { 
                    await ticketCommand.handleButton(interaction); 
                } catch (err) { 
                    console.error("Erreur gestion bouton ticket :", err); 
                }
            }
            return;
        }

        // 2. Gestion classique des commandes Slash
        if (!interaction.isChatInputCommand()) return;

        const ALLOWED_CHANNEL_ID = '1534722984391082105';
        const BIRTHDAY_CHANNEL_ID = '1011649291124744212';
        const BDAY_COMMANDS = ['anniv-aj', 'anniv-rt'];

        const ADMIN_ROLE_IDS = ['894668340902125618', '1012357140679229511', '894669520902451220'];
        const ADMIN_USER_IDS = ['913798085686198292', '707665614067728464'];

        const memberRoles = interaction.member.roles.cache;
        const hasAdminRole = ADMIN_ROLE_IDS.some(roleId => memberRoles.has(roleId));
        const isSpecialUser = ADMIN_USER_IDS.includes(interaction.user.id);

        const isBdayCmdInBdayChannel = BDAY_COMMANDS.includes(interaction.commandName) && interaction.channelId === BIRTHDAY_CHANNEL_ID;

        if (interaction.channelId !== ALLOWED_CHANNEL_ID && !isBdayCmdInBdayChannel && !hasAdminRole && !isSpecialUser) {
            return interaction.reply({
                content: `Vous n'avez pas les permissions pour utiliser les commandes dans ce salon, veuillez les effectuer dans <#${ALLOWED_CHANNEL_ID}>\n----------------------------------------------\n*You do not have permission to use commands in this channel, please use them in <#${ALLOWED_CHANNEL_ID}>*`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error("❌ Erreur lors de l'exécution d'une commande slash :", error);
            const errorMsg = { 
                content: 'Une erreur est survenue lors de l\'exécution de cette commande !', 
                flags: [MessageFlags.Ephemeral] 
            };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMsg);
            } else {
                await interaction.reply(errorMsg);
            }
        }
    },
};

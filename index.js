const { Client, GatewayIntentBits, Collection, ActivityType, Events, MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");

// 👇 1. SÉCURITÉ POUR ATTRAPER LES ERREURS 👇
process.on('unhandledRejection', error => {
    console.error('❌ Erreur non gérée (Unhandled Rejection) :', error);
});

// Import des systèmes, de Supabase & de la BDD PostgreSQL (pool)
const { handleXpMessage } = require("./systems/levels/xp");
const supabase = require("./supabase"); 
const pool = require("./systems/levels/database"); // Pool PostgreSQL utilisé par ton xp.js
console.log("TEST TOKEN :", process.env.TOKEN ? "Le token est bien lu !" : "ATTENTION : Le token est VIDE !");

http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running!\n");
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // REQUIS POUR DÉTECTER LES ARRIVÉES/DÉPARTS ET RENDRE LES RÔLES
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates 
    ]
});

client.commands = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

// Slash Commands & Boutons interactifs (Depuis Supabase & Tickets)
client.on("interactionCreate", async interaction => {
    if (interaction.isButton()) {
        // 🎫 GESTIONNAIRE DES TICKETS (FR & EN) AVEC LOGS DÉTAILLÉS ET NOUVEAU TEXTE
        if (interaction.customId === 'create_ticket_fr' || interaction.customId === 'create_ticket_en') {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const guild = interaction.guild;
            const member = interaction.member;
            const isFrench = interaction.customId === 'create_ticket_fr';

            const TICKET_CATEGORY_ID = null; 
            const ADMIN_ROLE_ID = "1008853465415553075"; 
            const LOGS_CHANNEL_ID = "1552573413850218587";

            try {
                const channelName = isFrench ? `ticket-fr-${member.user.username}` : `ticket-en-${member.user.username}`;

                // Création du salon avec permissions pour l'utilisateur et le rôle admin
                const channel = await guild.channels.create({
                    name: channelName,
                    type: 0, // GuildText
                    parent: TICKET_CATEGORY_ID,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: ['ViewChannel'],
                        },
                        {
                            id: member.id,
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                        },
                        {
                            id: ADMIN_ROLE_ID,
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                        },
                    ],
                });

                // Message embed avec les textes combinés selon la langue
                const ticketEmbed = new EmbedBuilder()
                    .setColor(isFrench ? '#57F287' : '#FEE75C')
                    .setTitle(isFrench ? `Ticket de ${member.user.username} (FR)` : `Ticket for ${member.user.username} (EN)`)
                    .setDescription(
                        isFrench 
                            ? "Merci d'avoir ouvert un ticket ! Si c'est une fausse manipulation, ferme-le vite ; sinon, décris ton problème en détail et partage tes preuves sans attendre." 
                            : "Thank you for opening a ticket! If this was a mistake, please close it quickly; otherwise, describe your issue in detail and share your proof right away."
                    );

                const closeButtonLabel = isFrench ? 'Fermer le ticket' : 'Close ticket';
                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel(closeButtonLabel)
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔒')
                );

                // Mention automatique de l'utilisateur et du rôle administrateur dans le salon
                await channel.send({
                    content: `<@${member.id}> \vert{} <@&${ADMIN_ROLE_ID}>`,
                    embeds: [ticketEmbed],
                    components: [closeRow]
                });

                // 📊 ENVOI DES INFORMATIONS DÉTAILLÉES DANS LE SALON DE LOGS
                const logsChannel = await guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);
                if (logsChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(isFrench ? '#3498DB' : '#E67E22')
                        .setTitle('🎫 Nouveau ticket ouvert')
                        .addFields(
                            { name: '👤 Utilisateur', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: '🌐 Langue', value: isFrench ? 'Français (FR)' : 'Anglais (EN)', inline: true },
                            { name: '📂 Salon créé', value: `${channel} (\`${channel.name}\`)`, inline: false },
                            { name: '🆔 ID du membre', value: `\`${member.id}\``, inline: true }
                        )
                        .setTimestamp();

                    await logsChannel.send({ embeds: [logEmbed] });
                }

                return await interaction.editReply({
                    content: isFrench 
                        ? `✅ Ton ticket français a été créé : ${channel} !` 
                        : `✅ Your English ticket has been created: ${channel} !`
                });

            } catch (err) {
                console.error("Erreur création ticket :", err);
                return await interaction.editReply({
                    content: isFrench ? "❌ Une erreur est survenue." : "❌ An error occurred."
                });
            }
        }

        // 🔒 FERMETURE DU TICKET
        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Fermeture du ticket... / Closing ticket...' });
            
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (err) {
                    console.error("Erreur suppression salon ticket :", err);
                }
            }, 5000);
            return;
        }

        // Gestion des boutons de traduction stockés dans Supabase
        if (interaction.customId.startsWith('translate_')) {
            const key = interaction.customId.replace('translate_', '');
            let responseText = "❌ Texte secret introuvable.";

            try {
                const { data, error } = await supabase
                    .from('button_translations')
                    .select('response_text')
                    .eq('key', key)
                    .single();

                if (data && data.response_text) {
                    responseText = data.response_text;
                } else if (error) {
                    console.error("Erreur requête Supabase (bouton) :", error.message);
                }
            } catch (err) {
                console.error("Erreur lecture Supabase :", err);
            }

            try {
                return await interaction.reply({
                    content: responseText,
                    flags: [MessageFlags.Ephemeral]
                });
            } catch (err) {
                console.error("Erreur réponse bouton :", err);
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const reply = { content: "Une erreur est survenue.", flags: [MessageFlags.Ephemeral] };
        interaction.replied || interaction.deferred ? await interaction.followUp(reply) : await interaction.reply(reply);
    }
});

// Écouteur de messages pour l'XP
client.on(Events.MessageCreate, async (message) => {
    await handleXpMessage(message, client);
});

// 📌 GESTION DU DÉPART D'UN MEMBRE : Sauvegarde prison & Reset total de ses données
client.on(Events.GuildMemberRemove, async (member) => {
    const PRISON_ROLES = ["1549495761761214484", "913882559363043388"];
    
    // 1. Sauvegarde des rôles prison s'il les avait (dans Supabase)
    const hasPrisonRole = member.roles.cache.some(role => PRISON_ROLES.includes(role.id));
    
    if (hasPrisonRole) {
        const heldPrisonRoles = member.roles.cache.filter(role => PRISON_ROLES.includes(role.id)).map(r => r.id);
        
        await supabase
            .from('prison_escapes')
            .upsert({ user_id: member.id, prison_roles: heldPrisonRoles }, { onConflict: 'user_id' })
            .catch(err => console.error("Erreur sauvegarde prison Supabase :", err));
    }

    // 2. NETTOYAGE COMPLET DE SES DONNÉES D'XP (Base PostgreSQL de xp.js)
    try {
        await pool.query(`DELETE FROM users WHERE userid = $1 AND guildid = $2`, [member.id, member.guild.id]);
        console.log(`🧹 Reset complet BDD PostgreSQL effectué pour le départ de ${member.user.tag}`);
    } catch (err) {
        console.error("Erreur lors du nettoyage de la BDD au départ :", err);
    }
});

// 📌 GESTION DE L'ARRIVÉE D'UN MEMBRE : Restauration des rôles prison uniquement
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const { data } = await supabase
            .from('prison_escapes')
            .select('prison_roles')
            .eq('user_id', member.id)
            .single();

        if (data && data.prison_roles && data.prison_roles.length > 0) {
            await member.roles.add(data.prison_roles).catch(err => console.error("Erreur attribution rôles prison :", err));
            await supabase.from('prison_escapes').delete().eq('user_id', member.id);
            console.log(`🔒 Rôles prison restitués pour ${member.user.tag}`);
        }
    } catch (err) {
        // S'il n'était pas en prison, il arrive totalement vierge de 0
    }
});

// Bot prêt
client.once(Events.ClientReady, async () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
    
    console.log(`📋 Commandes enregistrées en mémoire : ${client.commands.size}`);
    client.commands.forEach((cmd, name) => {
        console.log(` - /${name}`);
    });

    client.user.setPresence({
        activities: [{ name: "TIITII_Groz sur/on Twitch", type: ActivityType.Streaming, url: "https://www.twitch.tv/TIITII_Groz" }],
        status: "online",
    });

    const ONLINE_CHANNEL_ID = "1547854332333006899";
    try {
        const channel = await client.channels.fetch(ONLINE_CHANNEL_ID).catch(() => null);
        if (channel) {
            const timestamp = Math.floor(Date.now() / 1000);
            await channel.send(`Je suis en ligne depuis <t:${timestamp}:T> !`);
        }
    } catch (err) {
        console.error("Erreur lors de l'envoi du message 'Je suis en ligne' :", err);
    }

    // 🎂 SYSTÈME AUTOMATIQUE DES ANNIVERSAIRES (Vérification chaque jour à minuit)
    setInterval(async () => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const todayFormatted = `${day}/${month}`;

            const yesterdayDate = new Date(now);
            yesterdayDate.setDate(now.getDate() - 1);
            const yDay = String(yesterdayDate.getDate()).padStart(2, '0');
            const yMonth = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
            const yesterdayFormatted = `${yDay}/${yMonth}`;

            const BIRTHDAY_ROLE_ID = "1011652804269580389";
            const BIRTHDAY_CHANNEL_ID = "1011649291124744212"; 
            const PING_ROLE_ID = "864898646343811077";

            try {
                // 1. RETIRER LE RÔLE DE CEUX DONT C'ÉTAIT L'ANNIVERSAIRE HIER
                const { data: oldBirthdays } = await supabase
                    .from('birthdays')
                    .select('*')
                    .like('birth_date', `${yesterdayFormatted}%`);

                if (oldBirthdays && oldBirthdays.length > 0) {
                    for (const b of oldBirthdays) {
                        const guild = client.guilds.cache.get(b.guild_id);
                        if (!guild) continue;
                        const member = await guild.members.fetch(b.user_id).catch(() => null);
                        if (member && member.roles.cache.has(BIRTHDAY_ROLE_ID)) {
                            await member.roles.remove(BIRTHDAY_ROLE_ID).catch(err => console.error("Erreur retrait rôle anniv :", err));
                        }
                    }
                }

                // 2. AJOUTER LE RÔLE ET ENVOYER LE MESSAGE POUR CEUX DONT C'EST L'ANNIVERSAIRE AUJOURD'HUI
                const { data: birthdays, error } = await supabase
                    .from('birthdays')
                    .select('*')
                    .like('birth_date', `${todayFormatted}%`);

                if (error) throw error;
                if (!birthdays || birthdays.length === 0) return;

                for (const b of birthdays) {
                    const guild = client.guilds.cache.get(b.guild_id);
                    if (!guild) continue;
                    
                    const member = await guild.members.fetch(b.user_id).catch(() => null);
                    if (member) {
                        await member.roles.add(BIRTHDAY_ROLE_ID).catch(err => console.error("Erreur ajout rôle anniv :", err));
                    }

                    const channel = guild.channels.cache.get(BIRTHDAY_CHANNEL_ID);
                    if (!channel) continue;

                    const bdayEmbed = new EmbedBuilder()
                        .setColor('#FF69B4')
                        .setTitle('🎉 Joyeux Anniversaire ! 🎂')
                        .setDescription(`Tout le monde souhaite un excellent anniversaire à <@${b.user_id}> ! Passe une merveilleuse journée ! 🎈`)
                        .setTimestamp();

                    await channel.send({
                        content: `<@&${PING_ROLE_ID}>`,
                        embeds: [bdayEmbed]
                    });
                }
            } catch (err) {
                console.error("❌ Erreur lors de la gestion automatique des anniversaires :", err);
            }
        }
    }, 60000);
});

// Gestion des rôles automatiques (Accès)
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const ACCESS_ROLE = "1509584318203433001";
    const TRIGGER_ROLES = ["1269778023826067699", "1533558027825840218"];
    const hasTriggerRole = TRIGGER_ROLES.some(roleId => newMember.roles.cache.has(roleId));
    const hasAccessRole = newMember.roles.cache.has(ACCESS_ROLE);

    try {
        if (hasTriggerRole && !hasAccessRole) await newMember.roles.add(ACCESS_ROLE);
        if (!hasTriggerRole && hasAccessRole) await newMember.roles.remove(ACCESS_ROLE);
    } catch (err) { console.error("Erreur gestion rôle d'accès :", err); }
});

// Gestion des Boosts Serveur
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const BOOST_ROLE_ID = "1547695661435195424";
    const LOG_CHANNEL_ID = "1534224381109076172";

    const wasBoosting = oldMember.premiumSinceTimestamp !== null;
    const isBoosting = newMember.premiumSinceTimestamp !== null;

    try {
        if (!wasBoosting && isBoosting) {
            if (!newMember.roles.cache.has(BOOST_ROLE_ID)) {
                await newMember.roles.add(BOOST_ROLE_ID);
            }
            const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (channel) {
                await channel.send(`Le propriétaire et le staff te remerci beaucoup ${newMember} pour le boost du serveur ! Le rôle de soutien t'a été attribué.`);
            }
        }

        if (wasBoosting && !isBoosting) {
            if (newMember.roles.cache.has(BOOST_ROLE_ID)) {
                await newMember.roles.remove(BOOST_ROLE_ID);
            }
        }
    } catch (err) { 
        console.error("Erreur gestion boost :", err); 
    }
});

// Gestion du Tag utilisateur
client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const TAG_ROLE_ID = "1547699213700309072";
    const TARGET_TAG = "GROZ"; 

    const oldName = oldMember.nickname || oldMember.user.username;
    const newName = newMember.nickname || newMember.user.username;

    const hadTag = oldName.includes(TARGET_TAG);
    const hasTag = newName.includes(TARGET_TAG);

    try {
        if (!hadTag && hasTag) {
            if (!newMember.roles.cache.has(TAG_ROLE_ID)) {
                await newMember.roles.add(TAG_ROLE_ID);
            }
        }

        if (hadTag && !hasTag) {
            if (newMember.roles.cache.has(TAG_ROLE_ID)) {
                await newMember.roles.remove(TAG_ROLE_ID);
            }
        }
    } catch (err) { 
        console.error("Erreur gestion tag :", err); 
    }
});

// 👇 CHARGEMENT DE TES AUTOMATISMES ET SYSTÈMES 👇
require('./Automatisme/ConfigReminder')(client);
require('./Automatisme/WelcomeSystem')(client);
require('./Automatisme/Gbye.js')(client);
require('./systems/levels/voiceXp')(client);

// 👇 3. CONNEXION DISCORD 👇
console.log("Tentative de connexion à Discord...");

client.login(process.env.TOKEN).catch(err => {
    console.error("❌ ERREUR FATALE DE CONNEXION DISCORD :", err);
});

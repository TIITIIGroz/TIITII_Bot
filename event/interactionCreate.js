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

            // On vérifie si l'interaction a déjà été répondue ou différée pour utiliser la bonne méthode
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(errorMsg);
                } else {
                    await interaction.reply(errorMsg);
                }
            } catch (err) {
                console.error("Impossible d'envoyer le message d'erreur :", err);
            }
        }

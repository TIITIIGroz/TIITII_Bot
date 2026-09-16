// ... (garde le début de ton code)
            // Supprimer le message et le composant sur Discord...
            await message.edit({
                components: newRows.length > 0 ? newRows : []
            });

            // Suppression de la ligne correspondante dans Supabase
            const { error: dbError } = await interaction.client.supabase
                .from('button_translations')
                .delete()
                .eq('key', keyToRemove);

            if (dbError) {
                console.error("Erreur suppression Supabase :", dbError);
            }

            await interaction.editReply({ content: `✅ Succès ! Le bouton associé à la clé **"${keyToRemove}"** a été supprimé.` });
        } catch (error) {
            console.error("Erreur lors de la suppression du bouton :", error);
            await interaction.editReply({ content: "❌ Une erreur est survenue." });
        }
    },
};

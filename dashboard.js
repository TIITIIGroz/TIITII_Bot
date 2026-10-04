const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Si tu utilises Supabase dans ton projet, importe ton client ici :
// const supabase = require('./path-to-your-supabase-client');

app.use(express.urlencoded({ extended: true }));

// Page d'accueil simple du dashboard
app.get('/', async (req, res) => {
    // Exemple : tu pourras récupérer des stats depuis Supabase
    // const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });

    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>TIITII_Bot - Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding-top: 50px; }
                .card { background: #1e293b; display: inline-block; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                h1 { color: #57F287; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🤖 TIITII_Bot Dashboard</h1>
                <p>Statut : <strong style="color: #57F287;">En ligne 🟢</strong></p>
                <p>Bienvenue sur le panneau d'administration de ton serveur.</p>
            </div>
        </body>
        </html>
    `);
});

// Fonction pour démarrer le serveur web en même temps que ton bot
function startDashboard() {
    app.listen(PORT, () => {
        console.log(`🌐 Dashboard web actif sur le port ${PORT}`);
    });
}

module.exports = { startDashboard };

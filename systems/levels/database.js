const { Pool } = require('pg');

// Connexion à Supabase (PostgreSQL) via l'URL dans .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test de connexion et création de la table users
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Erreur de connexion à la base de données Supabase :', err.stack);
    }
    console.log('✅ Connecté à la base de données Supabase (PostgreSQL)');
    release();
});

// Création de la table users si elle n'existe pas
const initDb = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT,
            guildId TEXT,
            xp INTEGER DEFAULT 0,
            totalXp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            messages INTEGER DEFAULT 0,
            lastMessage BIGINT DEFAULT 0,
            createdAt BIGINT,
            PRIMARY KEY (userId, guildId)
        );
    `;
    try {
        await pool.query(query);
        console.log('📊 Table des niveaux Supabase prête.');
    } catch (err) {
        console.error('❌ Erreur lors de la création de la table users :', err.message);
    }
};

initDb();

module.exports = pool;

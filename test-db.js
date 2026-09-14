const { Pool } = require('pg');

// Utilise la même configuration que ton fichier database.js habituel
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testDatabase() {
    console.log("🔍 Test de connexion à Supabase en cours...");
    try {
        const res = await pool.query('SELECT NOW()');
        console.log("✅ TOUT EST PARFAIT : Connexion à Supabase réussie ! Heure serveur :", res.rows[0].now);
    } catch (err) {
        console.error("❌ PROBLÈME DÉTECTÉ DANS LA BASE DE DONNÉES :");
        console.error(err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

testDatabase();

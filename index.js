const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Configuration du moteur de template et des fichiers statiques (pour le dossier public/images)
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); 
// Si ton dossier d'images est dans public/images/Bannière.jpg, express.static('public') le rend accessible via /images/Bannière.jpg

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration de la session
app.use(session({
    secret: 'mon_secret_super_securise', // Remplace par une chaîne secrète de ton choix
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Mettre à true si tu forces le HTTPS strictement, false fonctionne avec le proxy Render
        maxAge: 24 * 60 * 60 * 1000 // La session expire au bout de 24 heures
    }
}));

// Import de tes routes de dashboard et d'auth
const authRoutes = require('./dashboard/routes/auth');
// const dashboardRoutes = require('./dashboard/routes/dashboard'); // Décommente selon ton arborescence

app.use('/auth', authRoutes);

// Route d'accueil
app.get('/', (req, res) => {
    // Si l'utilisateur est déjà connecté, on le redirige directement vers le dashboard au lieu de l'embêter
    if (req.session && req.session.isAdmin) {
        return res.redirect('/dashboard');
    }
    res.render('index', { error: req.query.error });
});

// Route du Dashboard protégée
app.get('/dashboard', (req, res) => {
    if (!req.session || !req.session.isAdmin) {
        return res.redirect('/?error=bad_token');
    }
    // Rendu de ta page dashboard (ex: dashboard.ejs)
    res.render('dashboard', { user: req.session.user });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🌐 Dashboard web sécurisé actif sur le port ${PORT}`);
});

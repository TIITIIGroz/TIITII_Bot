const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Configuration du moteur de template EJS et du dossier des vues
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Dossier contenant tes fichiers .ejs

// Dossier public pour les fichiers statiques (CSS, images...)
app.use(express.static(path.join(__dirname, 'public'))); 

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration de la session pour ne pas perdre la connexion au rafraîchissement
app.use(session({
    secret: 'mon_secret_super_securise',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Import des routes d'authentification
const authRoutes = require('./dashboard/routes/auth');
app.use('/auth', authRoutes);

// Route d'accueil
app.get('/', (req, res) => {
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
    res.render('dashboard', { user: req.session.user });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🌐 Dashboard web sécurisé actif sur le port ${PORT}`);
});

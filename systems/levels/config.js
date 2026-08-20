module.exports = {
    // Gain d'XP par message valide (aléatoire entre les deux valeurs)
    XP_MIN: 15,
    XP_MAX: 25,

    // Cooldown en millisecondes entre chaque gain d'XP (10 secondes)
    COOLDOWN: 10 * 1000,

    // Nombre minimum de caractères requis pour qu'un message donne de l'XP
    MIN_CHARACTERS: 3,

    // ID du salon où envoyer les messages de level up (null pour envoyer dans le salon actuel)
    LEVELUP_CHANNEL_ID: 1011649291124744212,

    // Liste des IDs de salons exclus du système d'XP
    EXCLUDED_CHANNELS: [
        //Catégorie Informations (il y a pas Giveaway)
        "894680444698779708", // Annonces (fr)
        "1534205869909082172", // Annoncements (en)
        "894671498965561394", // Bienvenue
        "864920115270909972", // Règles
        "1094755406829584385", // Rules
        "896545873570455553", // Role IRL
        "897619009556602971", // Présentation
        "1011571833704808509", // Partenariats
        "1011657738994065468", // Anniv
        "1011570558607048785", // Sondages
        "1036503057300729906", // Boosters

        //Catégorie Staff
        "1534249654701785168", // Test
        "987031560945553418", // Test-Bot
        "1491749498094092388", // Choses à faire
        "1533214591201312909", // Choses à faire + tard
        "998668844048580609", // Staff écrit
 
        //Catégorie TIITII_Bot
        "1533889676513906838", // TIITII_Bot
        "1534224381109076172", // Bot choses à faire
        "1534599616681607388", // Infos Modifications

        //Catégorie notifications
        "1538731113277689976", // Réseaux Links
        "1028734068797481021", // Planning

        //Catégorie Général
        
        
        //Catégorie Vocaux
        
        
        //Catégorie Support
        "1263628374388113560", // Guides
        "896311964861620266", // Guides Roles
        
        //Catégorie Création
        "1085589773877518506", // Créer Salons 
        "1081306764101820477", // Créer Textes
        "1113386813034348544", // Créer Serveur
        
        //Catégorie économie
        "1421659004756693043" // explication
    ],

    EXCLUDED_ROLES: [
        "913882559363043388" // Remplace par l'ID réel du rôle
    ],

    // Rôles de récompense selon les niveaux
    LEVEL_ROLES: {
        1: "1433050986292973690",
        5: "1433052521970274355",
        10: "1433057719014785095",
        20: "1433059034738589837",
        30: "1433059037796372532",
        40: "1433059040212025385",
        50: "1433059043219607604",
        60: "1433059044817375242",
        70: "1433059046499553320",
        80: "1433059047728353300",
        90: "1433060140818628659",
        100: "1433060142785630228",
        150: "1433060901636018256",
        200: "1433060917343551488",
        250: "1433060918438268962",
        300: "1433061716719042621",
        350: "1433061795869757593",
        400: "1433061796683714640",
        450: "1433061797727965306",
        500: "1433061798780600453"
    }
};

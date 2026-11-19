const { Events } = require('discord.js');

module.exports = (client) => {
    // ⚠️ Remplace les textes "ID_..." par les vrais IDs des rôles que tu viens de créer sur Discord
    const SENIORITY_ROLES = [
        { minMonths: 180, id: "1571880924361007174" },      // 15 ans (15 * 12 = 180 mois)
        { minMonths: 168, id: "1571880871865094234" },      // 14 ans
        { minMonths: 156, id: "1571880830995800096" },      // 13 ans
        { minMonths: 144, id: "1571880779808641054" },      // 12 ans
        { minMonths: 132, id: "1571880693934329896" },      // 11 ans
        { minMonths: 120, id: "1571880469379678378" },      // 10 ans
        { minMonths: 108, id: "1571880392011677716" },       // 9 ans
        { minMonths: 96,  id: "1571880330858725478" },       // 8 ans
        { minMonths: 84,  id: "1571880275615420416" },       // 7 ans
        { minMonths: 72,  id: "1571879138908835912" },       // 6 ans
        { minMonths: 60,  id: "1571879050199302265" },       // 5 ans
        { minMonths: 48,  id: "1571879002140971008" },       // 4 ans
        { minMonths: 36,  id: "1571878954116059219" },       // 3 ans
        { minMonths: 24,  id: "1571878885472342088" },       // 2 ans
        { minMonths: 12,  id: "1571878712046133469" },        // 1 an (12 mois et +)
        { minMonths: 5,   id: "1571878668370714684" },  // - 1 an (entre 5 et 11 mois)
        { minMonths: 0,   id: "1571878584845475921" } // - de 5 mois (0 à 4 mois)
    ];

    const allRoleIds = SENIORITY_ROLES.map(r => r.id);

    // Fonction qui calcule l'ancienneté et met à jour le rôle d'un membre
    async function updateMemberSeniority(member) {
        if (member.user.bot || !member.joinedTimestamp) return;

        // Calcul précis du nombre de mois écoulés depuis l'arrivée sur le serveur
        const now = new Date();
        const joined = new Date(member.joinedTimestamp);
        let months = (now.getFullYear() - joined.getFullYear()) * 12;
        months -= joined.getMonth();
        months += now.getMonth();
        if (now.getDate() < joined.getDate()) {
            months--;
        }
        months = Math.max(0, months);

        // Trouver le rôle correspondant au palier atteint (la liste est triée du plus grand au plus petit)
        const targetRoleObj = SENIORITY_ROLES.find(r => months >= r.minMonths);
        if (!targetRoleObj || targetRoleObj.id.startsWith("ID_")) return;

        const targetRoleId = targetRoleObj.id;

        try {
            // Vérifier si le membre a d'anciens rôles d'ancienneté à retirer
            const rolesToRemove = member.roles.cache.filter(
                r => allRoleIds.includes(r.id) && r.id !== targetRoleId
            );

            if (rolesToRemove.size > 0) {
                await member.roles.remove(rolesToRemove).catch(() => {});
            }

            // Ajouter le bon rôle s'il ne l'a pas encore
            if (!member.roles.cache.has(targetRoleId)) {
                await member.roles.add(targetRoleId).catch(() => {});
            }
        } catch (err) {
            console.error(`❌ Erreur mise à jour ancienneté pour ${member.user.tag} :`, err);
        }
    }

    // Fonction pour scanner tout le serveur
    async function checkAllMembers() {
        console.log("⏳ Vérification des rôles d'ancienneté en cours...");
        for (const [, guild] of client.guilds.cache) {
            try {
                const members = await guild.members.fetch();
                for (const [, member] of members) {
                    await updateMemberSeniority(member);
                }
            } catch (err) {
                console.error("❌ Erreur lors du scan d'ancienneté :", err);
            }
        }
        console.log("✅ Rôles d'ancienneté mis à jour !");
    }

    // 1. Attribution immédiate dès qu'un membre rejoint le serveur
    client.on(Events.GuildMemberAdd, async (member) => {
        await updateMemberSeniority(member);
    });

    // 2. Vérification au démarrage du bot + boucle automatique toutes les 6 heures
    client.once(Events.ClientReady, () => {
        setTimeout(() => {
            checkAllMembers();
        }, 10000); // Attendre 10s après le démarrage pour éviter de surcharger l'API Discord

        // Vérifier toutes les 6 heures (6 * 60 * 60 * 1000 ms)
        setInterval(checkAllMembers, 21600000);
    });
};

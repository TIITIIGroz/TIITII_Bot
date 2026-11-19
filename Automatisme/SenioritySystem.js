const { Events } = require('discord.js');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = (client) => {
    // Rôle de catégorie / séparateur attribué à tout le monde lors de l'actualisation
    const CATEGORY_ROLE_ID = "1571883008640680079";

    const SENIORITY_ROLES = [
        { minMonths: 180, id: "1571880924361007174" }, // 15 ans (15 * 12 = 180 mois)
        { minMonths: 168, id: "1571880871865094234" }, // 14 ans
        { minMonths: 156, id: "1571880830995800096" }, // 13 ans
        { minMonths: 144, id: "1571880779808641054" }, // 12 ans
        { minMonths: 132, id: "1571880693934329896" }, // 11 ans
        { minMonths: 120, id: "1571880469379678378" }, // 10 ans
        { minMonths: 108, id: "1571880392011677716" }, // 9 ans
        { minMonths: 96,  id: "1571880330858725478" }, // 8 ans
        { minMonths: 84,  id: "1571880275615420416" }, // 7 ans
        { minMonths: 72,  id: "1571879138908835912" }, // 6 ans
        { minMonths: 60,  id: "1571879050199302265" }, // 5 ans
        { minMonths: 48,  id: "1571879002140971008" }, // 4 ans
        { minMonths: 36,  id: "1571878954116059219" }, // 3 ans
        { minMonths: 24,  id: "1571878885472342088" }, // 2 ans
        { minMonths: 12,  id: "1571878712046133469" }, // 1 an (12 mois et +)
        { minMonths: 5,   id: "1571878668370714684" }, // - 1 an (entre 5 et 11 mois)
        { minMonths: 0,   id: "1571878584845475921" }  // - de 5 mois (0 à 4 mois)
    ];

    const allRoleIds = SENIORITY_ROLES.map(r => r.id);
    let isScanning = false;

    // Fonction qui calcule l'ancienneté et met à jour les rôles d'un membre
    async function updateMemberSeniority(member) {
        if (!member || member.user.bot || !member.joinedTimestamp) return;

        // 1. Attribution du rôle de catégorie à tout le monde
        try {
            if (CATEGORY_ROLE_ID && !member.roles.cache.has(CATEGORY_ROLE_ID)) {
                await member.roles.add(CATEGORY_ROLE_ID).catch(() => {});
                await wait(350);
            }
        } catch (err) {
            console.error(`❌ Erreur ajout rôle catégorie pour ${member.user.tag} :`, err);
        }

        // 2. Calcul précis du nombre de mois écoulés depuis l'arrivée sur le serveur
        const now = new Date();
        const joined = new Date(member.joinedTimestamp);
        let months = (now.getFullYear() - joined.getFullYear()) * 12;
        months -= joined.getMonth();
        months += now.getMonth();
        if (now.getDate() < joined.getDate()) {
            months--;
        }
        months = Math.max(0, months);

        // Trouver le rôle d'ancienneté correspondant au palier atteint
        const targetRoleObj = SENIORITY_ROLES.find(r => months >= r.minMonths);
        if (!targetRoleObj) return;

        const targetRoleId = targetRoleObj.id;

        try {
            // Retirer les anciens rôles d'ancienneté qui ne correspondent plus
            const rolesToRemove = member.roles.cache.filter(
                r => allRoleIds.includes(r.id) && r.id !== targetRoleId
            );

            if (rolesToRemove.size > 0) {
                await member.roles.remove(rolesToRemove).catch(() => {});
                await wait(350);
            }

            // Ajouter le bon rôle d'ancienneté s'il ne l'a pas encore
            if (!member.roles.cache.has(targetRoleId)) {
                await member.roles.add(targetRoleId).catch(() => {});
                await wait(350);
            }
        } catch (err) {
            console.error(`❌ Erreur mise à jour ancienneté pour ${member.user.tag} :`, err);
        }
    }

    // Fonction pour scanner les serveurs en évitant le rate-limit Opcode 8
    async function checkAllMembers() {
        if (isScanning) return;
        isScanning = true;

        console.log("⏳ Vérification des rôles d'ancienneté et du rôle de catégorie en cours...");
        let hadError = false;

        try {
            for (const [, guild] of client.guilds.cache) {
                try {
                    let membersCollection = guild.members.cache;

                    if (membersCollection.size <= 1 && guild.memberCount > 1) {
                        membersCollection = await guild.members.fetch({ time: 15000 });
                    }

                    for (const [, member] of membersCollection) {
                        await updateMemberSeniority(member);
                    }
                } catch (err) {
                    hadError = true;
                    if (err?.code === 'GatewayRateLimitError' || err?.name === 'GatewayRateLimitError') {
                        console.warn(`⚠️ Rate-limit Gateway sur le serveur ${guild.id}, nouvelle tentative au prochain cycle.`);
                    } else {
                        console.error(`❌ Erreur lors du scan d'ancienneté (${guild.id}) :`, err);
                    }
                }

                await wait(2000);
            }

            if (!hadError) {
                console.log("✅ Rôles d'ancienneté et rôle de catégorie mis à jour !");
            }
        } finally {
            isScanning = false;
        }
    }

    // 1. Attribution immédiate dès qu'un membre rejoint le serveur
    client.on(Events.GuildMemberAdd, async (member) => {
        await updateMemberSeniority(member);
    });

    // 2. Vérification différée au démarrage + boucle automatique toutes les 6 heures
    client.once(Events.ClientReady, () => {
        setTimeout(() => {
            checkAllMembers();
        }, 25000);

        setInterval(checkAllMembers, 21600000);
    });
};

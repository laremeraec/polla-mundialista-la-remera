const admin = require('firebase-admin');
require('dotenv').config();

// Inicializar Firebase con credenciales del Secret de GitHub
const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccountKey) });
}
const db = admin.firestore();

// ============================================================
// RESULTADOS CORRECTOS — Repechajes 31 Marzo 2026
// Actualiza este objeto antes de correr si los partidos cambian
// ============================================================
const correctResults = {
    "p1": { s1: "1", s2: "1", status: "PEN",  minute: null }, // Bosnia 1-1 Italia (AET) → Bosnia ganó 4-1 en penales
    "p2": { s1: "3", s2: "2", status: "FT",   minute: null }, // Suecia 3-2 Polonia
    "p3": { s1: "0", s2: "1", status: "FT",   minute: null }, // Kosovo 0-1 Türkiye
    "p4": { s1: "2", s2: "2", status: "PEN",  minute: null }, // Chequia 2-2 Dinamarca (AET) → Chequia ganó 3-1 en penales
    "p5": { s1: "1", s2: "0", status: "FT",   minute: null }, // RD Congo 1-0 Jamaica
    "p6": { s1: "1", s2: "1", status: "2H",   minute: "43"}, // Irak 1-1 Bolivia (En vivo min 43 al momento de sembrar)
};

async function seed() {
    console.log("🌱 Sembrando resultados correctos en Firebase...");
    try {
        await db.collection('admin_playoff').doc('resultados').set({
            partidos: correctResults,
            ultima_sincronizacion: new Date().toISOString()
        });
        console.log("✅ Resultados actualizados correctamente:");
        Object.entries(correctResults).forEach(([id, r]) => {
            console.log(`  [${id}] ${r.s1}-${r.s2}  (${r.status}${r.minute ? ' min ' + r.minute : ''})`);
        });
    } catch (e) {
        console.error("❌ Error al sembrar:", e.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seed();

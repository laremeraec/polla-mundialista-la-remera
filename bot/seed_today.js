const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccountKey) });
}
const db = admin.firestore();

const correctResults = {
    "p1": { s1: "1", s2: "1", status: "PEN",  minute: null },
    "p2": { s1: "3", s2: "2", status: "FT",   minute: null },
    "p3": { s1: "0", s2: "1", status: "FT",   minute: null },
    "p4": { s1: "2", s2: "2", status: "PEN",  minute: null },
    "p5": { s1: "1", s2: "0", status: "FT",   minute: null },
    "p6": { s1: "1", s2: "1", status: "FT",   minute: null },
};

async function seed() {
    console.log("🌱 Sembrando resultados correctos en Firebase...");
    try {
        await db.collection('admin_playoff').doc('resultados').set({
            partidos: correctResults,
            ultima_sincronizacion: new Date().toISOString()
        });
        console.log("✅ Resultados actualizados correctamente.");
    } catch (e) {
        console.error("❌ Error al sembrar:", e.message);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

seed();

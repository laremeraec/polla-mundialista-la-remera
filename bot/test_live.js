const admin = require('firebase-admin');
require('dotenv').config({ path: '/Users/carlosarends/.gemini/antigravity/scratch/polla-mundialista/bot/.env' });

// Use absolute path to the service account key which is downloaded somewhere?
// The user has it at: /Users/carlosarends/Downloads/polla-mundialista-la-rem-bacb9-firebase-adminsdk-fbsvc-971835b89d.json
const serviceAccountKey = require('/Users/carlosarends/Downloads/polla-mundialista-la-rem-bacb9-firebase-adminsdk-fbsvc-971835b89d.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
    });
}
const db = admin.firestore();

async function mockLiveMatch() {
    console.log("⚽ Inyectando marcador de prueba en vivo a Firebase...");
    let newScores = {
        "p1": { s1: "2", s2: "1", status: "1H", minute: 35 } // Bosnia vs Italia (1er Tiempo, min 35)
    };

    try {
        await db.collection('admin_playoff').doc('resultados').set({
            partidos: newScores,
            ultima_sincronizacion: new Date().toISOString()
        }, { merge: true });
        console.log("✅ ¡Marcador en vivo disparado mágicamente a todas las pantallas!");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

mockLiveMatch();

const axios = require('axios');
const admin = require('firebase-admin');

// 1. Configurar Entorno Seguro
require('dotenv').config();

// 2. Inicializar SDK de Servidor de Firebase usando la llave secreta desde los Secrets de GitHub
const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        databaseURL: "https://" + serviceAccountKey.project_id + "-default-rtdb.firebaseio.com"
    });
}
const db = admin.firestore();

// 3. Diccionario de Partidos Playoffs
// Este diccionario nos permite mapear los equipos de la API al formato de tu app (p1, p2, p3)
const matchesMap = {
    // Ejemplo: usaremos parte del nombre en ingles o español para matchear con seguridad
    "p1": { t1: ["bosnia"], t2: ["italy", "italia"] },
    "p2": { t1: ["sweden", "suecia"], t2: ["poland", "polonia"] },
    "p3": { t1: ["kosovo"], t2: ["turkey", "türkiye"] },
    "p4": { t1: ["czech", "chequia"], t2: ["denmark", "dinamarca"] },
    "p5": { t1: ["congo", "dr congo"], t2: ["jamaica"] },
    "p6": { t1: ["iraq", "irak"], t2: ["bolivia"] }
};

async function syncResults() {
    console.log("⚽ Iniciando el Bot Sincronizador de la Polla...");

    try {
        // Usamos fecha en hora Ecuador (UTC-5) para no perder partidos nocturnos
        const ecuDate = new Date(Date.now() - 5 * 60 * 60 * 1000);
        const dateStr = ecuDate.toISOString().split('T')[0];
        console.log("Buscando partidos del día (hora ECU):", dateStr);

        // Llamamos a API-Football (o un proveedor similar) usando el KEY seguro
        const response = await axios({
            method: 'GET',
            url: `https://v3.football.api-sports.io/fixtures?date=${dateStr}`,
            headers: {
                'x-apisports-key': process.env.API_SPORTS_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const fixtures = response.data.response;
        if (!fixtures || fixtures.length === 0) {
            console.log("No se encontraron partidos para hoy.");
            return;
        }

        // Matriz donde guardaremos lo que encontraremos para subirlo
        let newScores = {};

        fixtures.forEach(match => {
            const homeName = match.teams.home.name.toLowerCase();
            const awayName = match.teams.away.name.toLowerCase();

            // Buscar si este partido coincide con alguno de nuestros 6 partidos oficiales
            for (const [id, teams] of Object.entries(matchesMap)) {
                // Chequear si los equipos coinciden con los arrays de posibles nombres (Local y Visitante)
                const isMatch = (teams.t1.some(name => homeName.includes(name)) && teams.t2.some(name => awayName.includes(name))) || 
                                (teams.t2.some(name => homeName.includes(name)) && teams.t1.some(name => awayName.includes(name)));

                if (isMatch) {
                    // Determinar qué score corresponde a Team 1 y Team 2
                    let s1 = teams.t1.some(name => homeName.includes(name)) ? match.goals.home : match.goals.away;
                    let s2 = teams.t2.some(name => homeName.includes(name)) ? match.goals.home : match.goals.away;

                    // Si null significa que va 0-0 por ahora, o no empezó. 
                    if (s1 === null) s1 = 0;
                    if (s2 === null) s2 = 0;

                    // Si el partido está iniciado o finalizado, guardamos el resultado
                    if (["1H", "2H", "HT", "ET", "P", "FT", "AET", "PEN"].includes(match.fixture.status.short)) {
                        newScores[id] = { 
                            s1: s1.toString(), 
                            s2: s2.toString(),
                            status: match.fixture.status.short,
                            minute: match.fixture.status.elapsed || null
                        };
                        console.log(`Actualizando [${id}]: ${homeName} ${match.goals.home} - ${match.goals.away} ${awayName} (${match.fixture.status.short} ${match.fixture.status.elapsed || ''}')`);
                    }
                }
            }
        });

        if (Object.keys(newScores).length > 0) {
            console.log("Subiendo actualización a Firebase...");
            // Si hay novedades, re-escribimos toda la bóveda del admin para que el onSnapshot dispare cambios a todos.
            await db.collection('admin_playoff').doc('resultados').set({
                partidos: newScores,
                ultima_sincronizacion: new Date().toISOString()
            }, { merge: true });
            console.log("✅ ¡Actualización en tu plataforma completada y enviada en vivo a los usuarios!");
        } else {
            console.log("Ninguno de los partidos ha movido el marcador o no han empezado.");
        }

    } catch (error) {
        console.error("❌ Error grave en la sincronización:", error.message);
        process.exit(1);
    }
}

syncResults();

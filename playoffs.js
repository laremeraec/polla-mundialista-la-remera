import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5xuj_6jJi6obCE48RALyunrUwML_BwHI",
  authDomain: "polla-mundialista-la-rem-bacb9.firebaseapp.com",
  projectId: "polla-mundialista-la-rem-bacb9",
  storageBucket: "polla-mundialista-la-rem-bacb9.firebasestorage.app",
  messagingSenderId: "186398392200",
  appId: "1:186398392200:web:876f9abdde8f207920443d",
  measurementId: "G-MTW2HKMNXR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HERRAMIENTA DE ADMINISTRADOR (Pruebas)
window.simularPartidoEnVivo = async function(matchId, s1, s2, status, minute) {
    console.log(`🤖 Forzando resultado en Firebase: ${matchId} [${s1}-${s2}]`);
    await setDoc(doc(db, "admin_playoff", "resultados"), {
        partidos: { [matchId]: { s1: s1.toString(), s2: s2.toString(), status: status, minute: minute } },
        ultima_sincronizacion: new Date().toISOString()
    }, { merge: true });
    console.log("✅ Simulación completada. Revisa la UI.");
};

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');

    // Configuración interactiva del selector de equipos
    const selectLocalTeam = document.getElementById('localTeam');
    const inputOtherLocalTeam = document.getElementById('otherLocalTeam');
    if(selectLocalTeam && inputOtherLocalTeam) {
        selectLocalTeam.addEventListener('change', (e) => {
            if(e.target.value === "Otros") {
                inputOtherLocalTeam.style.display = "block";
                inputOtherLocalTeam.required = true;
            } else {
                inputOtherLocalTeam.style.display = "none";
                inputOtherLocalTeam.required = false;
                inputOtherLocalTeam.value = "";
            }
        });
    }

    const selectIntTeam = document.getElementById('internationalTeam');
    const inputOtherIntTeam = document.getElementById('otherInternationalTeam');
    if(selectIntTeam && inputOtherIntTeam) {
        selectIntTeam.addEventListener('change', (e) => {
            if(e.target.value === "Otros") {
                inputOtherIntTeam.style.display = "block";
                inputOtherIntTeam.required = true;
            } else {
                inputOtherIntTeam.style.display = "none";
                inputOtherIntTeam.required = false;
                inputOtherIntTeam.value = "";
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');
    
    let isUserRegistered = false;
    let currentUserData = null;
    const loginBtns = document.querySelectorAll('.login-btn');
    const registerBtns = document.querySelectorAll('.register-btn');
    const closeBtns = document.querySelectorAll('.close-modal');
    
    const switchToLogin = document.getElementById('switchToLogin');
    const switchToRegister = document.getElementById('switchToRegister');

    // Open Register Modal
    registerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isUserRegistered) {
                registerModal.classList.add('show');
                loginModal.classList.remove('show');
            }
        });
    });

    // Open Login Modal
    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!isUserRegistered) {
                loginModal.classList.add('show');
                registerModal.classList.remove('show');
            }
        });
    });

    // Switch between modals
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.classList.remove('show');
        loginModal.classList.add('show');
    });

    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginModal.classList.remove('show');
        registerModal.classList.add('show');
    });

    // Close Modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // --- Firebase Auth & Firestore ---

    // 1. Observer: Check if user is logged in automatically
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            isUserRegistered = true;
            
            // Get user data from Firestore
            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
            }

            // Update UI
            loginBtns.forEach(btn => {
                btn.textContent = 'Cerrar Sesión';
                btn.style.background = 'transparent';
                btn.style.border = '1px solid var(--primary)';
                btn.style.color = 'var(--primary)';
            });

            // If user clicks "Cerrar Sesión"
            loginBtns.forEach(btn => {
                btn.onclick = (e) => {
                    if (isUserRegistered && btn.textContent === 'Cerrar Sesión') {
                        e.preventDefault();
                        e.stopPropagation();
                        signOut(auth).then(() => {
                            window.location.reload();
                        });
                    }
                };
            });

            // Cargar Panel de Pronósticos interactivo
            if (typeof loadDashboard === 'function') {
                loadDashboard(user);
            }

        } else {
            isUserRegistered = false;
            currentUserData = null;
            
            // Ocultar Panel si existe
            const dashboardSection = document.getElementById('dashboard');
            if(dashboardSection) dashboardSection.classList.add('hidden');
            
            // Restaurar botón principal si cerramos sesión
            registerBtns.forEach(btn => {
                btn.textContent = 'Unirse Ahora';
                btn.onclick = null;
            });
        }
    });

    // 2. Handle Registration
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if passwords match
        const pwd1 = document.getElementById('registerPassword').value;
        const pwd2 = document.getElementById('confirmPassword').value;
        if (pwd1 !== pwd2) {
            alert("Las contraseñas no coinciden. Por favor verifica.");
            return;
        }

        const email = document.getElementById('email').value.toLowerCase().trim();
        let firstName = document.getElementById('firstName').value.trim();
        let lastName = document.getElementById('lastName').value.trim();
        let fullName = `${firstName} ${lastName}`;
        fullName = fullName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const phone = document.getElementById('phone').value;
        const dob = document.getElementById('dob').value;
        let city = document.getElementById('city').value.trim();
        city = city.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let province = document.getElementById('province').value.trim();
        province = province.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        let localTeam = document.getElementById('localTeam').value;
        if(localTeam === "Otros") {
            localTeam = document.getElementById('otherLocalTeam').value.trim();
        }
        let internationalTeam = document.getElementById('internationalTeam').value;
        if(internationalTeam === "Otros") {
            internationalTeam = document.getElementById('otherInternationalTeam').value.trim();
        }
        const isEcuadorian = document.getElementById('isEcuadorian').checked;

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creando cuenta...';
        submitBtn.disabled = true;

        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, pwd1);
            const user = userCredential.user;

            // Save extra data in Firestore Database
            await setDoc(doc(db, "usuarios", user.uid), {
                nombre_completo: fullName,
                email: email,
                telefono: phone,
                fecha_nacimiento: dob,
                ciudad: city,
                provincia: province,
                equipo_ecuador: localTeam,
                equipo_internacional: internationalTeam,
                es_de_ecuador: isEcuadorian,
                fecha_registro: new Date().toISOString()
            });

            registerModal.classList.remove('show');
            alert('¡Registro exitoso! Ya puedes guardar tus pronósticos.');
            registerForm.reset();
            
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                alert('Este correo ya está registrado. Por favor, Inicia Sesión.');
            } else if (error.code === 'auth/weak-password') {
                alert('La contraseña debe tener al menos 6 caracteres.');
            } else {
                alert('Hubo un problema al crear la cuenta: ' + error.message);
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 3. Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const pwd = document.getElementById('loginPassword').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Ingresando...';
        submitBtn.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, pwd);
            loginModal.classList.remove('show');
            loginForm.reset();
            alert('¡Bienvenido de vuelta a la Polla La Remera EC!');
        } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                alert('Correo o contraseña incorrectos.');
            } else {
                alert('Ocurrió un problema: ' + error.message);
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 4. Handle Forgot Password
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail').value;
            
            if (!emailInput) {
                alert('Por favor, ingresa tu correo electrónico en el campo superior antes de pedir restablecer la contraseña.');
                return;
            }
            
            try {
                await sendPasswordResetEmail(auth, emailInput);
                alert('¡Te hemos enviado un correo seguro para restablecer tu contraseña! Revisa tu bandeja de entrada o carpeta de spam.');
            } catch (error) {
                if (error.code === 'auth/user-not-found') {
                    alert('No tenemos ninguna cuenta registrada con ese correo.');
                } else if (error.code === 'auth/invalid-email') {
                    alert('El correo ingresado tiene un formato no válido.');
                } else {
                    alert('Error técnico al pedir el restablecimiento: ' + error.message);
                }
            }
        });
    }

    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(10, 14, 23, 0.95)';
        } else {
            nav.style.background = 'rgba(10, 14, 23, 0.8)';
        }
    });

    // --- Lógica del Dashboard y Pronósticos ---
    const CUTOFF_DATE = new Date("2026-04-02T00:00:00Z"); // Cierre temporal de playoffs
    const dashboardSection = document.getElementById('dashboard');
    const matchesContainer = document.getElementById('matches-container');
    const savePredictionsBtn = document.getElementById('savePredictionsBtn');
    
    // Lista de partidos (Playoffs Reales)
    const matchesList = [
        { id: "p1", team1: "Bosnia", flag1: "ba", team2: "Italia", flag2: "it", time: "2026-03-31T13:45:00-05:00", displayTime: "13:45 (ECU)" },
        { id: "p2", team1: "Suecia", flag1: "se", team2: "Polonia", flag2: "pl", time: "2026-03-31T13:45:00-05:00", displayTime: "13:45 (ECU)" },
        { id: "p3", team1: "Kosovo", flag1: "xk", team2: "Türkiye", flag2: "tr", time: "2026-03-31T13:45:00-05:00", displayTime: "13:45 (ECU)" },
        { id: "p4", team1: "Chequia", flag1: "cz", team2: "Dinamarca", flag2: "dk", time: "2026-03-31T13:45:00-05:00", displayTime: "13:45 (ECU)" },
        { id: "p5", team1: "RD Congo", flag1: "cd", team2: "Jamaica", flag2: "jm", time: "2026-03-31T16:00:00-05:00", displayTime: "16:00 (ECU)" },
        { id: "p6", team1: "Irak", flag1: "iq", team2: "Bolivia", flag2: "bo", time: "2026-03-31T22:00:00-05:00", displayTime: "22:00 (ECU)" }
    ];
    
    // Nodos del Visualizador Público
    const viewerModal = document.getElementById('viewerModal');
    const viewerName = document.getElementById('viewerName');
    const viewerMatches = document.getElementById('viewerMatches');

    // Función para mostrar pronósticos (Transparencia)
    function openViewerModal(userData) {
        viewerName.textContent = userData.nombre;
        viewerMatches.innerHTML = '';

        if (matchesList.length === 0) {
            viewerMatches.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Sin partidos disponibles en este momento.</p>';
        } else {
            matchesList.forEach(match => {
                const matchStart = new Date(match.time);
                const isMatchStarted = new Date() >= matchStart;
                const p = userData.predicciones[match.id] || { s1: '-', s2: '-' };
                const real = lastResultados[match.id];

                // Si el partido ya empezó, revelamos el pronóstico. Si no, candado.
                const scoreHTML = isMatchStarted
                    ? `${p.s1} - ${p.s2}`
                    : `<span title="Por transparencia, se revela al iniciar el partido">🔒 Seguro</span>`;

                // Resultado real (si el admin ya lo cargó en Firebase)
                let realHTML = '';
                if (real) {
                    const isFinished = real.status === 'FT' || real.status === 'AET';
                    const isLiveNow = !isFinished && real.status;
                    const realColor = isFinished ? '#22c55e' : 'var(--primary)';
                    const liveTag = isLiveNow ? `<span style="color:#22c55e; margin-left:6px;">● En vivo</span>` : '';
                    realHTML = `<div style="width:100%; text-align:center; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); font-size:0.82rem; color:#9ca3af;">
                        Resultado real: <strong style="color:${realColor}; font-size:1rem;">${real.s1} - ${real.s2}</strong>${liveTag}
                    </div>`;
                }

                const card = document.createElement('div');
                card.style.background = 'rgba(0,0,0,0.3)';
                card.style.padding = '1rem';
                card.style.borderRadius = '8px';
                card.style.display = 'flex';
                card.style.flexWrap = 'wrap';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';

                card.innerHTML = `
                    <div style="flex:1; text-align:right;">${match.team1} <img src="https://flagcdn.com/w40/${match.flag1}.png" style="width:20px; vertical-align:middle; margin-left:5px;"></div>
                    <div style="padding: 0 15px; font-weight:bold; color:var(--primary); font-size:1.1rem; text-align:center;">${scoreHTML}</div>
                    <div style="flex:1; text-align:left;"><img src="https://flagcdn.com/w40/${match.flag2}.png" style="width:20px; vertical-align:middle; margin-right:5px;"> ${match.team2}</div>
                    ${realHTML}
                `;
                viewerMatches.appendChild(card);
            });
        }
        
        viewerModal.classList.add('show');
    }

    async function loadDashboard(user) {
        dashboardSection.classList.remove('hidden');
        
        // Convertir el botón principal de la web en atajo rápido
        registerBtns.forEach(btn => {
            btn.textContent = 'Ver Mis Pronósticos';
            btn.onclick = (e) => {
                e.preventDefault();
                dashboardSection.scrollIntoView({ behavior: 'smooth' });
            };
        });

        // Bloqueo estricto por Fecha
        const now = new Date();
        const isClosed = now >= CUTOFF_DATE;

        if (isClosed) {
            savePredictionsBtn.textContent = 'El torneo ha comenzado (Cerrado)';
            savePredictionsBtn.disabled = true;
            savePredictionsBtn.style.opacity = '0.5';
            savePredictionsBtn.style.cursor = 'not-allowed';
        }

        // Recuperar predicciones existentes desde Firebase (si hay)
        let savedPredictions = {};
        try {
            const docRef = doc(db, "predicciones_playoff", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().partidos) {
                savedPredictions = docSnap.data().partidos;
            }
        } catch (e) {
            console.error("No se pudieron cargar las predicciones", e);
        }

        matchesContainer.innerHTML = ''; // Limpiar
        
        if (matchesList.length === 0) {
            matchesContainer.innerHTML = `
                <div class="glass" style="padding: 2rem; text-align: center; border-radius: 12px; max-width: 500px; width: 100%;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.5rem;">Llegaste temprano ⏱️</h3>
                    <p style="color: var(--text-muted); line-height: 1.6;">Los partidos del Mundial se publicarán en este panel automáticamente en los próximos meses. <br><br> ¡Vuelve más adelante para ingresar tus marcadores y competir!</p>
                </div>
            `;
            savePredictionsBtn.style.display = 'none';
        } else {
            savePredictionsBtn.style.display = 'inline-block';
            matchesList.forEach(match => {
                const card = document.createElement('div');
                card.className = 'match-card glass';
                
                const p = savedPredictions[match.id] || { s1: '', s2: '' };
                const isMatchLocked = new Date() >= new Date(match.time);
                const isInputDisabled = isClosed || isMatchLocked;

                card.innerHTML = `
                    <div class="match-time" style="text-align: center; color: var(--gold-secondary); font-size: 0.85rem; margin-bottom: 10px; width: 100%;">
                        <i class="fas fa-clock"></i> ${match.displayTime} ${isMatchLocked ? '<span style="color:var(--danger);font-weight:bold;margin-left:5px;">(Cerrado)</span>' : ''}
                    </div>
                    <div id="liveMarker_${match.id}" style="width: 100%; text-align: center; font-size: 1.1rem; margin-bottom: 5px; font-weight: bold; letter-spacing: 1px;"></div>
                    <div style="display: flex; width: 100%; justify-content: space-between; align-items: center;">
                        <div class="team">
                            <img src="https://flagcdn.com/w80/${match.flag1}.png" class="flag-img" alt="${match.team1}">
                            <span class="team-name">${match.team1}</span>
                            <input type="number" min="0" class="score-input p-input" data-match="${match.id}" data-team="1" placeholder="-" value="${p.s1}" ${isInputDisabled ? 'disabled' : ''} style="${isMatchLocked ? 'opacity:0.5; background:var(--card-bg);' : ''}">
                        </div>
                        <div class="vs">VS</div>
                        <div class="team">
                            <input type="number" min="0" class="score-input p-input" data-match="${match.id}" data-team="2" placeholder="-" value="${p.s2}" ${isInputDisabled ? 'disabled' : ''} style="${isMatchLocked ? 'opacity:0.5; background:var(--card-bg);' : ''}">
                            <span class="team-name">${match.team2}</span>
                            <img src="https://flagcdn.com/w80/${match.flag2}.png" class="flag-img" alt="${match.team2}">
                        </div>
                    </div>
                `;
                matchesContainer.appendChild(card);
            });
        }

        savePredictionsBtn.onclick = async () => {
            if (new Date() >= CUTOFF_DATE) {
                alert('El Mundial ya empezó. El tiempo para predecir se ha cerrado.');
                window.location.reload();
                return;
            }
            
            savePredictionsBtn.textContent = 'Guardando...';
            savePredictionsBtn.disabled = true;

            const inputs = document.querySelectorAll('.p-input');
            const newPredictions = {};
            
            matchesList.forEach(m => {
                const isMatchLocked = new Date() >= new Date(m.time);
                if (isMatchLocked) {
                    newPredictions[m.id] = savedPredictions[m.id] || { s1: '', s2: '' };
                } else {
                    newPredictions[m.id] = { s1: '', s2: '' };
                }
            });

            inputs.forEach(input => {
                const matchId = input.getAttribute('data-match');
                const matchDef = matchesList.find(m => m.id === matchId);
                const isMatchLocked = matchDef && new Date() >= new Date(matchDef.time);
                
                if (!isMatchLocked) {
                    const team = input.getAttribute('data-team');
                    newPredictions[matchId][`s${team}`] = input.value;
                }
            });

            try {
                // Guardar en colección secundaria 'predicciones_playoff'
                await setDoc(doc(db, "predicciones_playoff", user.uid), {
                    partidos: newPredictions,
                    ultima_actualizacion: new Date().toISOString()
                }, { merge: true });
                
                alert('¡Tus pronósticos están guardados y seguros en la nube de La Remera EC!');
            } catch (err) {
                alert('Ocurrió un error de conexión al guardar: ' + err.message);
            } finally {
                savePredictionsBtn.textContent = 'Guardar Pronósticos';
                savePredictionsBtn.disabled = false;
            }
        };

        // -------------------------------------------------------------
        // Llamar e incrustar la Tabla de Posiciones Global
        await loadLeaderboard();
    }

    let hasLoadedUsers = false;
    let usersDataCache = {};
    let lastResultados = {};
    let lastPreds = {};

    // Timers cliente para incrementar minutos en vivo sin depender de Firebase
    let liveTickerIntervals = {};

    // Actualiza el badge "En vivo / Última actualización" del leaderboard
    function updateLeaderboardLiveStatus() {
        const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'PEN'];
        const hasLive = Object.values(lastResultados).some(r => liveStatuses.includes(r.status));
        const timeStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const statusEl = document.getElementById('leaderboard-status');
        if (!statusEl) return;
        statusEl.innerHTML = hasLive
            ? `<span style="color:#22c55e; animation:pulse 2s infinite; font-size:0.7rem;">●</span>&ensp;<span style="color:#22c55e; font-weight:600;">Partidos en vivo</span>&ensp;·&ensp;Actualizado: <strong style="color:#fff;">${timeStr}</strong>`
            : `Tabla actualizada: <strong style="color:#fff;">${timeStr}</strong>`;
    }

    function updateLiveMatchesUI() {
        // Limpiar timers previos al recibir nuevos datos
        Object.values(liveTickerIntervals).forEach(id => clearInterval(id));
        liveTickerIntervals = {};

        matchesList.forEach(m => {
            const realData = lastResultados[m.id];
            if (realData) {
                const markerEl = document.getElementById(`liveMarker_${m.id}`);
                if (markerEl) {
                    const statusCode = realData.status;
                    let estadoTxt = statusCode;
                    let color = "var(--primary)";
                    let isLive = false;

                    if (statusCode === "1H")                       { estadoTxt = "1er Tiempo";  isLive = true; }
                    else if (statusCode === "2H")                  { estadoTxt = "2do Tiempo";  isLive = true; }
                    else if (statusCode === "HT")                  { estadoTxt = "Medio Tiempo"; isLive = true; }
                    else if (statusCode === "ET")                  { estadoTxt = "Tiempo Extra"; isLive = true; }
                    else if (statusCode === "P")  { estadoTxt = "⚡ Penales"; isLive = true; }
                    else if (statusCode === "PEN" || statusCode === "FT" || statusCode === "AET") { estadoTxt = "FINALIZADO ✓"; color = "#9ca3af"; }

                    if (isLive) color = "#22c55e";

                    const baseMinute = realData.minute ? parseInt(realData.minute) : null;
                    const snapshotTime = Date.now();

                    const renderMarker = () => {
                        let minStr = '';
                        if (isLive && baseMinute !== null) {
                            const elapsed = Math.floor((Date.now() - snapshotTime) / 60000);
                            minStr = `(${baseMinute + elapsed}')`;
                        }
                        markerEl.innerHTML = `<span style="color:${color}; ${isLive ? 'animation:pulse 2s infinite;' : ''}">${estadoTxt} ${minStr} &nbsp;|&nbsp; <span style="font-size:1.3rem; color:#fff; font-weight:900;">${realData.s1} - ${realData.s2}</span></span>`;
                    };

                    renderMarker(); // Mostrar inmediatamente

                    // Auto-incrementar minuto cada 30s cuando el partido está en vivo
                    if (isLive && baseMinute !== null) {
                        liveTickerIntervals[m.id] = setInterval(() => {
                            renderMarker();
                            updateLeaderboardLiveStatus(); // Refrescar timestamp del leaderboard
                        }, 30000);
                    }
                }
            }
        });
    }

    function renderLeaderboard() {
        // --- Indicador de estado en tiempo real ---
        let statusEl = document.getElementById('leaderboard-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'leaderboard-status';
            statusEl.style.cssText = 'text-align:center; margin-top:1rem; font-size:0.85rem; color:var(--text-muted); padding:0.4rem 1rem;';
            const glassDiv = document.querySelector('#leaderboard-container .glass');
            if (glassDiv) glassDiv.insertAdjacentElement('afterend', statusEl);
        }
        updateLeaderboardLiveStatus();

        // Flash suave para notificar que los datos se actualizaron
        const tableEl = document.querySelector('.leaderboard-table');
        if (tableEl) {
            tableEl.style.transition = 'opacity 0.25s';
            tableEl.style.opacity = '0.5';
            setTimeout(() => { tableEl.style.opacity = '1'; }, 250);
        }

        // --- Calcular puntos ---
        Object.keys(usersDataCache).forEach(uid => {
            usersDataCache[uid].pts = 0;
            const userPreds = lastPreds[uid];
            if (userPreds) {
                usersDataCache[uid].predicciones = userPreds;
                Object.keys(lastResultados).forEach(matchId => {
                    const real = lastResultados[matchId];
                    const pred = userPreds[matchId];
                    if (real && pred) {
                        const r1 = parseInt(real.s1);
                        const r2 = parseInt(real.s2);
                        const p1 = parseInt(pred.s1);
                        const p2 = parseInt(pred.s2);
                        if (!isNaN(r1) && !isNaN(r2) && !isNaN(p1) && !isNaN(p2)) {
                            if (p1 === r1 && p2 === r2) {
                                usersDataCache[uid].pts += 3;
                            } else {
                                const diffReal = r1 - r2;
                                const diffPred = p1 - p2;
                                const ganadorReal = diffReal > 0 ? 1 : (diffReal < 0 ? 2 : 0);
                                const ganadorPred = diffPred > 0 ? 1 : (diffPred < 0 ? 2 : 0);
                                if (ganadorReal === ganadorPred) {
                                    usersDataCache[uid].pts += 1;
                                }
                            }
                        }
                    }
                });
            }
        });

        // Ordenar y Dibujar
        const ranking = Object.values(usersDataCache).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            return a.nombre.localeCompare(b.nombre);
        });
        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';
        
        if (ranking.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Aún no existen jugadores dentro de la Polla Oficial.</td></tr>';
            return;
        }
        
        const canViewOthers = true; // Ahora siempre se pueder abrir el modal (el bloqueo es por partido interno)
        ranking.forEach((u, idx) => {
            const tr = document.createElement('tr');
            if(idx < 3) tr.className = 'top-3';
            let viewBtnHtml = `<button class="view-preds-btn" data-uid="${u.uid}" title="Auditar Pronósticos" style="width:72px; height:34px; font-size:0.85rem; border-radius:6px; border:1px solid var(--primary); background:rgba(56,189,248,0.1); color:var(--primary); cursor:pointer; transition:0.2s; display:inline-flex; align-items:center; justify-content:center; gap:4px; flex-shrink:0;">👁️ Ver</button>`;
            
            tr.innerHTML = `
                <td style="font-weight: bold; width: 60px; text-align: center;">${idx + 1}</td>
                <td style="font-weight: 500;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <span>${u.nombre}</span>
                        ${viewBtnHtml}
                    </div>
                </td>
                <td style="text-align: right; font-weight: 900; color: var(--primary); font-size: 1.15rem;">${u.pts}</td>
            `;
            leaderboardBody.appendChild(tr);
        });

        document.querySelectorAll('.view-preds-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedUid = btn.getAttribute('data-uid');
                if(usersDataCache[selectedUid]) openViewerModal(usersDataCache[selectedUid]);
            });
        });
    }

    async function loadLeaderboard() {
        const leaderboardContainer = document.getElementById('leaderboard-container');
        leaderboardContainer.style.display = 'block';
        
        try {
            if (!hasLoadedUsers) {
                const usersSnap = await getDocs(collection(db, "usuarios"));
                usersSnap.forEach(userDoc => {
                    let nText = userDoc.data().nombre_completo || userDoc.data().nombre || "Competidor Anónimo";
                    nText = nText.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    usersDataCache[userDoc.id] = { uid: userDoc.id, nombre: nText, pts: 0, predicciones: {} };
                });
                hasLoadedUsers = true;
            }

            // Real-time listener para Resultados de la Maquina/Admin
            onSnapshot(doc(db, "admin_playoff", "resultados"), (docSnap) => {
                if(docSnap.exists() && docSnap.data().partidos) {
                    lastResultados = docSnap.data().partidos;
                    updateLiveMatchesUI();
                }
                renderLeaderboard();
            });

            // Real-time listener para Nuevas Predicciones de Usuarios
            onSnapshot(collection(db, "predicciones_playoff"), (querySnapshot) => {
                querySnapshot.forEach(predDoc => {
                    lastPreds[predDoc.id] = predDoc.data().partidos;
                });
                renderLeaderboard();
            });
            
        } catch (error) {
            console.error("Fallo al conectar listeners: ", error);
            document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ff4444;">Hubo un error de conexión rápida.</td></tr>';
        }
    }

    // ---------------------------------------------------------------
    // PANEL DE ADMINISTRACIÓN — Ingresar resultados reales a Firebase
    // ---------------------------------------------------------------
    function openAdminPanel() {
        const existing = document.getElementById('adminResultsPanel');
        if (existing) { existing.remove(); return; }

        const STATUS_OPTIONS = [
            { val: '',    label: '— Estado —' },
            { val: '1H',  label: '⚽ 1er Tiempo (En vivo)' },
            { val: 'HT',  label: '⏸ Medio Tiempo' },
            { val: '2H',  label: '⚽ 2do Tiempo (En vivo)' },
            { val: 'ET',  label: '⏱ Tiempo Extra' },
            { val: 'P',   label: '🎯 Penales' },
            { val: 'FT',  label: '✅ Finalizado (FT)' },
            { val: 'AET', label: '✅ Finalizado tras prórroga (AET)' },
        ];

        const rows = matchesList.map(m => {
            const saved = lastResultados[m.id] || {};
            const opts = STATUS_OPTIONS.map(o =>
                `<option value="${o.val}" ${saved.status === o.val ? 'selected' : ''} style="background:#0d1117;">${o.label}</option>`
            ).join('');
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                <td style="padding:10px 8px; color:#e2e8f0; font-size:0.88rem; white-space:nowrap;">
                    <img src="https://flagcdn.com/w20/${m.flag1}.png" style="vertical-align:middle; margin-right:4px;">${m.team1}
                    <span style="color:#64748b; margin:0 4px;">vs</span>
                    <img src="https://flagcdn.com/w20/${m.flag2}.png" style="vertical-align:middle; margin-right:4px;">${m.team2}
                </td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" id="ar_s1_${m.id}" value="${saved.s1 ?? ''}" style="width:48px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:1rem; font-weight:700;">
                </td>
                <td style="padding:6px 2px; text-align:center; color:#64748b; font-weight:700;">—</td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" id="ar_s2_${m.id}" value="${saved.s2 ?? ''}" style="width:48px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:1rem; font-weight:700;">
                </td>
                <td style="padding:6px 4px;">
                    <select id="ar_st_${m.id}" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px 4px; font-size:0.8rem; width:100%;">${opts}</select>
                </td>
                <td style="padding:6px 4px; text-align:center;">
                    <input type="number" min="0" max="120" id="ar_mn_${m.id}" value="${saved.minute ?? ''}" placeholder="Min" style="width:52px; text-align:center; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:6px; padding:5px; font-size:0.9rem;">
                </td>
            </tr>`;
        }).join('');

        const panel = document.createElement('div');
        panel.id = 'adminResultsPanel';
        panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
        panel.innerHTML = `
            <div style="background:#0a0e17;border:1px solid rgba(56,189,248,0.35);border-radius:18px;padding:2rem;max-width:760px;width:96%;max-height:90vh;overflow-y:auto;">
                <h2 style="color:var(--primary);text-align:center;margin-bottom:0.3rem;font-size:1.5rem;">🛡️ Panel de Resultados</h2>
                <p style="text-align:center;color:#64748b;font-size:0.82rem;margin-bottom:1.5rem;">Ingresa el marcador y estado de cada partido. Solo guarda los que tengan datos completos.</p>
                <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="color:#64748b;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;">
                        <th style="padding:6px 8px;text-align:left;">Partido</th>
                        <th style="padding:6px 4px;text-align:center;">Local</th>
                        <th></th>
                        <th style="padding:6px 4px;text-align:center;">Visita</th>
                        <th style="padding:6px 4px;text-align:center;">Estado</th>
                        <th style="padding:6px 4px;text-align:center;">Min.</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                </table>
                </div>
                <div style="text-align:center;margin-top:1.8rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
                    <button id="arSaveBtn" style="background:var(--primary);color:#000;border:none;padding:0.75rem 2.2rem;border-radius:8px;font-weight:800;cursor:pointer;font-size:1rem;letter-spacing:0.5px;">💾 Guardar en Firebase</button>
                    <button id="arCloseBtn" style="background:transparent;color:#9ca3af;border:1px solid rgba(255,255,255,0.15);padding:0.75rem 1.5rem;border-radius:8px;cursor:pointer;">Cerrar</button>
                </div>
                <p id="arMsg" style="text-align:center;margin-top:1rem;font-size:0.88rem;min-height:1.2rem;"></p>
            </div>`;

        document.body.appendChild(panel);

        document.getElementById('arCloseBtn').onclick = () => panel.remove();
        panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });

        document.getElementById('arSaveBtn').onclick = async () => {
            const btn = document.getElementById('arSaveBtn');
            const msg = document.getElementById('arMsg');
            btn.textContent = '⏳ Guardando...';
            btn.disabled = true;

            const updates = {};
            matchesList.forEach(m => {
                const s1 = document.getElementById(`ar_s1_${m.id}`).value.trim();
                const s2 = document.getElementById(`ar_s2_${m.id}`).value.trim();
                const status = document.getElementById(`ar_st_${m.id}`).value;
                const minute = document.getElementById(`ar_mn_${m.id}`).value.trim();
                if (s1 !== '' && s2 !== '' && status !== '') {
                    updates[m.id] = { s1, s2, status, minute: minute || null };
                }
            });

            try {
                await setDoc(doc(db, "admin_playoff", "resultados"), {
                    partidos: updates,
                    ultima_sincronizacion: new Date().toISOString()
                });
                msg.style.color = '#22c55e';
                msg.textContent = `✅ ${Object.keys(updates).length} partido(s) guardados. La tabla se actualizará automáticamente.`;
            } catch (e) {
                msg.style.color = '#ff4444';
                msg.textContent = '❌ Error al guardar: ' + e.message;
            } finally {
                btn.textContent = '💾 Guardar en Firebase';
                btn.disabled = false;
            }
        };
    }

    // Activar panel con doble clic en el logo
    const logoElAdmin = document.querySelector('.logo');
    if (logoElAdmin) {
        logoElAdmin.addEventListener('dblclick', () => {
            const pwd = prompt('🔑 Código de Administrador:');
            if (pwd === 'CarlosPancho') {
                openAdminPanel();
            } else if (pwd !== null) {
                alert('Clave incorrecta. Acceso denegado.');
            }
        });
    }

});

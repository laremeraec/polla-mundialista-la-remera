import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
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
            registerModal.classList.add('show');
            loginModal.classList.remove('show');
        });
    });

    // Open Login Modal
    loginBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            loginModal.classList.add('show');
            registerModal.classList.remove('show');
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

        const email = document.getElementById('email').value;
        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const dob = document.getElementById('dob').value;
        const localTeam = document.getElementById('localTeam').value;
        const internationalTeam = document.getElementById('internationalTeam').value;
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
    const CUTOFF_DATE = new Date("2026-06-11T12:00:00Z"); // Inicio del Mundial 2026
    const dashboardSection = document.getElementById('dashboard');
    const matchesContainer = document.getElementById('matches-container');
    const savePredictionsBtn = document.getElementById('savePredictionsBtn');
    
    // Lista de partidos (Vacía hasta anuncio)
    const matchesList = [];
    
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
                const p = userData.predicciones[match.id] || { s1: '-', s2: '-' };
                
                const card = document.createElement('div');
                card.style.background = 'rgba(0,0,0,0.3)';
                card.style.padding = '1rem';
                card.style.borderRadius = '8px';
                card.style.display = 'flex';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';

                card.innerHTML = `
                    <div style="flex:1; text-align:right;">${match.team1} <img src="https://flagcdn.com/w40/${match.flag1}.png" style="width:20px; vertical-align:middle; margin-left:5px;"></div>
                    <div style="padding: 0 15px; font-weight:bold; color:var(--primary); font-size:1.2rem;">${p.s1} - ${p.s2}</div>
                    <div style="flex:1; text-align:left;"><img src="https://flagcdn.com/w40/${match.flag2}.png" style="width:20px; vertical-align:middle; margin-right:5px;"> ${match.team2}</div>
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
            const docRef = doc(db, "predicciones", user.uid);
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

                card.innerHTML = `
                    <div class="team">
                        <img src="https://flagcdn.com/w80/${match.flag1}.png" class="flag-img" alt="${match.team1}">
                        <span class="team-name">${match.team1}</span>
                        <input type="number" min="0" class="score-input p-input" data-match="${match.id}" data-team="1" placeholder="-" value="${p.s1}" ${isClosed ? 'disabled' : ''}>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team">
                        <input type="number" min="0" class="score-input p-input" data-match="${match.id}" data-team="2" placeholder="-" value="${p.s2}" ${isClosed ? 'disabled' : ''}>
                        <span class="team-name">${match.team2}</span>
                        <img src="https://flagcdn.com/w80/${match.flag2}.png" class="flag-img" alt="${match.team2}">
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
                newPredictions[m.id] = { s1: '', s2: '' };
            });

            inputs.forEach(input => {
                const matchId = input.getAttribute('data-match');
                const team = input.getAttribute('data-team');
                newPredictions[matchId][`s${team}`] = input.value;
            });

            try {
                // Guardar en colección secundaria 'predicciones'
                await setDoc(doc(db, "predicciones", user.uid), {
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

    async function loadLeaderboard() {
        const leaderboardContainer = document.getElementById('leaderboard-container');
        const leaderboardBody = document.getElementById('leaderboard-body');
        
        leaderboardContainer.style.display = 'block';
        leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Calculando ranking exacto global de toda la Polla... ⏱️</td></tr>';
        
        // Bloqueo Anti-Trampas
        const now = new Date();
        const canViewOthers = now >= CUTOFF_DATE;

        try {
            // Descargar caja fuerte del Administrador (Resultados reales)
            let resultadosOficiales = {};
            try {
                const adminDoc = await getDoc(doc(db, "admin", "resultados"));
                if(adminDoc.exists() && adminDoc.data().partidos) {
                    resultadosOficiales = adminDoc.data().partidos;
                }
            } catch(e) { /* Si no hay resultados todavía, se ignora el error */ }

            // Extraer usuarios y predicciones masivamente desde la nube
            const usersSnap = await getDocs(collection(db, "usuarios"));
            const predsSnap = await getDocs(collection(db, "predicciones"));
            
            let usersData = {};
            usersSnap.forEach(userDoc => {
                usersData[userDoc.id] = { 
                    uid: userDoc.id,
                    nombre: userDoc.data().nombre_completo || "Competidor Anónimo", 
                    pts: 0,
                    predicciones: {}
                };
            });
            
            predsSnap.forEach(predDoc => {
                const uid = predDoc.id;
                const userPreds = predDoc.data().partidos;
                
                if (usersData[uid] && userPreds) {
                    // Caching para el Visualizador Público
                    usersData[uid].predicciones = userPreds;

                    // Puntuar contra la nube
                    Object.keys(resultadosOficiales).forEach(matchId => {
                        const real = resultadosOficiales[matchId];
                        const pred = userPreds[matchId];
                        
                        // Evaluar
                        if (real && pred) {
                            const r1 = parseInt(real.s1);
                            const r2 = parseInt(real.s2);
                            const p1 = parseInt(pred.s1);
                            const p2 = parseInt(pred.s2);
                            
                            // Asegurarnos que todos sean números
                            if (!isNaN(r1) && !isNaN(r2) && !isNaN(p1) && !isNaN(p2)) {
                                if (p1 === r1 && p2 === r2) {
                                    usersData[uid].pts += 3; // EXACTO: ORO
                                } else {
                                    // TENDENCIA O GANADOR: Consuelo
                                    const diffReal = r1 - r2;
                                    const diffPred = p1 - p2;
                                    
                                    const ganadorReal = diffReal > 0 ? 1 : (diffReal < 0 ? 2 : 0);
                                    const ganadorPred = diffPred > 0 ? 1 : (diffPred < 0 ? 2 : 0);
                                    
                                    if (ganadorReal === ganadorPred) {
                                        usersData[uid].pts += 1;
                                    }
                                }
                            }
                        }
                    });
                }
            });
            
            // Ordenar Ranking de mayor a menor
            const ranking = Object.values(usersData).sort((a, b) => b.pts - a.pts);
            
            // Dibujar la tabla
            leaderboardBody.innerHTML = '';
            
            if (ranking.length === 0) {
                leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Aún no existen jugadores dentro de la Polla Oficial.</td></tr>';
            } else {
                ranking.forEach((u, idx) => {
                    const tr = document.createElement('tr');
                    if(idx < 3) tr.className = 'top-3';
                    
                    let viewBtnHtml = '';
                    if (canViewOthers) {
                        viewBtnHtml = `<button class="view-preds-btn" data-uid="${u.uid}" title="Auditar Pronósticos" style="padding: 0.3rem 0.6rem; font-size: 0.9rem; border-radius: 6px; border: 1px solid var(--primary); background: rgba(56, 189, 248, 0.1); color: var(--primary); cursor: pointer; transition: 0.2s;">👁️ Ver</button>`;
                    } else {
                        viewBtnHtml = `<span title="Por transparencia anti-trampas, se revelan al pitar el Mundial" style="opacity: 0.4; font-size: 0.8rem; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 2px 6px; cursor: not-allowed;">🔒 Seguro</span>`;
                    }

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

                // Attach Events a Botones de Auditoría
                if (canViewOthers) {
                    const btnVer = document.querySelectorAll('.view-preds-btn');
                    btnVer.forEach(btn => {
                        btn.addEventListener('click', () => {
                            const selectedUid = btn.getAttribute('data-uid');
                            if(usersData[selectedUid]) {
                                openViewerModal(usersData[selectedUid]);
                            }
                        });
                    });
                }
            }

        } catch (error) {
            console.error("Fallo al cruzar datos de Leaderboard: ", error);
            leaderboardBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ff4444;">Hubo un error de conexión al cargar las posiciones mundiales. Intenta recargar.</td></tr>';
        }
    }
});

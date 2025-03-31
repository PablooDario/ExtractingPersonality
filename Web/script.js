document.addEventListener('DOMContentLoaded', function() {
    // Referencias a secciones
    const registrationSection = document.getElementById('registration-section');
    const testIntroSection = document.getElementById('test-intro-section');
    const testSection = document.getElementById('test-section');
    const resultsSection = document.getElementById('results-section');
    
    // Referencias a elementos DOM
    const registrationForm = document.getElementById('registration-form');
    const startTestBtn = document.getElementById('start-test-btn');
    const saveBtn = document.getElementById('save-btn');
    const questionText = document.getElementById('question-text');
    const currentQuestionSpan = document.getElementById('current-question');
    const progressBar = document.getElementById('progress-bar');
    const optionBtns = document.querySelectorAll('.option-btn');
    
    // Variables globales
    let currentUserId = null;
    let currentQuestionIndex = 0;
    let responses = {};
    
    // Definición de las preguntas del test BFI-2-S
    const questions = [
        // Apertura (Open-Mindedness) -> o
        // Responsabilidad (Conscientiousness) -> c
        // Extraversión (Extraversion) -> e
        // Amabilidad (Agreeableness) -> a
        // Neuroticismo (Negative Emotionality) -> n

        { id: 'e1', text: "Tiende a estar callado.", trait: "extraversion", reversed: true },
        { id: 'a1', text: "Es compasivo, tiene un corazón sensible.", trait: "agreeableness", reversed: false },
        { id: 'c1', text: "Tiende a ser desorganizado.", trait: "conscientiousness", reversed: true },
        { id: 'n1', text: "Se preocupa mucho.", trait: "neuroticism", reversed: false },
        { id: 'o1', text: "Está fascinado por el arte, la música o la literatura.", trait: "openness", reversed: false },

        { id: 'a2', text: "A veces es grosero con los demás.", trait: "agreeableness", reversed: true },
        { id: 'o2', text: "Tiene poco interés en ideas abstractas.", trait: "openness", reversed: true },
        { id: 'e2', text: "Es dominante, actúa como líder.", trait: "extraversion", reversed: false },
        { id: 'n2', text: "Tiende a sentirse deprimido, melancólico.", trait: "neuroticism", reversed: false },
        { id: 'c2', text: "Tiene dificultad para comenzar tareas.", trait: "conscientiousness", reversed: true },

        { id: 'o3', text: "Es original, se le ocurren nuevas ideas.", trait: "openness", reversed: false },
        { id: 'e3', text: "Está lleno de energía.", trait: "extraversion", reversed: false },
        { id: 'c3', text: "Es confiable, siempre se puede contar con usted.", trait: "conscientiousness", reversed: false },
        { id: 'a3', text: "Asume lo mejor sobre las personas.", trait: "agreeableness", reversed: false },
        { id: 'n3', text: "Es emocionalmente estable, no se altera fácilmente.", trait: "neuroticism", reversed: true },
        
        { id: 'c4', text: "Mantiene las cosas limpias y ordenadas.", trait: "conscientiousness", reversed: false },
        { id: 'n4', text: "Es relajado, maneja bien el estrés.", trait: "neuroticism", reversed: true },
        { id: 'e4', text: "Es extrovertido, sociable.", trait: "extraversion", reversed: false },
        { id: 'a4', text: "Puede ser frío e indiferente.", trait: "agreeableness", reversed: true },
        { id: 'o4', text: "Tiene pocos intereses artísticos.", trait: "openness", reversed: true },

        { id: 'e5', text: "Prefiere que otros tomen el mando.", trait: "extraversion", reversed: true },
        { id: 'a5', text: "Es respetuoso, trata a los demás con respeto.", trait: "agreeableness", reversed: false },
        { id: 'c5', text: "Es persistente, trabaja hasta terminar la tarea.", trait: "conscientiousness", reversed: false },
        { id: 'o5', text: "Es complejo, un pensador profundo.", trait: "openness", reversed: false },
        { id: 'n5', text: "Se siente seguro, cómodo consigo mismo.", trait: "neuroticism", reversed: true },

        { id: 'e6', text: "Es menos activo que otras personas.", trait: "extraversion", reversed: true },
        { id: 'a6', text: "Tiende a encontrar fallos en los demás.", trait: "agreeableness", reversed: true },          
        { id: 'c6', text: "Puede ser algo descuidado.", trait: "conscientiousness", reversed: true },
        { id: 'n6', text: "Es temperamental, se emociona fácilmente.", trait: "neuroticism", reversed: false },
        { id: 'o6', text: "Tiene poca creatividad.", trait: "openness", reversed: true }
    ];
    
    // Manejar registro de usuario
    registrationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        const gender = document.getElementById('gender').value;
        const age = document.getElementById('age').value;
        
        // Validar el nombre de usuario localmente antes de enviar
        if (!username.match(/^[a-zA-Z0-9_]{3,30}$/)) {
            showMessage(registrationForm, 'El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos o guiones bajos', 'error');
            return;
        }
        
        // Enviar datos de registro al backend
        fetch('http://localhost:8000/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                username: username,
                gender: gender, 
                age: age
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || 'Error al registrar usuario');
                });
            }
            return response.json();
        })
        .then(data => {
            // Guardar el ID del usuario
            currentUserId = data.userId;
            
            // Mostrar mensaje de éxito y cambiar a la sección de introducción del test
            showMessage(registrationForm, 'Usuario registrado con éxito', 'success');
            
            // Después de un breve retraso, cambiar a la sección del test
            setTimeout(() => {
                registrationSection.classList.add('hidden');
                testIntroSection.classList.remove('hidden');
            }, 1500);
        })
        .catch(error => {
            showMessage(registrationForm, error.message, 'error');
        });
    });
    
    // Iniciar test de personalidad
    startTestBtn.addEventListener('click', function() {
        testIntroSection.classList.add('hidden');
        testSection.classList.remove('hidden');
        showQuestion(currentQuestionIndex);
    });
    
    // Manejar selección de respuesta
    optionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Eliminar selección previa
            optionBtns.forEach(b => b.classList.remove('selected'));
            // Agregar selección actual
            this.classList.add('selected');
            
            // Guardar respuesta después de un pequeño retraso para el efecto visual
            setTimeout(() => {
                const value = parseInt(this.dataset.value);
                
                // Guardar respuesta ajustando si la pregunta está invertida
                if (questions[currentQuestionIndex].reversed) {
                    responses[questions[currentQuestionIndex].id] = 6 - value; // Invertir en escala 1-5 (6-value)
                } else {
                    responses[questions[currentQuestionIndex].id] = value;
                }
                
                // Avanzar a la siguiente pregunta
                if (currentQuestionIndex < questions.length - 1) {
                    currentQuestionIndex++;
                    showQuestion(currentQuestionIndex);
                } else {
                    // Enviar resultados y mostrar resumen al terminar
                    submitResults();
                }
            }, 200);
        });
    });
    
    
    
    // Mostrar pregunta actual
    function showQuestion(index) {
        const question = questions[index];
        questionText.textContent = question.text;
        currentQuestionSpan.textContent = index + 1;
        
        // Actualizar barra de progreso
        const progress = ((index + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Quitar selección de botones
        optionBtns.forEach(btn => btn.classList.remove('selected'));
    }
    
    // Calcular puntuaciones
    function calculateScores() {
        // Agrupar respuestas por rasgo
        const traitScores = {
            openness: [],
            conscientiousness: [],
            extraversion: [],
            agreeableness: [],
            neuroticism: []
        };
        
        // Agrupar todas las respuestas por rasgo
        questions.forEach(question => {
            if (responses[question.id]) {
                traitScores[question.trait].push(responses[question.id]);
            }
        });
        
        // Calcular promedios
        const results = {};
        for (const trait in traitScores) {
            const scores = traitScores[trait];
            if (scores.length > 0) {
                const sum = scores.reduce((a, b) => a + b, 0);
                results[trait] = parseFloat((sum / scores.length).toFixed(2));
            } else {
                results[trait] = 0;
            }
        }
        
        return results;
    }
    
    // Enviar resultados al backend
    function submitResults() {
        // Verificar que tenemos un ID de usuario
        if (!currentUserId) {
            showMessage(testSection, 'Error: No se ha registrado un usuario', 'error');
            return;
        }
        
        // Calcular resultados
        const results = calculateScores();
        
        // Enviar resultados al backend
        fetch('http://localhost:8000/api/personalities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUserId,
                openness: results.openness,
                conscientiousness: results.conscientiousness,
                extraversion: results.extraversion,
                agreeableness: results.agreeableness,
                neuroticism: results.neuroticism
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || 'Error al enviar resultados');
                });
            }
            return response.json();
        })
        .then(data => {
            // Mostrar resultados
            showResults(results);
            
            // Cambiar a la sección de resultados
            testSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
        })
        .catch(error => {
            showMessage(testSection, error.message, 'error');
        });
    }
    
    // Mostrar resultados
    function showResults(results) {
        // Actualizar valores y barras de progreso para cada dimensión
        document.getElementById('o-score').textContent = results.openness.toFixed(2);
        document.getElementById('c-score').textContent = results.conscientiousness.toFixed(2);
        document.getElementById('e-score').textContent = results.extraversion.toFixed(2);
        document.getElementById('a-score').textContent = results.agreeableness.toFixed(2);
        document.getElementById('n-score').textContent = results.neuroticism.toFixed(2);
        
        // Animar barras de progreso (valores entre 0-100%)
        setTimeout(() => {
            document.getElementById('o-score-bar').style.width = `${(results.openness / 5) * 100}%`;
            document.getElementById('c-score-bar').style.width = `${(results.conscientiousness / 5) * 100}%`;
            document.getElementById('e-score-bar').style.width = `${(results.extraversion / 5) * 100}%`;
            document.getElementById('a-score-bar').style.width = `${(results.agreeableness / 5) * 100}%`;
            document.getElementById('n-score-bar').style.width = `${(results.neuroticism / 5) * 100}%`;
        }, 100);
    }
    
    // Función para mostrar mensajes de error o éxito
    function showMessage(container, message, type) {
        // Eliminar mensajes previos
        const prevMessages = container.querySelectorAll('.error-message, .success-message');
        prevMessages.forEach(msg => msg.remove());
        
        // Crear nuevo mensaje
        const messageElement = document.createElement('div');
        messageElement.className = type === 'error' ? 'error-message' : 'success-message';
        messageElement.textContent = message;
        
        // Insertar mensaje al inicio del contenedor
        container.insertBefore(messageElement, container.firstChild);
        
        // Desplazarse al mensaje
        messageElement.scrollIntoView({ behavior: 'smooth' });
    }

    // Referencias a elementos de la sección de películas
    const moviesSection = document.getElementById('movies-section');
    const moviesGrid = document.getElementById('movies-grid');
    const ratingsCount = document.getElementById('ratings-count');
    const ratingsProgressBar = document.getElementById('ratings-progress-bar');
    const finishRatingsBtn = document.getElementById('finish-ratings-btn');
    const goToMoviesBtn = document.getElementById('go-to-movies-btn');

    // Referencias a elementos de la nueva sección de calificación individual
    const singleMovieSection = document.getElementById('single-movie-section');
    const singleMovieTitle = document.getElementById('single-movie-title');
    const singleMoviePoster = document.getElementById('single-movie-poster');
    const singleMovieStars = document.querySelectorAll('#single-movie-section .star');
    const saveMovieRatingBtn = document.getElementById('save-movie-rating-btn');
    const backToMoviesBtn = document.getElementById('back-to-movies-btn');

    // Referencias al modal de finalización
    const completionModal = document.getElementById('completion-modal');
    const completionOkBtn = document.getElementById('completion-ok-btn');

    // Variables para el sistema de calificación
    let selectedMovieId = null;
    let selectedRating = null;
    let userRatings = {};
    let ratedMoviesCount = 0;
    const minRatingsRequired = 10;
    const baseUrl = "https://image.tmdb.org/t/p/original/";

    // Ir a la sección de películas
    goToMoviesBtn.addEventListener('click', function() {
        console.log("Botón presionado");
        resultsSection.classList.add('hidden');
        moviesSection.classList.remove('hidden');
        loadMovies();
    });

    // Cargar películas desde la API
    function loadMovies() {
        // Mostrar mensaje de carga
        moviesGrid.innerHTML = '<div class="loading-message">Cargando películas...</div>';
        
        // Obtener los ratings existentes del usuario
        fetch(`http://localhost:8000/api/ratings/${currentUserId}`)
            .then(response => response.json())
            .then(data => {
                // Guardar ratings existentes
                data.ratings.forEach(rating => {
                    userRatings[rating.movieId] = rating.rating;
                });
                ratedMoviesCount = data.ratings.length;
                
                // Actualizar contador y barra de progreso
                updateRatingsProgress();
                
                // Cargar lista de películas
                return fetch('http://localhost:8000/api/movies');
            })
            .then(response => response.json())
            .then(data => {
                // Limpiar el grid
                moviesGrid.innerHTML = '';
                
                // Iterar sobre las películas y crear elementos
                data.movies.forEach(movie => {
                    const movieCard = document.createElement('div');
                    movieCard.className = 'movie-card';
                    if (userRatings[movie.movieId]) {
                        movieCard.classList.add('rated');
                    }
                    
                    // URL Base
                    const posterPath = movie.poster_path || '/placeholder.jpg';
                    
                    movieCard.innerHTML = `
                        <div class="movie-poster">
                        
                            <img src="${baseUrl}${posterPath}" alt="${movie.title}">
                            ${userRatings[movie.movieId] ? 
                                `<div class="rating-badge">${userRatings[movie.movieId]}★</div>` : ''}
                        </div>
                        <div class="movie-title">${movie.title}</div>
                    `;
                    
                    // Agregar evento click a la tarjeta para ir a la pantalla individual
                    movieCard.addEventListener('click', () => {
                        showSingleMovie(movie);
                    });
                    
                    moviesGrid.appendChild(movieCard);
                });
            })
            .catch(error => {
                moviesGrid.innerHTML = `<div class="error-message">Error al cargar películas: ${error.message}</div>`;
            });
    }

    // Mostrar pantalla de película individual
    function showSingleMovie(movie) {
        selectedMovieId = movie.movieId;
        selectedRating = userRatings[movie.movieId] || null;
        
        // Configurar pantalla
        singleMovieTitle.textContent = movie.title;
        singleMoviePoster.src = baseUrl + movie.poster_path || '/placeholder.jpg';
        
        // Resetear estrellas
        singleMovieStars.forEach(star => {
            const rating = parseInt(star.dataset.rating);
            if (selectedRating && rating <= selectedRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // Mostrar sección individual y ocultar grid de películas
        moviesSection.classList.add('hidden');
        singleMovieSection.classList.remove('hidden');
    }

    // Manejar eventos de calificación con estrellas en la pantalla individual
    singleMovieStars.forEach(star => {
        // Hover sobre estrellas
        star.addEventListener('mouseover', function() {
            const hoverRating = parseInt(this.dataset.rating);
            singleMovieStars.forEach(s => {
                const rating = parseInt(s.dataset.rating);
                if (rating <= hoverRating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
        
        // Salir del hover
        star.addEventListener('mouseout', function() {
            singleMovieStars.forEach(s => s.classList.remove('hover'));
        });
        
        // Clic en una estrella
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            singleMovieStars.forEach(s => {
                const rating = parseInt(s.dataset.rating);
                if (rating <= selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Guardar calificación y volver a la lista de películas
    saveMovieRatingBtn.addEventListener('click', function() {
        if (!selectedRating) {
            showMessage(singleMovieSection, 'Por favor selecciona una calificación', 'error');
            return;
        }
        
        // Enviar calificación al backend
        fetch('http://localhost:8000/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUserId,
                movieId: selectedMovieId,
                rating: selectedRating
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.detail || 'Error al guardar calificación');
                });
            }
            return response.json();
        })
        .then(data => {
            // Actualizar rating local
            const isNewRating = !userRatings[selectedMovieId];
            userRatings[selectedMovieId] = selectedRating;
            
            // Incrementar contador si es una nueva calificación
            if (isNewRating) {
                ratedMoviesCount++;
                updateRatingsProgress();
            }
            
            // Mostrar mensaje de éxito
            showMessage(singleMovieSection, 'Calificación guardada con éxito', 'success');
            
            // Volver a la pantalla de películas después de un breve retraso
            setTimeout(() => {
                singleMovieSection.classList.add('hidden');
                moviesSection.classList.remove('hidden');
                // Recargar películas para actualizar la visualización
                loadMovies();
            }, 1000);
        })
        .catch(error => {
            showMessage(singleMovieSection, error.message, 'error');
        });
    });

    // Volver a la lista de películas sin guardar
    backToMoviesBtn.addEventListener('click', function() {
        singleMovieSection.classList.add('hidden');
        moviesSection.classList.remove('hidden');
    });

    // Actualizar barra de progreso y contador de calificaciones
    function updateRatingsProgress() {
        ratingsCount.textContent = ratedMoviesCount;
        const progress = Math.min((ratedMoviesCount / minRatingsRequired) * 100, 100);
        ratingsProgressBar.style.width = `${progress}%`;
        
        // Habilitar/deshabilitar botón de finalizar
        if (ratedMoviesCount >= minRatingsRequired) {
            finishRatingsBtn.removeAttribute('disabled');
        } else {
            finishRatingsBtn.setAttribute('disabled', 'disabled');
        }
    }

    // Finalizar proceso de calificación
    finishRatingsBtn.addEventListener('click', function() {
        completionModal.classList.remove('hidden');
        moviesSection.classList.add('hidden');
        resultsSection.classList.add('hidden');
    });

    // Aceptar en el modal de finalización
    completionOkBtn.addEventListener('click', function() {
        completionModal.classList.remove('hidden');
        moviesSection.classList.add('hidden');
        resultsSection.classList.add('hidden');
    });

    // Cerrar modales al hacer clic fuera de ellos
    window.addEventListener('click', function(event) {
        if (event.target === completionModal) {
            completionModal.classList.add('hidden');
        }
    });

});
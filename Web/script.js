document.addEventListener('DOMContentLoaded', function() {
    // Referencias a secciones
    const registrationSection = document.getElementById('registration-section');
    const testIntroSection = document.getElementById('test-intro-section');
    const testSection = document.getElementById('test-section');
    const resultsSection = document.getElementById('results-section');
    
    // Referencias a elementos DOM
    const registrationForm = document.getElementById('registration-form');
    const startTestBtn = document.getElementById('start-test-btn');
    const restartBtn = document.getElementById('restart-btn');
    const saveBtn = document.getElementById('save-btn');
    const questionText = document.getElementById('question-text');
    const currentQuestionSpan = document.getElementById('current-question');
    const progressBar = document.getElementById('progress-bar');
    const optionBtns = document.querySelectorAll('.option-btn');
    
    // Variables globales
    let currentUserId = null;
    let currentQuestionIndex = 0;
    let responses = {};
    
    // Definición de las preguntas del test
    const questions = [
        // Apertura (Openness)
        { id: 'o1', text: "Me considero una persona con mucha imaginación.", trait: "openness" },
        { id: 'o2', text: "Me interesan temas abstractos o filosóficos.", trait: "openness" },
        { id: 'o3', text: "Disfruto experimentando cosas nuevas.", trait: "openness" },
        { id: 'o4', text: "Soy curioso/a acerca de diferentes temas.", trait: "openness" },
        
        // Responsabilidad (Conscientiousness)
        { id: 'c1', text: "Soy una persona organizada.", trait: "conscientiousness" },
        { id: 'c2', text: "Presto atención a los detalles.", trait: "conscientiousness" },
        { id: 'c3', text: "Termino lo que empiezo.", trait: "conscientiousness" },
        { id: 'c4', text: "Planifico antes de actuar.", trait: "conscientiousness" },
        
        // Extraversión (Extraversion)
        { id: 'e1', text: "Me siento cómodo/a en situaciones sociales.", trait: "extraversion" },
        { id: 'e2', text: "Disfruto siendo el centro de atención.", trait: "extraversion" },
        { id: 'e3', text: "Inicio conversaciones con facilidad.", trait: "extraversion" },
        { id: 'e4', text: "Tengo mucha energía social.", trait: "extraversion" },
        
        // Amabilidad (Agreeableness)
        { id: 'a1', text: "Me preocupo por los demás.", trait: "agreeableness" },
        { id: 'a2', text: "Soy empático/a con los sentimientos ajenos.", trait: "agreeableness" },
        { id: 'a3', text: "Disfruto cooperando con otros.", trait: "agreeableness" },
        { id: 'a4', text: "Confío en las personas.", trait: "agreeableness" },
        
        // Neuroticismo (Neuroticism)
        { id: 'n1', text: "Me estreso con facilidad.", trait: "neuroticism" },
        { id: 'n2', text: "Me preocupo por muchas cosas.", trait: "neuroticism" },
        { id: 'n3', text: "Mis emociones cambian con frecuencia.", trait: "neuroticism" },
        { id: 'n4', text: "Me siento inseguro/a con frecuencia.", trait: "neuroticism" }
    ];
    
    // Manejar registro de usuario
    registrationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value;
        
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
                username: username
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
                responses[questions[currentQuestionIndex].id] = value;
                
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
    
    // Reiniciar test (volver a la pantalla de registro)
    restartBtn.addEventListener('click', function() {
        // Reiniciar formularios
        registrationForm.reset();
        
        // Reiniciar variables
        currentUserId = null;
        currentQuestionIndex = 0;
        responses = {};
        
        // Volver a la sección de registro
        resultsSection.classList.add('hidden');
        testSection.classList.add('hidden');
        testIntroSection.classList.add('hidden');
        registrationSection.classList.remove('hidden');
        
        // Eliminar mensajes de error/éxito previos
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(message => message.remove());
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

    // Referencias a elementos del modal de calificación
    const ratingModal = document.getElementById('rating-modal');
    const movieTitle = document.getElementById('movie-title');
    const moviePoster = document.getElementById('movie-poster');
    const stars = document.querySelectorAll('.star');
    const saveRatingBtn = document.getElementById('save-rating-btn');
    const cancelRatingBtn = document.getElementById('cancel-rating-btn');
    const closeModal = document.querySelector('.close-modal');
    const baseUrl = "https://image.tmdb.org/t/p/original/";

    // Referencias al modal de finalización
    const completionModal = document.getElementById('completion-modal');
    const completionOkBtn = document.getElementById('completion-ok-btn');

    // Variables para el sistema de calificación
    let selectedMovieId = null;
    let selectedRating = null;
    let userRatings = {};
    let ratedMoviesCount = 0;
    const minRatingsRequired = 10;

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
                    
                    // Agregar evento click a la tarjeta
                    movieCard.addEventListener('click', () => {
                        openRatingModal(movie);
                    });
                    
                    moviesGrid.appendChild(movieCard);
                });
            })
            .catch(error => {
                moviesGrid.innerHTML = `<div class="error-message">Error al cargar películas: ${error.message}</div>`;
            });
    }

    // Abrir modal para calificar película
    function openRatingModal(movie) {
        selectedMovieId = movie.movieId;
        selectedRating = userRatings[movie.movieId] || null;
        
        // Configurar modal
        movieTitle.textContent = movie.title;
        moviePoster.src = baseUrl + movie.poster_path || '/placeholder.jpg';
        
        // Resetear estrellas
        stars.forEach(star => {
            const rating = parseInt(star.dataset.rating);
            if (selectedRating && rating <= selectedRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // Mostrar modal
        ratingModal.classList.remove('hidden');
    }

    // Manejar eventos de calificación con estrellas
    stars.forEach(star => {
        // Hover sobre estrellas
        star.addEventListener('mouseover', function() {
            const hoverRating = parseInt(this.dataset.rating);
            stars.forEach(s => {
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
            stars.forEach(s => s.classList.remove('hover'));
        });
        
        // Clic en una estrella
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            stars.forEach(s => {
                const rating = parseInt(s.dataset.rating);
                if (rating <= selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Guardar calificación
    saveRatingBtn.addEventListener('click', function() {
        if (!selectedRating) {
            showMessage(ratingModal.querySelector('.modal-content'), 'Por favor selecciona una calificación', 'error');
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
            
            // Cerrar modal y recargar películas
            closeRatingModal();
            loadMovies();
        })
        .catch(error => {
            showMessage(ratingModal.querySelector('.modal-content'), error.message, 'error');
        });
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

    // Cerrar modal de calificación
    function closeRatingModal() {
        ratingModal.classList.add('hidden');
        selectedMovieId = null;
        selectedRating = null;
    }

    // Eventos para cerrar el modal
    cancelRatingBtn.addEventListener('click', closeRatingModal);
    closeModal.addEventListener('click', closeRatingModal);

    // Finalizar proceso de calificación
    finishRatingsBtn.addEventListener('click', function() {
        completionModal.classList.remove('hidden');
    });

    // Aceptar en el modal de finalización
    completionOkBtn.addEventListener('click', function() {
        completionModal.classList.add('hidden');
        // Aquí podrías redirigir a otra página o mostrar recomendaciones
        // Por ahora, volvemos a la sección de resultados
        moviesSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
    });

    // Cerrar modales al hacer clic fuera de ellos
    window.addEventListener('click', function(event) {
        if (event.target === ratingModal) {
            closeRatingModal();
        }
        if (event.target === completionModal) {
            completionModal.classList.add('hidden');
        }
    });

});
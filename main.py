from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import psycopg2
from psycopg2 import Error
from psycopg2.extras import RealDictCursor
import re
from dotenv import load_dotenv
import os

# Cargar las variables de entorno del archivo .env
load_dotenv()

# Creamos la aplicación FastAPI
app = FastAPI(title="Sistema de Recomendación - Big Five Personality Test")

# Configuramos CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos para validar los datos
class UserRegistration(BaseModel):
    email: EmailStr
    username: str
    gender: str
    age: int

class PersonalityResult(BaseModel):
    userId: int
    openness: float
    conscientiousness: float
    extraversion: float
    agreeableness: float
    neuroticism: float

class MovieRating(BaseModel):
    userId: int
    movieId: int
    rating: int = Field(..., ge=1, le=5)  # Rating debe estar entre 1 y 5

# Obtener la URL de conexión desde las variables de entorno
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        connection = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        return connection
    except Error as e:
        print(f"Error conectando a PostgreSQL: {e}")
        return None

# Verifica que el email y username sean válidos
def validate_user_data(user: UserRegistration):
    # Verifica que el nombre de usuario cumpla con ciertos requisitos
    if not re.match(r'^[a-zA-Z0-9_]{3,30}$', user.username):
        raise HTTPException(
            status_code=400, 
            detail="El nombre de usuario debe tener entre 3 y 30 caracteres alfanuméricos o guiones bajos"
        )
    
    # Email ya se valida con EmailStr de pydantic
    return True

# Ruta para registrar un nuevo usuario
@app.post("/api/users", status_code=201)
async def register_user(user: UserRegistration):
    # Validar datos de usuario
    validate_user_data(user)
    
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor()
        
        # Verificar si el email ya está registrado
        cursor.execute("SELECT userid FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este email ya está registrado")
        
        # Verificar si el nombre de usuario ya está registrado
        cursor.execute("SELECT userid FROM users WHERE username = %s", (user.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este nombre de usuario ya está registrado")
        
        # Insertar el nuevo usuario y obtener el ID generado
        cursor.execute(
            "INSERT INTO users (email, username, gender, age) VALUES (%s, %s, %s, %s) RETURNING userid",
            (user.email, user.username, user.gender, user.age)
        )
        user_id = cursor.fetchone()[0]
        connection.commit()
        
        return {"message": "Usuario registrado con éxito", "userId": user_id}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar usuario: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Ruta para guardar resultados del test de personalidad
@app.post("/api/personalities", status_code=201)
async def save_personality(result: PersonalityResult):
    # Validar que los valores estén en el rango correcto (1.0 - 5.0)
    for trait, value in result.dict().items():
        if trait != 'userId' and (value < 1.0 or value > 5.0):
            raise HTTPException(
                status_code=400, 
                detail=f"El valor de {trait} debe estar entre 1.0 y 5.0"
            )
    
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor()
        
        # Verificar que el usuario existe
        print(result.userId,)
        cursor.execute("SELECT userid FROM users WHERE userid = %s", (result.userId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Verificar si ya existe un registro de personalidad para este usuario
        cursor.execute("SELECT userid FROM personalities WHERE userid = %s", (result.userId,))
        if cursor.fetchone():
            # Actualizar el registro existente
            query = """
            UPDATE personalities 
            SET openness = %s, conscientiousness = %s, extraversion = %s, 
                agreeableness = %s, neuroticism = %s
            WHERE userid = %s
            """
            cursor.execute(
                query, 
                (
                    result.openness, 
                    result.conscientiousness, 
                    result.extraversion, 
                    result.agreeableness, 
                    result.neuroticism, 
                    result.userId
                )
            )
        else:
            # Insertar nuevo registro
            query = """
            INSERT INTO personalities 
            (userid, openness, conscientiousness, extraversion, agreeableness, neuroticism)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                query, 
                (
                    result.userId, 
                    result.openness, 
                    result.conscientiousness, 
                    result.extraversion, 
                    result.agreeableness, 
                    result.neuroticism
                )
            )
        
        connection.commit()
        return {"message": "Resultados de personalidad guardados con éxito"}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar resultados: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Ruta para obtener los datos de un usuario específico
@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        # Usamos RealDictCursor para obtener los resultados como diccionarios
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Obtener datos del usuario
        cursor.execute("SELECT userid, email, username FROM users WHERE userid = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Obtener datos de personalidad si existen
        cursor.execute("SELECT * FROM personalities WHERE userid = %s", (user_id,))
        personality = cursor.fetchone()
        
        # Combinar los resultados
        if personality:
            # Eliminar userId duplicado
            del personality['userid']
            # Para mantener consistencia con el frontend, renombramos la clave
            user['userId'] = user['userid']
            del user['userid']
            user['personality'] = dict(personality)
        else:
            # Para mantener consistencia con el frontend, renombramos la clave
            user['userId'] = user['userid']
            del user['userid']
            user['personality'] = None
            
        return dict(user)
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Ruta para obtener todas las películas
@app.get("/api/movies")
async def get_all_movies():
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Obtener todas las películas
        cursor.execute("SELECT movieid, title, poster_path FROM top_films")
        movies = cursor.fetchall()
        
        if not movies:
            return {"movies": []}
            
        # Asegurar que los nombres de campo sean consistentes con el frontend
        processed_movies = []
        for movie in movies:
            processed_movie = dict(movie)
            processed_movie['movieId'] = processed_movie['movieid']
            del processed_movie['movieid']
            processed_movies.append(processed_movie)
            
        return {"movies": processed_movies}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener películas: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Ruta para calificar una película
@app.post("/api/ratings", status_code=201)
async def rate_movie(rating: MovieRating):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor()
        
        # Verificar que el usuario existe
        cursor.execute("SELECT userid FROM users WHERE userid = %s", (rating.userId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Verificar que la película existe
        cursor.execute("SELECT movieid FROM top_films WHERE movieid = %s", (rating.movieId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Película no encontrada")
        
        # Verificar si ya existe un rating para esta película y usuario
        cursor.execute(
            "SELECT userid FROM ratings WHERE userid = %s AND movieid = %s", 
            (rating.userId, rating.movieId)
        )
        if cursor.fetchone():
            # Actualizar el rating existente
            cursor.execute(
                "UPDATE ratings SET rating = %s WHERE userid = %s AND movieid = %s",
                (rating.rating, rating.userId, rating.movieId)
            )
            message = "Rating actualizado con éxito"
        else:
            # Insertar nuevo rating
            cursor.execute(
                "INSERT INTO ratings (userid, movieid, rating) VALUES (%s, %s, %s)",
                (rating.userId, rating.movieId, rating.rating)
            )
            message = "Rating guardado con éxito"
        
        connection.commit()
        return {"message": message}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar rating: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Ruta para obtener los ratings de un usuario
@app.get("/api/ratings/{user_id}")
async def get_user_ratings(user_id: int):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que el usuario existe
        cursor.execute("SELECT userid FROM users WHERE userid = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Obtener todos los ratings del usuario
        cursor.execute(
            "SELECT r.movieid, r.rating, f.title FROM ratings r JOIN top_films f ON r.movieid = f.movieid WHERE r.userid = %s", 
            (user_id,)
        )
        ratings = cursor.fetchall()
        
        # Asegurar que los nombres de campo sean consistentes con el frontend
        processed_ratings = []
        for rating in ratings:
            processed_rating = dict(rating)
            processed_rating['movieId'] = processed_rating['movieid']
            del processed_rating['movieid']
            processed_ratings.append(processed_rating)
        
        return {"ratings": processed_ratings, "count": len(ratings)}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ratings: {str(e)}")
    
    finally:
        if connection:
            cursor.close()
            connection.close()

# Iniciar con: uvicorn main:app --reload
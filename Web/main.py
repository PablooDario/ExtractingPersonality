# main.py - Backend con FastAPI
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict
import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime
import re

# Creamos la aplicación FastAPI
app = FastAPI(title="Sistema de Recomendación - Big Five Personality Test")

# Configuramos CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica los dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos para validar los datos
class UserRegistration(BaseModel):
    email: EmailStr
    username: str

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

# Configuración de la base de datos
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "KurapikaCarti",
    "database": "recommender_system"
}

# Función para conectar a la base de datos
def get_db_connection():
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
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
        cursor.execute("SELECT userId FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este email ya está registrado")
        
        # Verificar si el nombre de usuario ya está registrado
        cursor.execute("SELECT userId FROM users WHERE username = %s", (user.username,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Este nombre de usuario ya está registrado")
        
        # Insertar el nuevo usuario
        cursor.execute(
            "INSERT INTO users (email, username) VALUES (%s, %s)",
            (user.email, user.username)
        )
        connection.commit()
        
        # Obtener el ID del usuario recién creado
        user_id = cursor.lastrowid
        
        return {"message": "Usuario registrado con éxito", "userId": user_id}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar usuario: {str(e)}")
    
    finally:
        if connection.is_connected():
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
        cursor.execute("SELECT userId FROM users WHERE userId = %s", (result.userId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Verificar si ya existe un registro de personalidad para este usuario
        cursor.execute("SELECT userId FROM personalities WHERE userId = %s", (result.userId,))
        if cursor.fetchone():
            # Actualizar el registro existente
            query = """
            UPDATE personalities 
            SET openness = %s, conscientiousness = %s, extraversion = %s, 
                agreeableness = %s, neuroticism = %s
            WHERE userId = %s
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
            (userId, openness, conscientiousness, extraversion, agreeableness, neuroticism)
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
        if connection.is_connected():
            cursor.close()
            connection.close()

# Ruta para obtener los datos de un usuario específico
@app.get("/api/users/{user_id}")
async def get_user(user_id: int):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener datos del usuario
        cursor.execute("SELECT userId, email, username FROM users WHERE userId = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Obtener datos de personalidad si existen
        cursor.execute("SELECT * FROM personalities WHERE userId = %s", (user_id,))
        personality = cursor.fetchone()
        
        # Combinar los resultados
        if personality:
            # Eliminar userId duplicado
            del personality['userId']
            user['personality'] = personality
        else:
            user['personality'] = None
            
        return user
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos: {str(e)}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Ruta para obtener todas las películas
@app.get("/api/movies")
async def get_all_movies():
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Obtener todas las películas
        cursor.execute("SELECT movieId, title, tagline, poster_path FROM top_films")
        movies = cursor.fetchall()
        
        if not movies:
            return {"movies": []}
            
        return {"movies": movies}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener películas: {str(e)}")
    
    finally:
        if connection.is_connected():
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
        cursor.execute("SELECT userId FROM users WHERE userId = %s", (rating.userId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Verificar que la película existe
        cursor.execute("SELECT movieId FROM top_films WHERE movieId = %s", (rating.movieId,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Película no encontrada")
        
        # Verificar si ya existe un rating para esta película y usuario
        cursor.execute(
            "SELECT userId FROM ratings WHERE userId = %s AND movieId = %s", 
            (rating.userId, rating.movieId)
        )
        if cursor.fetchone():
            # Actualizar el rating existente
            cursor.execute(
                "UPDATE ratings SET rating = %s WHERE userId = %s AND movieId = %s",
                (rating.rating, rating.userId, rating.movieId)
            )
            message = "Rating actualizado con éxito"
        else:
            # Insertar nuevo rating
            cursor.execute(
                "INSERT INTO ratings (userId, movieId, rating) VALUES (%s, %s, %s)",
                (rating.userId, rating.movieId, rating.rating)
            )
            message = "Rating guardado con éxito"
        
        connection.commit()
        return {"message": message}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar rating: {str(e)}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Ruta para obtener los ratings de un usuario
@app.get("/api/ratings/{user_id}")
async def get_user_ratings(user_id: int):
    connection = get_db_connection()
    if not connection:
        raise HTTPException(status_code=500, detail="Error conectando a la base de datos")
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        # Verificar que el usuario existe
        cursor.execute("SELECT userId FROM users WHERE userId = %s", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Obtener todos los ratings del usuario
        cursor.execute(
            "SELECT r.movieId, r.rating, f.title FROM ratings r JOIN top_films f ON r.movieId = f.movieId WHERE r.userId = %s", 
            (user_id,)
        )
        ratings = cursor.fetchall()
        
        return {"ratings": ratings, "count": len(ratings)}
    
    except Error as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ratings: {str(e)}")
    
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

# Iniciar con: uvicorn main:app --reload
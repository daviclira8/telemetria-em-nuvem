from datetime import date
#Teste
import traceback
from fastapi.responses import JSONResponse
from fastapi.requests import Request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .database import engine

app = FastAPI(title="Telemetria API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Measurement(BaseModel):
    id_sessao: int
    time: int = Field(ge=0)
    speed: float
    motor_temp: float
    tensao: float | None = None
    accel: float


class SessionCreate(BaseModel):
    nome_teste: str
    id_car: int
    data_teste: date
    descricao: str | None = None

@app.get("/api")
def home():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

    return {
        "message": "API e PostgreSQL funcionando!",
        "database_test": result.scalar()
    }

@app.post("/api/sessions")
def create_session(session: SessionCreate):
    sql = text("""
        INSERT INTO sessoes_teste
        (nome_teste, id_car, data_teste, descricao)
        VALUES
        (:nome_teste, :id_car, :data_teste, :descricao)
        RETURNING id_sessao
    """)

    try:
        with engine.begin() as connection:
            result = connection.execute(
                sql,
                {
                    "nome_teste": session.nome_teste,
                    "id_car": session.id_car,
                    "data_teste": session.data_teste,
                    "descricao": session.descricao
                }
            )

            id_sessao = result.scalar_one()

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail=(
                "O nome do teste já existe "
                "ou o veículo informado não existe."
            )
        )

    return {
        "message": "Sessão criada com sucesso!",
        "id_sessao": id_sessao
    }

@app.post("/api/measurements")
def create_measurement(measurement: Measurement):
    sql = text("""
        INSERT INTO telemetria_motor
        (id_sessao, time, speed, motor_temp, tensao, accel)
        VALUES
        (:id_sessao, :time, :speed, :motor_temp, :tensao, :accel)
    """)

    try:
        with engine.begin() as connection:
            connection.execute(
                sql,
                {
                    "id_sessao": measurement.id_sessao,
                    "time": measurement.time,
                    "speed": measurement.speed,
                    "motor_temp": measurement.motor_temp,
                    "tensao": measurement.tensao,
                    "accel": measurement.accel
                }
            )

    except IntegrityError:
        raise HTTPException(
            status_code=409,
            detail=(
                "Não foi possível inserir a medição. "
                "Verifique se a sessão existe e se já há uma "
                "medição com esse tempo para ela."
            )
        )

    return {
        "message": "Medição armazenada com sucesso!",
        "data": measurement
    }

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        },
    )
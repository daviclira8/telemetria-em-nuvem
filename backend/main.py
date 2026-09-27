from datetime import date                    # Importa datas
#Teste
import traceback                             # Importa ferramentas de rastreio e formatação de erros
from fastapi.responses import JSONResponse   # Importa retorno de respostas personalizadas em JSON
from fastapi.requests import Request         # Importa a representação das requisições HTTP

from fastapi import FastAPI, HTTPException          # Importa o framework FastAPI e o disparo de exceções/erros HTTP
from fastapi.middleware.cors import CORSMiddleware  # Importa o middleware para gerenciar permissões de CORS
from pydantic import BaseModel, Field               # Importa as classes do Pydantic para criar e validar esquemas de dados
from sqlalchemy import text                         # Importa a função para executar comandos SQL em texto
from sqlalchemy.exc import IntegrityError           # Importa a exceção para capturar violações de restrições no BD

from .database import engine  # Importa o motor de conexão com o BD configurado localmente

app = FastAPI(title="Telemetria API")  # Inicializa a instância principal da aplicação da API com um título

app.add_middleware(                    # Regras de segurança e origens permitidas para requisições externas na API
    CORSMiddleware,
    allow_origins=[                    # Lista de URLs e portas do frontend com permissão para se comunicar com a API
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=False,          # Desativa o envio de credenciais via CORS
    allow_methods=["*"],              # Permite todos os métodos HTTP
    allow_headers=["*"],              # Permite todos os cabeçalhos HTTP
)

class Measurement(BaseModel):          # Modelo de validação
    id_sessao: int                     # ID da sessão = inteiro
    time: int = Field(ge=0)            # tempo do teste = inteiro >=0
    speed: float                       # Velocidade = decimal
    motor_temp: float                  # temperatura do motor = decimal
    tensao: float | None = None        # tensão = decimal ou nula
    accel: float                       # aceleração = decimal


class SessionCreate(BaseModel):          # modelo de validação para a sessão de teste
    nome_teste: str                      # nome do teste = texto
    id_car: int                          # ID do veículo = inteiro
    data_teste: date                     # data do teste
    descricao: str | None = None         # descrição da sessão) como opcional

@app.get("/api")                                       # Define rota HTTP GET no endereço raiz '/api' para testes de funcionamento
def home():
    with engine.connect() as connection:               # Abre conexão temporária com o banco de dados
        result = connection.execute(text("SELECT 1"))  # Executa uma consulta para testar a comunicação com o banco

    return {                                           # Resposta em JSON confirmando o sucesso da API e o teste do banco
        "message": "API e PostgreSQL funcionando!",
        "database_test": result.scalar()
    }

@app.post("/api/sessions")                             # Rota HTTP POST para receber e cadastrar sessões de teste
def create_session(session: SessionCreate):
    sql = text("""                                     # Escreve o comando SQL para inserir uma nova sessão e retornar o ID gerado automaticamente
        INSERT INTO sessoes_teste
        (nome_teste, id_car, data_teste, descricao)
        VALUES
        (:nome_teste, :id_car, :data_teste, :descricao)
        RETURNING id_sessao
    """)

    try:                                      # Tenta executar a transação com segurança no banco de dados
        with engine.begin() as connection:
            result = connection.execute(      # Executa a query SQL injetando os dados validados enviados pelo cliente
                sql,
                {
                    "nome_teste": session.nome_teste,
                    "id_car": session.id_car,
                    "data_teste": session.data_teste,
                    "descricao": session.descricao
                }
            )

            id_sessao = result.scalar_one()          # Captura o ID da sessão recém-criada

    except IntegrityError:                           # Captura erros caso ocorra violação de unicidade ou chave estrangeira no banco
        raise HTTPException(
            status_code=409,                         # Retorna o código de status HTTP 409 (Conflito).
            detail=(                                 # Mensagem explicando o erro
                "O nome do teste já existe "
                "ou o veículo informado não existe."
            )
        )

    return {              # Mensagem de sucesso + ID da sessão criada
        "message": "Sessão criada com sucesso!",
        "id_sessao": id_sessao
    }

@app.post("/api/measurements")                  # Rota HTTP POST para registrar novas medições de telemetria do motor
def create_measurement(measurement: Measurement):
    sql = text("""                              # Comando SQL para inserir os dados na tabela correspondente
        INSERT INTO telemetria_motor
        (id_sessao, time, speed, motor_temp, tensao, accel)
        VALUES
        (:id_sessao, :time, :speed, :motor_temp, :tensao, :accel)
    """)

    try:                             # Tenta inserir a medição no banco
        with engine.begin() as connection:
            connection.execute(      # Comando SQL preenchendo os parâmetros com os dados validados
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

    except IntegrityError:              # Trata de falhas de integridade do banco (como sessão inexistente ou tempo duplicado)
        raise HTTPException(
            status_code=409,            # Código HTTP 409 indicando conflito de dados
            detail=(
                "Não foi possível inserir a medição. "
                "Verifique se a sessão existe e se já há uma "
                "medição com esse tempo para ela."
            )
        )

    return {                          # Confirmação de que os dados foram armazenados
        "message": "Medição armazenada com sucesso!",
        "data": measurement
    }

@app.exception_handler(Exception)              # Manipulador global de exceções para capturar erros não tratados na API
async def debug_exception_handler(request: Request, exc: Exception):
    return JSONResponse(                       # Resposta HTTP 500 formatada c/ detalhes técnicos + rastreio do erro (traceback)
        status_code=500,
        content={
            "detail": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        },
    )

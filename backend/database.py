import os # Importa o módulo so SO para interagir com o ambiente

from dotenv import load_dotenv # Importa a função p/ carregar variáveis de ambiente de um arquivo .env
from sqlalchemy import create_engine # Importa a função do SQLAlchemy para criar o motor de conexão com o BD (banco de dados)
from sqlalchemy.orm import sessionmaker # Importa o gerador de sessões para interagir com as tabelas (via ORM)


load_dotenv() # Carrega as variáveis do .env para a memória da aplicação

DATABASE_URL = os.getenv("DATABASE_URL") # Recupera a string de conexão do BD

engine = create_engine(DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")) # Cria a conexão ajustando o protocolo para o driver 'psycopg2' do PostgreSQL

SessionLocal = sessionmaker(  # Configura a fábrica de sessões p/ as transações com o banco.
    autocommit=False,  # As alterações precisam de um commit explícito  para serem salvas
    autoflush=False,  # Evita que o SQLAlchemy mande alterações para o BD antes de uma consulta ou commit
    bind=engine  # Vincula a fábrica de sessões ao motor de conexão criado
)

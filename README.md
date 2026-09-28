# ☁️ Plataforma de Telemetria em Nuvem

## 📌 Sobre o projeto

Este projeto consiste no desenvolvimento de uma plataforma full-stack de registro, armazenamento e análise de dados de telemetria utilizando computação em nuvem.

A proposta é permitir que dados reais obtidos durante testes de um veículo ou sistema experimental sejam inseridos na plataforma, armazenados de forma centralizada e posteriormente analisados e comparados entre diferentes sessões de teste.

Esta arquitetura foi desenhada para integrar uma interface web em **HTML/JS puro**, um servidor em **FastAPI (Python)** e um banco de dados relacional **PostgreSQL**. Assim, permitindo que os dados de testes de desempenho de veículos sejam inseridos, validados, armazenados e comparados entre si em um dashboard interativo.

Dessa forma, o projeto tem como foco principal demonstrar como a computação em nuvem pode solucionar problemas relacionados ao armazenamento, acesso, organização e análise de dados de telemetria.

---

## 🏗️ Arquitetura Integrada do Sistema

O fluxo de dados da aplicação ocorre através da seguinte integração:
```
[ Navegador / Frontend (HTML/JS) ] 
       |  (Requisições HTTP POST/GET com JSON)
       V
[ Servidor FastAPI (backend/main.py) ] 
       |  (Validação de dados com Pydantic + Tratamento de Erros)
       V
[ Conexão & Driver (backend/database.py + .env) ] 
       |  (Pool de conexões via SQLAlchemy + psycopg2)
       V
[ Banco de Dados PostgreSQL (Tabelas: veiculos, sessoes_teste, telemetria_motor) ]
```
---

## 🎯 Objetivos

O projeto busca desenvolver uma solução capaz de:

- Registrar dados reais de telemetria;
- Organizar os dados por sessões de teste;
- Permitir acesso remoto aos dados;
- Manter um histórico dos testes realizados;
- Comparar dados de diferentes sessões;
- Gerar visualizações e gráficos;
- Identificar possíveis comportamentos anormais;

---

## ☁️ Por que utilizamos Computação em Nuvem?

A utilização da computação em nuvem é o principal diferencial do projeto.

Em uma solução totalmente local, os dados poderiam ficar armazenados em um único computador. Isso cria algumas limitações:

- Dependência de uma máquina específica;
- Dificuldade de acesso remoto;
- Dificuldade para compartilhar os dados;
- Limitações de armazenamento;
- Maior dificuldade para centralizar informações de vários testes.

A computação em nuvem permite que os dados sejam enviados para uma infraestrutura remota e centralizada, possibilitando que diferentes usuários e dispositivos tenham acesso às mesmas informações.

---

## 🧪 Obtenção e organização dos dados

Os dados serão obtidos a partir de medições reais realizadas durante os testes e inseridos no sistema pelo usuário. Entre os dados que poderão ser registrados temos velocidade, tensão, temperatura, tempo, aceleração dentre outros.

Cada conjunto de medições será associado a uma sessão de teste, permitindo posteriormente realizar comparações entre diferentes testes. Para evitar que os dados fiquem desorganizados, cada teste será registrado individualmente. Exemplo:

Teste 01
├── Data
├── Veículo
├── Descrição
└── Medições
    ├── Medição 1
    ├── Medição 2
    ├── Medição 3
    └── ...

Teste 02
├── Data
├── Veículo
├── Descrição
└── Medições
    ├── Medição 1
    ├── Medição 2
    └── ...

Essa organização permitirá comparar diferentes sessões e identificar alterações no comportamento do sistema.


---


## 🛠️ Tecnologias utilizadas

### Python: 

Será utilizado principalmente no backend e na manipulação dos dados, na comunicação com a API e no processamento de dados.

### FastAPI

O FastAPI será utilizado para desenvolver a API responsável pela comunicação entre a interface e o banco de dados. A API receberá os dados enviados pelo usuário, validará as informações e realizará o armazenamento no banco de dados.

### PostgreSQL

O PostgreSQL será utilizado como banco de dados da aplicação. Ele será responsável por armazenar informações das sessões de teste, data e horário das medições, dados de velocidade, temperatura, tensão, aceleração, dentre outros quesitos que podem ser adicionados pelo usuário. 

### HTML, CSS e JS

O frontend será responsável pela interação com o usuário. HTML é responsável pela estrutura das páginas e formulários. CSS é responsável pela organização visual e apresentação da aplicação. JavaScript é responsável por: enviar dados para a API, consultar informações, atualizar o dashboard, construir gráficos e realizar comparações.


---


## 🛠️ Abordagem técnica do código

### 1. Camada de configuração e conexão (`backend/database.py`)

Responsável por estabelecer a ponte segura com o banco de dados PostgreSQL:
* Carrega as credenciais sensíveis isoladas no arquivo `.env` utilizando a biblioteca `python-dotenv`;
* Configura o motor de conexão adaptando a URL para o driver otimizado do PostgreSQL;
* Instancia a fábrica de sessões controlando transações unitárias com `autocommit=False` para garantir a integridade dos dados inseridos.

### 2. API e rotas (`backend/main.py`)

O "cérebro" backend desenvolvido em FastAPI que gerencia os endpoints HTTP:
* O **CORS Middleware** faz o gerenciamento das permissões de acesso cruzado permitindo que o frontend local (portas `5500` do Live Server) ou ambientes de homologação interajam com a API;
* Os **modelos pydantic (`Measurement` e `SessionCreate`)** validam os tipos de dados recebidos antes de permitir a escrita no banco;
* Os **endpoints de gravação (`/api/sessions` e `/api/measurements`)** inserem os dados das sessões de teste e recuperam o ID gerado, amarrando cada linha de telemetria ao seu respectivo teste relacionalmente;
* O **tratamento de exceções** captura erros de integridade, retorna códigos HTTP padronizados e possui um manipulador de erros com depuração via `traceback`.

### 3. Ponte Serverless para Nuvem (`api/index.py`)

* É um ponto de entrada - `from backend.main import app` - para que o **Vercel** consiga localizar e executar a aplicação FastAPI sem grandes problemas.

### 4. Interface e Lógica (`frontend/index.html` e `script.js`)
* **Preservação do estado atual**: Utiliza o `localStorage` do navegador para manter o progresso do usuário persistido mesmo se a página for recarregada acidentalmente;
* **Cálculos dinâmicos**: Processa em tempo real a aceleração instantânea entre os intervalos de tempo e a distância percorrida por integração trapezoidal das velocidades;
* **Comunicação assíncrona**: Envia os blocos de testes validados para o backend através de requisições `fetch` estruturadas em JSON;
* **Renderização gráfica**: Gráficos analíticos dinâmicos otimizados via HTML5 Canvas e animações fluidas baseadas em vetores SVG para o velocímetro de velocidade média.

Para mais detalhes sobre a estrutura e funcionamento do código, é possível observar comentários por seção ou linha a linha nos códigos de API, Backend, Frontend e Banco de Dados.

---


### 📊 Dashboard

O dashboard será utilizado para transformar os dados armazenados em informações visualmente úteis. O usuário poderá selecionar uma sessão de teste e visualizar informações como velocidade máxima, temperatura máxima e média, tensão mínima, aceleração, evolução dos parâmetros ao longo do tempo, etc. 

Também será possível comparar diferentes sessões. Exemplo:

                             TESTE 01     TESTE 02 
                             
              Velocidade      82 km/h      91 km/h
              Temp. máxima    72 °C        78 °C
              Temp. média     61 °C        65 °C
              Tensão mínima   11,8 V       11,5 V

Além disso, poderão ser utilizados gráficos como:

- Velocidade × Tempo;
- Temperatura × Tempo;
- Tensão × Tempo;
- Aceleração × Tempo;
- Velocidade × Temperatura.

---

Desenvolvido por Vítor, Davi e Carmen, para o processo seletivo do PET ENG COMP UFC.

https://telemetria-veicular.vercel.app



-- Limpeza de estrutura (caso fique com dados sujos)
-- No postegre, quando inicializa e re-executa o código,
-- ele executa linha a linha, então ficariam tabelas duplicadas,
-- logo, com dados duplicados (porque também re-executaria os inserts)
DROP TABLE IF EXISTS telemetria_motor, sessoes_teste, veiculos CASCADE;

-- Infos do carro
-- Funciona como uma ficha técnica
CREATE TABLE veiculos ( 
    id_car SERIAL PRIMARY KEY,            -- chave primaria (obrigatoria, tem que ser unica)
    model VARCHAR(50) UNIQUE NOT NULL,    -- modelo do carro
    peso NUMERIC(6,2)                     -- peso (impacta na velocidade e na força do carro)
);

-- Tabela de Sessões de Teste
-- Organiza p/ Teste -> Data, Veículo, Descrição
CREATE TABLE sessoes_teste (
    id_sessao SERIAL PRIMARY KEY,                   -- chave primaria (obrigatoria, tem que ser unica)
    nome_teste VARCHAR(50) UNIQUE NOT NULL,         -- Ex: 'Teste 01', 'Teste 02'
    id_car INTEGER REFERENCES veiculos(id_car),     -- chave estrangeira (pra interligar duas tabelas relacionadas)
    data_teste DATE NOT NULL,                       -- data do teste
    descricao TEXT                                  -- descrição do teste (o que foi feito com/no carro)
);

-- Tabela de telemetria
-- Telemetria se liga à sessão, não ao carro
CREATE TABLE telemetria_motor (
    id_registro SERIAL PRIMARY KEY,                                -- chave primaria (obrigatoria, tem que ser unica)
    id_sessao INTEGER REFERENCES sessoes_teste(id_sessao),         -- chave estrangeira (pra interligar duas tabelas relacionadas)
    time INTEGER NOT NULL,         -- tempo de 1 a 4 segundos
    speed NUMERIC(5,2),            -- velocidade instantanea registrada 
    motor_temp NUMERIC(5,2),       -- temperatura do motor
    tensao NUMERIC(5,2),           -- tensão da bateria
    accel NUMERIC(5,2),            -- aceleração
    CONSTRAINT sessao_time_unico UNIQUE(id_sessao, time) 
);

-- Inserção de dois veículos diferentes
-- OPCIONAL - PODE APAGAR CASO QUEIRA INSERIR OS VEÍCULOS E ESTATÍSTICAS NA HORA DA APRESENTAÇÃO
INSERT INTO veiculos (model, peso) VALUES 
('Toyota Corolla XEI 2003', 1160.00),           -- dado 1
('Protótipo Elétrico Alpha', 310.50)            -- dado 2
ON CONFLICT (model) DO NOTHING;                 -- se esse modelo já tiver sido registrado antes, não faz nada

-- Inserção de duas sessões de teste (1 pra cada modelo)
-- OPCIONAL - PODE APAGAR CASO QUEIRA INSERIR OS VEÍCULOS E ESTATÍSTICAS NA HORA DA APRESENTAÇÃO
INSERT INTO sessoes_teste (nome_teste, id_car, data_teste, descricao) VALUES
('Teste 01', 1, '2026-09-21', 'Teste de arrancada em pista seca'),             -- id_sessao = 1, teste com corolla
('Teste 02', 2, '2026-09-22', 'Teste de arrancada em pista seca')              -- id_sessao = 2, teste com o eletrico aleatorio
ON CONFLICT (nome_teste) DO NOTHING;

-- Inserção das medições do teste com o Corolla (Teste 01 - id_sessao = 1)
-- OPCIONAL - PODE APAGAR CASO QUEIRA INSERIR OS VEÍCULOS E ESTATÍSTICAS NA HORA DA APRESENTAÇÃO
INSERT INTO telemetria_motor (id_sessao, time, speed, motor_temp, tensao, accel) 
VALUES 
(1, 1, 22.00, 61.00, 12.10, 6.10),    -- t=1
(1, 2, 43.00, 65.50, 11.90, 5.80),    -- t=2
(1, 3, 58.00, 72.00, 11.80, 4.32),    -- t=3
(1, 4, 70.00, 78.50, 11.50, 3.33)     -- t=4
ON CONFLICT (id_sessao, time) 
DO UPDATE SET 
    speed = EXCLUDED.speed,
    motor_temp = EXCLUDED.motor_temp,
    tensao = EXCLUDED.tensao,
    accel = EXCLUDED.accel;


-- Inserção das medições do teste com o Elétrico (Teste 02 - id_sessao = 2)
-- Fiz uma segunda sessão pra poder comparar modelos diferentes depois
-- OPCIONAL - PODE APAGAR CASO QUEIRA INSERIR OS VEÍCULOS E ESTATÍSTICAS NA HORA DA APRESENTAÇÃO
INSERT INTO telemetria_motor (id_sessao, time, speed, motor_temp, tensao, accel) 
VALUES 
(2, 1, 30.00, 62.00, 11.90, 7.10),    -- t=1
(2, 2, 55.00, 68.50, 11.70, 6.80),    -- t=2
(2, 3, 75.00, 75.00, 11.60, 5.32),    -- t=3 
(2, 4, 91.00, 80.50, 11.40, 4.33)     -- t=4 
ON CONFLICT (id_sessao, time) 
DO UPDATE SET 
    speed = EXCLUDED.speed,
    motor_temp = EXCLUDED.motor_temp,
    tensao = EXCLUDED.tensao,
    accel = EXCLUDED.accel;


-- Consulta 1
-- Gera uma tabela com o nome da sessão, a velocidade max que o carro atingiu,
-- a temperatura máxima, a temperatura média e a menor tensão
-- Agrupa de acordo com o nome da sessão (teste de arrancada...)
SELECT 
    s.nome_teste AS "Sessão",
    MAX(t.speed) AS "Velocidade Máx (km/h)", -- Puxa o pico de velocidade
    MAX(t.motor_temp) AS "Temp Máx (°C)", -- Puxa o pico de temperatura
    ROUND(AVG(t.motor_temp), 1) AS "Temp Média (°C)", -- média de temperatura e deixa só 1 casa decimal.
    MIN(t.tensao) AS "Tensão Mínima (V)" -- menor tensão da bateria que o carro atingiu
FROM sessoes_teste s
JOIN telemetria_motor t ON s.id_sessao = t.id_sessao
GROUP BY s.nome_teste;


-- Consulta 2 (Comparação)
-- Essa consulta vai ser ordenada de acordo com o nome da sessão (teste de arrancada...)
SELECT 
    s.nome_teste AS "Sessão",
    MAX(t.speed) AS "Velocidade Máx (km/h)",
    MAX(t.motor_temp) AS "Temp Máx (°C)",
    ROUND(AVG(t.motor_temp), 1) AS "Temp Média (°C)",
    MIN(t.tensao) AS "Tensão Mínima (V)"
FROM sessoes_teste s
JOIN telemetria_motor t ON s.id_sessao = t.id_sessao
GROUP BY s.nome_teste
ORDER BY s.nome_teste;

-- Consulta 3 (velocidade x tempo)
-- Mostra as informações do teste ao longo dos 4 segundos (crescimento da velocidade)
SELECT 
    s.nome_teste,
    t.time AS tempo_s,
    t.speed AS velocidade_kmh
FROM telemetria_motor t
JOIN sessoes_teste s ON t.id_sessao = s.id_sessao
ORDER BY t.time ASC, s.nome_teste ASC;

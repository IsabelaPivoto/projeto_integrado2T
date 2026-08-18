const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;


// ==========================================
// CONFIGURAÇÕES
// ==========================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ==========================================
// ARQUIVO DE MEDIÇÕES
// ==========================================

const dataPath =
    path.join(
        __dirname,
        "data"
    );

const medicoesPath =
    path.join(
        dataPath,
        "medicoes.json"
    );


// Cria a pasta data caso não exista

if (!fs.existsSync(dataPath)) {

    fs.mkdirSync(
        dataPath,
        {
            recursive: true
        }
    );
}


// Cria o arquivo JSON caso não exista

if (!fs.existsSync(medicoesPath)) {

    fs.writeFileSync(
        medicoesPath,
        "[]",
        "utf8"
    );
}


// ==========================================
// LER MEDIÇÕES
// ==========================================

function lerMedicoes() {

    try {

        const dados =
            fs.readFileSync(
                medicoesPath,
                "utf8"
            );


        const medicoes =
            JSON.parse(dados);


        if (!Array.isArray(medicoes)) {

            return [];
        }


        return medicoes;

    }

    catch (erro) {

        console.error(
            "Erro ao ler medições:",
            erro
        );

        return [];
    }
}


// ==========================================
// SALVAR MEDIÇÕES
// ==========================================

function salvarMedicoes(medicoes) {

    fs.writeFileSync(
        medicoesPath,
        JSON.stringify(
            medicoes,
            null,
            2
        ),
        "utf8"
    );
}


// ==========================================
// CLASSIFICAÇÃO COM IA
// ==========================================

function classificarComIA(satisfacao) {

    return new Promise(
        (resolve, reject) => {

            const python =
                spawn(
                    process.env.PYTHON_BIN ||
                    "python",
                    [
                        "python/classify.py"
                    ]
                );


            let resultado = "";
            let erro = "";


            python.stdout.on(
                "data",
                (data) => {

                    resultado +=
                        data.toString();
                }
            );


            python.stderr.on(
                "data",
                (data) => {

                    erro +=
                        data.toString();
                }
            );


            python.on(
                "close",
                (codigo) => {

                    if (codigo !== 0) {

                        reject(
                            new Error(
                                erro ||
                                "Erro ao executar a IA."
                            )
                        );

                        return;
                    }


                    try {

                        const resposta =
                            JSON.parse(
                                resultado
                            );


                        if (resposta.erro) {

                            reject(
                                new Error(
                                    resposta.erro
                                )
                            );

                            return;
                        }


                        resolve(
                            resposta
                        );

                    }

                    catch (e) {

                        reject(
                            new Error(
                                "Resposta inválida da IA."
                            )
                        );
                    }
                }
            );


            python.stdin.write(
                JSON.stringify({
                    satisfacao:
                        satisfacao
                })
            );


            python.stdin.end();
        }
    );
}


// ==========================================
// GET /medicoes
// BUSCAR HISTÓRICO
// ==========================================

app.get(
    "/medicoes",
    (req, res) => {

        try {

            const medicoes =
                lerMedicoes();


            console.log(
                ">>> GET /medicoes"
            );

            console.log(
                "Medições encontradas:",
                medicoes.length
            );


            // Retorna a lista para o frontend

            res.json(
                medicoes
            );

        }

        catch (erro) {

            console.error(
                "Erro ao buscar medições:",
                erro
            );


            res.status(500).json({

                erro:
                    "Erro ao buscar medições."
            });
        }
    }
);


// ==========================================
// POST /medicoes
// RECEBER NOVA MEDIÇÃO
// ==========================================

app.post(
    "/medicoes",
    async (req, res) => {

        try {

            console.log(
                ">>> POST /medicoes"
            );

            console.log(
                "Dados recebidos:",
                req.body
            );


            const satisfacao =
                Number(
                    req.body.satisfacao
                );


            // Validação

            if (
                Number.isNaN(
                    satisfacao
                )
            ) {

                return res.status(400).json({

                    erro:
                        "O valor de satisfação deve ser numérico."
                });
            }


            if (
                satisfacao < 0 ||
                satisfacao > 10
            ) {

                return res.status(400).json({

                    erro:
                        "A satisfação deve estar entre 0 e 10."
                });
            }


            // ==================================
            // CLASSIFICAR COM IA
            // ==================================

            const resultado =
                await classificarComIA(
                    satisfacao
                );


            console.log(
                "Resultado da IA:",
                resultado
            );


            // ==================================
            // CRIAR MEDIÇÃO
            // ==================================

            const novaMedicao = {

                satisfacao:
                    satisfacao,

                classificacao:
                    resultado.classificacao,

                horario:
                    new Date().toISOString()
            };


            // ==================================
            // SALVAR
            // ==================================

            const medicoes =
                lerMedicoes();


            medicoes.push(
                novaMedicao
            );


            // Mantém somente as últimas 20

            const historico =
                medicoes.slice(-20);


            salvarMedicoes(
                historico
            );


            console.log(
                "Medição salva:",
                novaMedicao
            );


            // ==================================
            // RESPONDER AO FRONTEND
            // ==================================

            res.json(
                novaMedicao
            );

        }

        catch (erro) {

            console.error(
                "ERRO AO SALVAR MEDIÇÃO:",
                erro
            );


            res.status(500).json({

                erro:
                    erro.message
            });
        }
    }
);


// ==========================================
// POST /classificar
// CLASSIFICAR SEM SALVAR
// ==========================================

app.post(
    "/classificar",
    async (req, res) => {

        console.log(
            ">>> POST /classificar"
        );


        console.log(
            "Dados recebidos:",
            req.body
        );


        try {

            const satisfacao =
                Number(
                    req.body.satisfacao
                );


            if (
                Number.isNaN(
                    satisfacao
                ) ||
                satisfacao < 0 ||
                satisfacao > 10
            ) {

                return res.status(400).json({

                    erro:
                        "Satisfação inválida."
                });
            }


            const resultado =
                await classificarComIA(
                    satisfacao
                );


            res.json(
                resultado
            );

        }

        catch (erro) {

            console.error(
                "ERRO AO CLASSIFICAR:",
                erro
            );


            res.status(500).json({

                erro:
                    erro.message
            });
        }
    }
);


// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Servidor rodando em http://localhost:${PORT}`
        );
    }
);

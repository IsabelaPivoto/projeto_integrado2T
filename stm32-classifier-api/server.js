const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const medicoesPath = path.join(__dirname,"data","medicoes.json");


function lerMedicoes() {
    try {
        if (!fs.existsSync(medicoesPath)) {
            return [];
        }

        const dados = fs.readFileSync(
            medicoesPath,
            "utf8"
        );

        return JSON.parse(dados);

    } catch (erro) {
        console.error("Erro ao ler medições:", erro);
        return [];
    }
}

function salvarMedicoes(medicoes) {

    fs.writeFileSync(
        medicoesPath,
        JSON.stringify(medicoes, null, 2)
    );
}


function classificarComIA(satisfacao) {

    return new Promise((resolve, reject) => {

        const python = spawn(
            process.env.PYTHON_BIN || "python",
            ["python/classify.py"]
        );

        let resultado = "";
        let erro = "";

        python.stdout.on("data", (data) => {
            resultado += data.toString();
        });

        python.stderr.on("data", (data) => {
            erro += data.toString();
        });

        python.on("close", (codigo) => {

            if (codigo !== 0) {
                reject(
                    new Error(
                        erro || "Erro ao executar a IA."
                    )
                );

                return;
            }

            try {

                const resposta = JSON.parse(resultado);

                if (resposta.erro) {
                    reject(new Error(resposta.erro));
                    return;
                }

                resolve(resposta);

            } catch (e) {

                reject(
                    new Error(
                        "Resposta inválida da IA."
                    )
                );
            }
        });

        python.stdin.write(
            JSON.stringify({
                satisfacao: satisfacao
            })
        );

        python.stdin.end();
    });
}



app.get("/medicoes", (req, res) => {

     try {

        console.log(">>> MEDIÇÃO RECEBIDA");
        console.log(req.body);

        const satisfacao = Number(req.body.satisfacao);

        if (Number.isNaN(satisfacao)) {
            return res.status(400).json({
                erro: "O valor de satisfação deve ser numérico."
            });
        }

        if (satisfacao < 0 || satisfacao > 10) {
            return res.status(400).json({
                erro: "A satisfação deve estar entre 0 e 10."
            });
        }

        const novaMedicao = {
            satisfacao: satisfacao,
            classificacao: "Aguardando IA",
            horario: new Date().toISOString()
        };

        const medicoes = lerMedicoes();

        medicoes.push(novaMedicao);

        const historico = medicoes.slice(-20);

        salvarMedicoes(historico);

        console.log("Medição salva:", novaMedicao);

        res.json(novaMedicao);

    } catch (erro) {

        console.error("ERRO:", erro);

        res.status(500).json({
            erro: erro.message
        });
    }
});


app.post("/medicoes", async (req, res) => {

    try {

        const satisfacao = Number(
            req.body.satisfacao
        );

        if (Number.isNaN(satisfacao)) {

            return res.status(400).json({
                erro: "O valor de satisfação deve ser numérico."
            });
        }

        if (satisfacao < 0 || satisfacao > 10) {

            return res.status(400).json({
                erro: "A satisfação deve estar entre 0 e 10."
            });
        }


        const resultado = await classificarComIA(
            satisfacao
        );


        const novaMedicao = {

            satisfacao: satisfacao,

            classificacao:
                resultado.classificacao,

            horario:
                new Date().toISOString()
        };


        const medicoes = lerMedicoes();


        medicoes.push(novaMedicao);

        const historico = medicoes.slice(-20);


        salvarMedicoes(historico);


        res.json(novaMedicao);

    } catch (erro) {

        console.error(erro);

        res.status(500).json({
            erro: erro.message
        });
    }
});


app.post("/classificar", async (req, res) => {
    console.log(">>> RECEBI UMA REQUISIÇÃO EM /classificar");
    console.log("Dados recebidos:", req.body);

    try {

        const satisfacao = Number(
            req.body.satisfacao
        );

        if (
            Number.isNaN(satisfacao) ||
            satisfacao < 0 ||
            satisfacao > 10
        ) {

            return res.status(400).json({
                erro: "Satisfação inválida."
            });
        }


        const resultado = await classificarComIA(
            satisfacao
        );


        res.json(resultado);

    } catch (erro) {

        console.error("ERRO AO CLASSIFICAR:", erro);

        res.status(500).json({
            erro: erro.message
        });
    }
});


app.listen(PORT, () => {

    console.log(
        'Servidor rodando em http://localhost:3000'
    );

});
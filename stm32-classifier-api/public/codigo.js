const satisfacaoAtual =
    document.getElementById("satisfacaoAtual");

const escalaAtual =
    document.getElementById("escalaAtual");

const classificacaoAtual =
    document.getElementById("classificacaoAtual");

const classificacaoContainer =
    document.getElementById("classificacaoContainer");

const ultimaAtualizacao =
    document.getElementById("ultimaAtualizacao");

const historico =
    document.getElementById("historico");

const quantidadeMedicoes =
    document.getElementById("quantidadeMedicoes");

const statusIndicador =
    document.getElementById("statusIndicador");

const statusTexto =
    document.getElementById("statusTexto");


// ==========================================
// ADC → SATISFAÇÃO
// ==========================================

function converterAdcParaSatisfacao(adc) {

    const satisfacao =
        (Number(adc) / 4095) * 10;

    return satisfacao;
}


// ==========================================
// STATUS DO SISTEMA
// ==========================================

function sistemaConectado() {

    if (statusIndicador) {
        statusIndicador.style.background = "#22c55e";
        statusIndicador.style.boxShadow =
            "0 0 0 4px rgba(34, 197, 94, 0.15)";
    }

    if (statusTexto) {
        statusTexto.innerText =
            "Sistema conectado";
    }
}


function sistemaDesconectado() {

    if (statusIndicador) {
        statusIndicador.style.background = "#ef4444";
        statusIndicador.style.boxShadow =
            "0 0 0 4px rgba(239, 68, 68, 0.15)";
    }

    if (statusTexto) {
        statusTexto.innerText =
            "Sistema desconectado";
    }
}


// ==========================================
// CLASSIFICAÇÃO
// ==========================================

function atualizarClassificacao(classificacao) {

    if (!classificacao) {

        classificacaoAtual.innerText = "--";

        classificacaoContainer.className =
            "classificacao";

        return;
    }

    const valor =
        classificacao.toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    classificacaoAtual.innerText =
        classificacao.toUpperCase();

    classificacaoContainer.className =
        "classificacao";


    if (valor === "boa" || valor === "bom" || valor === "good") {

        classificacaoContainer.classList.add("boa");

    }

    else if (
        valor === "media" ||
        valor === "medio" ||
        valor === "medium"
    ) {

        classificacaoContainer.classList.add("media");

    }

    else if (
        valor === "ruim" ||
        valor === "bad"
    ) {

        classificacaoContainer.classList.add("ruim");
    }
}


// ==========================================
// ATUALIZA DADOS
// ==========================================

async function atualizarDados() {

    try {

        const resposta =
            await fetch("/medicoes");


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar medições."
            );
        }


        const dados =
            await resposta.json();


        console.log("Medições recebidas:", dados);


        if (!Array.isArray(dados) || dados.length === 0) {

            satisfacaoAtual.innerText = "--";

            classificacaoAtual.innerText = "--";

            ultimaAtualizacao.innerText = "--";

            escalaAtual.innerText =
                "Aguardando leitura";

            sistemaDesconectado();

            return;
        }


        // Pega a última medição

        const ultima =
            dados[dados.length - 1];


        let satisfacao;


        // Se o servidor já enviar satisfação,
        // usa esse valor.

        if (ultima.satisfacao !== undefined) {

            satisfacao =
                Number(ultima.satisfacao);

        }

        // Caso contrário, converte o ADC.

        else if (ultima.adc !== undefined) {

            satisfacao =
                converterAdcParaSatisfacao(
                    ultima.adc
                );

        }

        else {

            satisfacao = null;
        }


        if (
            satisfacao !== null &&
            !Number.isNaN(satisfacao)
        ) {

            satisfacaoAtual.innerText =
                satisfacao.toFixed(1);

            escalaAtual.innerText =
                "Escala de 0 a 10";

        }

        else {

            satisfacaoAtual.innerText =
                "--";

            escalaAtual.innerText =
                "Aguardando leitura";
        }


        atualizarClassificacao(
            ultima.classificacao
        );


        if (ultima.horario) {

            const data =
                new Date(ultima.horario);

            ultimaAtualizacao.innerText =
                data.toLocaleString("pt-BR");

        }

        else {

            ultimaAtualizacao.innerText =
                "--";
        }


        sistemaConectado();

    }

    catch (erro) {

        console.error(
            "Erro ao atualizar dados:",
            erro
        );


        satisfacaoAtual.innerText =
            "--";

        classificacaoAtual.innerText =
            "--";

        ultimaAtualizacao.innerText =
            "--";

        escalaAtual.innerText =
            "Sem conexão com a API";


        sistemaDesconectado();
    }
}


// ==========================================
// HISTÓRICO
// ==========================================

async function atualizarHistorico() {

    try {

        const resposta =
            await fetch("/medicoes");


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar histórico."
            );
        }


        const dados =
            await resposta.json();


        console.log(
            "Histórico recebido:",
            dados
        );


        historico.innerHTML = "";


        if (
            !Array.isArray(dados) ||
            dados.length === 0
        ) {

            historico.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        class="historico-vazio"
                    >
                        Aguardando as primeiras
                        medições do sistema...
                    </td>
                </tr>
            `;


            quantidadeMedicoes.innerText =
                "0 medições";


            return;
        }


        quantidadeMedicoes.innerText =
            dados.length +
            (
                dados.length === 1
                    ? " medição"
                    : " medições"
            );


        dados
            .slice()
            .reverse()
            .forEach((medicao) => {

                const linha =
                    document.createElement("tr");


                let horario =
                    "Sem horário";


                if (medicao.horario) {

                    const data =
                        new Date(
                            medicao.horario
                        );

                    horario =
                        data.toLocaleString(
                            "pt-BR"
                        );
                }


                let satisfacao = "--";


                if (
                    medicao.satisfacao !==
                    undefined
                ) {

                    satisfacao =
                        Number(
                            medicao.satisfacao
                        ).toFixed(1);

                }

                else if (
                    medicao.adc !== undefined
                ) {

                    satisfacao =
                        converterAdcParaSatisfacao(
                            medicao.adc
                        ).toFixed(1);
                }


                const classificacao =
                    medicao.classificacao ||
                    "Sem classificação";


                const classe =
                    classificacao
                        .toString()
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        );


                let classeBadge = "";


                if (
                    classe === "boa" ||
                    classe === "bom"
                ) {

                    classeBadge =
                        "badge-boa";

                }

                else if (
                    classe === "media" ||
                    classe === "medio"
                ) {

                    classeBadge =
                        "badge-media";

                }

                else if (
                    classe === "ruim"
                ) {

                    classeBadge =
                        "badge-ruim";
                }


                linha.innerHTML = `

                    <td>
                        ${horario}
                    </td>

                    <td class="valor-tabela">
                        ${satisfacao}
                    </td>

                    <td>

                        <span
                            class="badge ${classeBadge}"
                        >
                            ${classificacao}
                        </span>

                    </td>

                `;


                historico.appendChild(
                    linha
                );

            });

    }

    catch (erro) {

        console.error(
            "Erro ao atualizar histórico:",
            erro
        );


        historico.innerHTML = `
            <tr>
                <td
                    colspan="3"
                    class="historico-vazio"
                >
                    Erro ao carregar histórico.
                </td>
            </tr>
        `;
    }
}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function inicializar() {

    await atualizarDados();

    await atualizarHistorico();
}


inicializar();


setInterval(() => {

    atualizarDados();

    atualizarHistorico();

}, 3000);
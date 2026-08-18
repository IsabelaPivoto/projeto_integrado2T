// ==========================================
// ELEMENTOS DO HTML
// ==========================================

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

const medicaoManual =
    document.getElementById("medicaoManual");

const btnEnviarManual =
    document.getElementById("btnEnviarManual");

const resultadoManual =
    document.getElementById("resultadoManual");


// ==========================================
// ADC → SATISFAÇÃO
// ==========================================

function converterAdcParaSatisfacao(adc) {

    const valor =
        Number(adc);

    if (
        Number.isNaN(valor) ||
        valor < 0
    ) {
        return null;
    }

    const satisfacao =
        (valor / 4095) * 10;

    return Math.min(
        10,
        Math.max(0, satisfacao)
    );
}


// ==========================================
// STATUS DO SISTEMA
// ==========================================

function sistemaConectado() {

    if (statusIndicador) {

        statusIndicador.style.background =
            "#22c55e";

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

        statusIndicador.style.background =
            "#ef4444";

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

        if (classificacaoAtual) {
            classificacaoAtual.innerText = "--";
        }

        if (classificacaoContainer) {

            classificacaoContainer.className =
                "classificacao";
        }

        return;
    }


    const valor =
        classificacao
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");


    if (classificacaoAtual) {

        classificacaoAtual.innerText =
            classificacao.toUpperCase();
    }


    if (classificacaoContainer) {

        classificacaoContainer.className =
            "classificacao";


        if (
            valor === "boa" ||
            valor === "bom" ||
            valor === "good"
        ) {

            classificacaoContainer.classList.add(
                "boa"
            );

        }

        else if (
            valor === "media" ||
            valor === "medio" ||
            valor === "medium"
        ) {

            classificacaoContainer.classList.add(
                "media"
            );

        }

        else if (
            valor === "ruim" ||
            valor === "bad"
        ) {

            classificacaoContainer.classList.add(
                "ruim"
            );
        }
    }
}


// ==========================================
// BUSCAR MEDIÇÕES
// ==========================================

async function buscarMedicoes() {

    const resposta =
        await fetch(
            "/medicoes",
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );


    if (!resposta.ok) {

        throw new Error(
            `Erro HTTP ${resposta.status}`
        );
    }


    const dados =
        await resposta.json();


    if (!Array.isArray(dados)) {

        throw new Error(
            "A API não retornou uma lista de medições."
        );
    }


    return dados;
}


// ==========================================
// ATUALIZA LEITURA ATUAL
// ==========================================

function atualizarLeitura(dados) {

    // Não existem medições ainda.
    // Isso NÃO significa que o sistema está desconectado.

    if (
        !Array.isArray(dados) ||
        dados.length === 0
    ) {

        if (satisfacaoAtual) {
            satisfacaoAtual.innerText = "--";
        }

        if (classificacaoAtual) {
            classificacaoAtual.innerText = "--";
        }

        if (ultimaAtualizacao) {
            ultimaAtualizacao.innerText = "--";
        }

        if (escalaAtual) {

            escalaAtual.innerText =
                "Aguardando leitura";
        }

        atualizarClassificacao(null);

        return;
    }


    // Última medição

    const ultima =
        dados[dados.length - 1];


    let satisfacao = null;


    // Caso o backend já envie satisfação

    if (
        ultima.satisfacao !== undefined &&
        ultima.satisfacao !== null
    ) {

        satisfacao =
            Number(
                ultima.satisfacao
            );
    }


    // Caso o backend envie ADC

    else if (
        ultima.adc !== undefined &&
        ultima.adc !== null
    ) {

        satisfacao =
            converterAdcParaSatisfacao(
                ultima.adc
            );
    }


    // Atualiza valor

    if (
        satisfacao !== null &&
        !Number.isNaN(satisfacao)
    ) {

        if (satisfacaoAtual) {

            satisfacaoAtual.innerText =
                satisfacao.toFixed(1);
        }

        if (escalaAtual) {

            escalaAtual.innerText =
                "Escala de 0 a 10";
        }

    }

    else {

        if (satisfacaoAtual) {

            satisfacaoAtual.innerText =
                "--";
        }

        if (escalaAtual) {

            escalaAtual.innerText =
                "Aguardando leitura";
        }
    }


    // Atualiza classificação

    atualizarClassificacao(
        ultima.classificacao
    );


    // Atualiza horário

    if (
        ultima.horario
    ) {

        const data =
            new Date(
                ultima.horario
            );


        if (!Number.isNaN(data.getTime())) {

            if (ultimaAtualizacao) {

                ultimaAtualizacao.innerText =
                    data.toLocaleString(
                        "pt-BR"
                    );
            }

        }

        else {

            if (ultimaAtualizacao) {

                ultimaAtualizacao.innerText =
                    "--";
            }
        }

    }

    else {

        if (ultimaAtualizacao) {

            ultimaAtualizacao.innerText =
                "--";
        }
    }
}


// ==========================================
// ATUALIZA HISTÓRICO
// ==========================================

function atualizarHistorico(dados) {

    if (!historico) {
        return;
    }


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


        if (quantidadeMedicoes) {

            quantidadeMedicoes.innerText =
                "0 medições";
        }


        return;
    }


    if (quantidadeMedicoes) {

        quantidadeMedicoes.innerText =
            dados.length === 1
                ? "1 medição"
                : `${dados.length} medições`;
    }


    // Mais recente primeiro

    dados
        .slice()
        .reverse()
        .forEach(
            (medicao) => {

                const linha =
                    document.createElement("tr");


                // --------------------------
                // HORÁRIO
                // --------------------------

                let horario =
                    "Sem horário";


                if (medicao.horario) {

                    const data =
                        new Date(
                            medicao.horario
                        );


                    if (
                        !Number.isNaN(
                            data.getTime()
                        )
                    ) {

                        horario =
                            data.toLocaleString(
                                "pt-BR"
                            );
                    }
                }


                // --------------------------
                // SATISFAÇÃO
                // --------------------------

                let satisfacao =
                    "--";


                if (
                    medicao.satisfacao !==
                    undefined &&
                    medicao.satisfacao !==
                    null
                ) {

                    const valor =
                        Number(
                            medicao.satisfacao
                        );


                    if (
                        !Number.isNaN(valor)
                    ) {

                        satisfacao =
                            valor.toFixed(1);
                    }
                }


                else if (
                    medicao.adc !==
                    undefined &&
                    medicao.adc !==
                    null
                ) {

                    const valor =
                        converterAdcParaSatisfacao(
                            medicao.adc
                        );


                    if (valor !== null) {

                        satisfacao =
                            valor.toFixed(1);
                    }
                }


                // --------------------------
                // CLASSIFICAÇÃO
                // --------------------------

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


                let classeBadge =
                    "";


                if (
                    classe === "boa" ||
                    classe === "bom" ||
                    classe === "good"
                ) {

                    classeBadge =
                        "badge-boa";
                }

                else if (
                    classe === "media" ||
                    classe === "medio" ||
                    classe === "medium"
                ) {

                    classeBadge =
                        "badge-media";
                }

                else if (
                    classe === "ruim" ||
                    classe === "bad"
                ) {

                    classeBadge =
                        "badge-ruim";
                }


                // --------------------------
                // MONTA LINHA
                // --------------------------

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
            }
        );
}


// ==========================================
// ATUALIZA TUDO
// ==========================================

async function atualizarSistema() {

    try {

        const dados =
            await buscarMedicoes();


        console.log(
            "Medições recebidas:",
            dados
        );


        // A API respondeu.
        // Portanto, estamos conectados.

        sistemaConectado();


        atualizarLeitura(
            dados
        );


        atualizarHistorico(
            dados
        );

    }

    catch (erro) {

        console.error(
            "Erro ao atualizar sistema:",
            erro
        );


        sistemaDesconectado();


        if (satisfacaoAtual) {

            satisfacaoAtual.innerText =
                "--";
        }


        if (escalaAtual) {

            escalaAtual.innerText =
                "Sem conexão com a API";
        }


        if (classificacaoAtual) {

            classificacaoAtual.innerText =
                "--";
        }


        if (ultimaAtualizacao) {

            ultimaAtualizacao.innerText =
                "--";
        }


        if (historico) {

            historico.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        class="historico-vazio"
                    >
                        Não foi possível conectar
                        com o servidor.
                    </td>
                </tr>
            `;
        }


        if (quantidadeMedicoes) {

            quantidadeMedicoes.innerText =
                "Sem conexão";
        }
    }
}


// ==========================================
// ENVIO DE MEDIÇÃO MANUAL
// ==========================================

async function enviarMedicaoManual() {

    if (
        !medicaoManual ||
        !resultadoManual
    ) {
        return;
    }


    const valor =
        Number(
            medicaoManual.value
        );


    // Validação

    if (
        Number.isNaN(valor) ||
        valor < 0 ||
        valor > 10
    ) {

        resultadoManual.innerText =
            "Digite um valor entre 0 e 10.";

        resultadoManual.style.color =
            "#dc2626";

        return;
    }


    // Desabilita botão

    if (btnEnviarManual) {

        btnEnviarManual.disabled =
            true;

        btnEnviarManual.innerText =
            "Enviando...";
    }


    resultadoManual.innerText =
        "Enviando medição...";

    resultadoManual.style.color =
        "#64748b";


    try {

        const resposta =
            await fetch(
                "/medicoes",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({

                        satisfacao:
                            valor
                    })
                }
            );


        if (!resposta.ok) {

            throw new Error(
                `Erro HTTP ${resposta.status}`
            );
        }


        resultadoManual.innerText =
            "Medição enviada com sucesso!";

        resultadoManual.style.color =
            "#16a34a";


        medicaoManual.value =
            "";


        // Atualiza os dados imediatamente

        await atualizarSistema();

    }

    catch (erro) {

        console.error(
            "Erro ao enviar medição:",
            erro
        );


        resultadoManual.innerText =
            "Erro ao enviar medição. Verifique se o servidor está conectado.";

        resultadoManual.style.color =
            "#dc2626";
    }


    finally {

        if (btnEnviarManual) {

            btnEnviarManual.disabled =
                false;

            btnEnviarManual.innerText =
                "Enviar medição";
        }
    }
}


// ==========================================
// BOTÃO DE MEDIÇÃO MANUAL
// ==========================================

if (btnEnviarManual) {

    btnEnviarManual.addEventListener(
        "click",
        enviarMedicaoManual
    );
}


// Permite pressionar Enter no campo

if (medicaoManual) {

    medicaoManual.addEventListener(
        "keydown",
        (evento) => {

            if (
                evento.key === "Enter"
            ) {

                enviarMedicaoManual();
            }
        }
    );
}


// ==========================================
// INICIALIZAÇÃO
// ==========================================

async function inicializar() {

    console.log(
        "Iniciando Monitor de Satisfação..."
    );


    await atualizarSistema();


    console.log(
        "Sistema inicializado."
    );
}


inicializar();


// ==========================================
// ATUALIZA A CADA 3 SEGUNDOS
// ==========================================

setInterval(
    () => {

        atualizarSistema();

    },
    3000
);

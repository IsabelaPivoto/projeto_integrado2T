using System;
using System.Diagnostics;
using System.IO;
using System.IO.Ports;
using System.Text.Json;

namespace ComunicacaoUSB
{
    public class DadosSTM32
    {
        public int Adc { get; set; }
        public double Tensao { get; set; }
    }

    public class ResultadoIA
    {
        public double Adc { get; set; }
        public double Satisfacao { get; set; }
        public string? Classificacao { get; set; }
        public string? Erro { get; set; }
    }

    static class Program
    {
        // ==========================================
        // CONFIGURAÇÃO
        // ==========================================

        private const string PORTA = "COM10";
        private const int BAUD_RATE = 115200;

        // Python instalado no computador
        private const string PYTHON = "python";

        // classify.py está uma pasta acima de ComunicacaoUSB
        private static readonly string CLASSIFY =
            Path.GetFullPath(
                Path.Combine(
                    AppContext.BaseDirectory,
                    "..",
                    "..",
                    "..",
                    "..",
                    "python",
                    "classify.py"
                )
            );

        private static readonly SerialPort serialPort =
            new(
                PORTA,
                BAUD_RATE,
                Parity.None,
                8,
                StopBits.One
            );

        private static readonly JsonSerializerOptions jsonOptions =
            new()
            {
                PropertyNameCaseInsensitive = true
            };


        // ==========================================
        // MAIN
        // ==========================================

        static void Main()
        {
            Console.WriteLine("======================================");
            Console.WriteLine("      SISTEMA DE SATISFAÇÃO STM32");
            Console.WriteLine("======================================");

            Console.WriteLine($"Porta: {PORTA}");
            Console.WriteLine($"BaudRate: {BAUD_RATE}");

            Console.WriteLine();
            Console.WriteLine("Localizando classify.py...");

            Console.WriteLine(CLASSIFY);

            if (!File.Exists(CLASSIFY))
            {
                Console.WriteLine();
                Console.WriteLine("ERRO: classify.py não foi encontrado!");
                Console.WriteLine();
                Console.WriteLine("Verifique se a estrutura está assim:");
                Console.WriteLine();
                Console.WriteLine("stm32-classifier-api");
                Console.WriteLine("├── python");
                Console.WriteLine("│   ├── classify.py");
                Console.WriteLine("│   └── dataset.csv");
                Console.WriteLine("└── ComunicacaoUSB");
                Console.WriteLine("    └── Program.cs");
                Console.WriteLine();

                Console.ReadLine();
                return;
            }

            Console.WriteLine("classify.py encontrado!");
            Console.WriteLine();

            try
            {
                serialPort.NewLine = "\n";

                serialPort.DataReceived += DadosRecebidos;

                serialPort.Open();

                Console.WriteLine("======================================");
                Console.WriteLine("       STM32 CONECTADO");
                Console.WriteLine("======================================");
                Console.WriteLine($"COM: {PORTA}");
                Console.WriteLine($"BaudRate: {BAUD_RATE}");
                Console.WriteLine();
                Console.WriteLine("TRIMPOT ATIVO");
                Console.WriteLine("Movimente o trimpot para alterar");
                Console.WriteLine("automaticamente a classificação.");
                Console.WriteLine();
                Console.WriteLine("Aguardando dados...");
                Console.WriteLine("======================================");

                Console.ReadLine();
            }
            catch (UnauthorizedAccessException)
            {
                Console.WriteLine();
                Console.WriteLine(
                    $"ERRO: A porta {PORTA} está sendo usada por outro programa."
                );
            }
            catch (IOException)
            {
                Console.WriteLine();
                Console.WriteLine(
                    $"ERRO: Não foi possível acessar {PORTA}."
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine();
                Console.WriteLine("ERRO:");
                Console.WriteLine(ex.Message);
            }
            finally
            {
                if (serialPort.IsOpen)
                {
                    serialPort.Close();
                }
            }
        }


        // ==========================================
        // RECEBE DADOS DO STM32
        // ==========================================

        static void DadosRecebidos(
            object? sender,
            SerialDataReceivedEventArgs e)
        {
            try
            {
                while (
                    serialPort.IsOpen &&
                    serialPort.BytesToRead > 0
                )
                {
                    string json =
                        serialPort.ReadLine().Trim();

                    if (string.IsNullOrWhiteSpace(json))
                    {
                        continue;
                    }

                    Console.WriteLine();
                    Console.WriteLine(
                        $"STM32 → {json}"
                    );

                    ConverterJson(json);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Erro na comunicação serial: {ex.Message}"
                );
            }
        }


        // ==========================================
        // CONVERTE JSON DO STM32
        // ==========================================

        static void ConverterJson(string json)
        {
            try
            {
                DadosSTM32? dados =
                    JsonSerializer.Deserialize<DadosSTM32>(
                        json,
                        jsonOptions
                    );

                if (dados == null)
                {
                    Console.WriteLine(
                        "JSON inválido."
                    );

                    return;
                }

                // ==================================
                // VALIDA ADC
                // ==================================

                if (dados.Adc < 0 || dados.Adc > 4095)
                {
                    Console.WriteLine(
                        $"ADC inválido: {dados.Adc}"
                    );

                    return;
                }

                Console.WriteLine(
                    $"ADC: {dados.Adc}"
                );

                Console.WriteLine(
                    $"Tensão: {dados.Tensao:F2} V"
                );

                // ==================================
                // MANDA PARA O KNN
                // ==================================

                ExecutarIA(dados.Adc);
            }
            catch (JsonException ex)
            {
                Console.WriteLine(
                    $"Erro no JSON: {ex.Message}"
                );
            }
        }


        // ==========================================
        // EXECUTA CLASSIFY.PY
        // ==========================================

        static void ExecutarIA(int adc)
        {
            try
            {
                ProcessStartInfo processo = new()
                {
                    FileName = PYTHON,

                    Arguments =
                        $"\"{CLASSIFY}\"",

                    UseShellExecute = false,

                    RedirectStandardInput = true,

                    RedirectStandardOutput = true,

                    RedirectStandardError = true,

                    CreateNoWindow = true
                };

                using Process? proc =
                    Process.Start(processo);

                if (proc == null)
                {
                    Console.WriteLine(
                        "Não foi possível iniciar o Python."
                    );

                    return;
                }

                // ==================================
                // ENVIA ADC PARA O PYTHON
                // ==================================

                string entrada =
                    JsonSerializer.Serialize(
                        new
                        {
                            adc
                        }
                    );

                proc.StandardInput.WriteLine(entrada);

                proc.StandardInput.Close();


                // ==================================
                // RECEBE RESULTADO
                // ==================================

                string resposta =
                    proc.StandardOutput.ReadToEnd();

                string erro =
                    proc.StandardError.ReadToEnd();

                proc.WaitForExit();


                // ==================================
                // VERIFICA ERRO DO PYTHON
                // ==================================

                if (!string.IsNullOrWhiteSpace(erro))
                {
                    Console.WriteLine();
                    Console.WriteLine(
                        "ERRO PYTHON:"
                    );

                    Console.WriteLine(erro);

                    return;
                }


                // ==================================
                // CONVERTE RESULTADO DO KNN
                // ==================================

                ResultadoIA? resultado =
                    JsonSerializer.Deserialize<ResultadoIA>(
                        resposta,
                        jsonOptions
                    );

                if (resultado == null)
                {
                    Console.WriteLine(
                        "Resposta inválida do Python."
                    );

                    return;
                }


                // ==================================
                // MOSTRA RESULTADO
                // ==================================

                Console.WriteLine();
                Console.WriteLine(
                    "--------------------------------------"
                );

                Console.WriteLine(
                    "          RESULTADO DO KNN"
                );

                Console.WriteLine(
                    "--------------------------------------"
                );

                Console.WriteLine(
                    $"ADC:           {resultado.Adc}"
                );

                Console.WriteLine(
                    $"Satisfação:    {resultado.Satisfacao:F1}/10"
                );

                Console.WriteLine(
                    $"Classificação: {resultado.Classificacao}"
                );

                Console.WriteLine(
                    "--------------------------------------"
                );


                // ==================================
                // ENVIA PARA O SITE
                // ==================================

                EnviarParaSite(resultado);
            }
            catch (Exception ex)
            {
                Console.WriteLine();
                Console.WriteLine(
                    $"Erro ao executar Python: {ex.Message}"
                );
            }
        }


        // ==========================================
        // ENVIA RESULTADO PARA O SITE
        // ==========================================

        static void EnviarParaSite(ResultadoIA resultado)
        {
            string json =
                JsonSerializer.Serialize(resultado);

            Console.WriteLine();
            Console.WriteLine(
                "Resultado pronto para enviar ao site:"
            );

            Console.WriteLine(json);

            // A conexão HTTP com o server.js
            // será colocada aqui depois de vermos
            // como o seu servidor está funcionando.
        }
    }
}
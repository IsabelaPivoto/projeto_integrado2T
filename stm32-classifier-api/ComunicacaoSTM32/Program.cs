using System;
using System.IO.Ports;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    static SerialPort porta = null!;
    static readonly HttpClient httpClient = new HttpClient();

    static async Task Main()
    {
        Console.WriteLine("======================================");
        Console.WriteLine("       COMUNICACAO COM STM32");
        Console.WriteLine("======================================");
        Console.WriteLine();

        string[] portas = SerialPort.GetPortNames();

        if (portas.Length == 0)
        {
            Console.WriteLine("Nenhuma porta COM foi encontrada.");
            Console.WriteLine();
            Console.WriteLine("Conecte a STM32 e tente novamente.");
            Console.ReadKey();
            return;
        }

        Console.WriteLine("Portas COM encontradas:");
        Console.WriteLine();

        for (int i = 0; i < portas.Length; i++)
        {
            Console.WriteLine($"{i + 1} - {portas[i]}");
        }

        Console.WriteLine();
        Console.Write("Digite o numero da porta: ");

        if (!int.TryParse(Console.ReadLine(), out int escolha))
        {
            Console.WriteLine("Opcao invalida.");
            return;
        }

        if (escolha < 1 || escolha > portas.Length)
        {
            Console.WriteLine("Opcao invalida.");
            return;
        }

        string nomePorta = portas[escolha - 1];

        try
        {
            porta = new SerialPort();

            porta.PortName = nomePorta;
            porta.BaudRate = 115200;
            porta.Parity = Parity.None;
            porta.DataBits = 8;
            porta.StopBits = StopBits.One;
            porta.ReadTimeout = 1000;
            porta.NewLine = "\n";

            porta.DataReceived += DadosRecebidos;

            porta.Open();

            Console.WriteLine();
            Console.WriteLine("--------------------------------------");
            Console.WriteLine($"STM32 conectada em {nomePorta}");
            Console.WriteLine("Aguardando dados...");
            Console.WriteLine("--------------------------------------");
            Console.WriteLine();
            Console.WriteLine("Gire o trimpot para alterar a medicao.");
            Console.WriteLine("Pressione ENTER para encerrar.");
            Console.WriteLine();

            Console.ReadLine();

            if (porta.IsOpen)
            {
                porta.Close();
            }
        }
        catch (Exception erro)
        {
            Console.WriteLine();
            Console.WriteLine("ERRO AO ABRIR A PORTA:");
            Console.WriteLine(erro.Message);
        }
    }

    static async void DadosRecebidos(
        object sender,
        SerialDataReceivedEventArgs e)
    {
        try
        {
            string dados = porta.ReadLine().Trim();

            if (string.IsNullOrWhiteSpace(dados))
            {
                return;
            }

            Console.WriteLine("Dados recebidos da STM32:");
            Console.WriteLine(dados);

            Medicao? medicao =
                JsonSerializer.Deserialize<Medicao>(dados);

            if (medicao == null)
            {
                Console.WriteLine("JSON invalido.");
                return;
            }

            double satisfacao =
                (medicao.adc / 4095.0) * 10.0;

            satisfacao =
                Math.Round(satisfacao, 1);

            Console.WriteLine();
            Console.WriteLine($"ADC: {medicao.adc}");
            Console.WriteLine($"Tensao: {medicao.tensao:F2} V");
            Console.WriteLine($"Porcentagem: {medicao.porcentagem:F1}%");
            Console.WriteLine($"Satisfacao: {satisfacao:F1}/10");

            Console.WriteLine();
            Console.WriteLine("Enviando para o servidor...");

            await EnviarParaServidor(satisfacao);

            Console.WriteLine("--------------------------------------");
        }
        catch (Exception erro)
        {
            Console.WriteLine(
                "Erro ao receber/processar dados: "
                + erro.Message
            );
        }
    }

    static async Task EnviarParaServidor(double satisfacao)
    {
        try
        {
            var dados = new
            {
                satisfacao = satisfacao
            };

            string json =
                JsonSerializer.Serialize(dados);

            StringContent conteudo =
                new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json"
                );

            HttpResponseMessage resposta =
                await httpClient.PostAsync(
                    "http://localhost:3000/medicoes",
                    conteudo
                );

            string retorno =
                await resposta.Content.ReadAsStringAsync();

            Console.WriteLine(
                $"Status do servidor: {(int)resposta.StatusCode}"
            );

            Console.WriteLine(
                $"Resposta: {retorno}"
            );
        }
        catch (Exception erro)
        {
            Console.WriteLine(
                "Erro ao enviar para o servidor: "
                + erro.Message
            );
        }
    }
}

class Medicao
{
    public int adc { get; set; }

    public double tensao { get; set; }

    public double porcentagem { get; set; }
}
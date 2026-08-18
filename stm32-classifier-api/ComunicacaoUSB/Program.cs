using System;
using System.IO.Ports;
using System.Text.Json;

namespace ComunicacaoUSB
{
    public class DadosSTM32
    {
        public int Adc { get; set; }
        public double Tensao { get; set; }
        public double Porcentagem { get; set; }
        public string? NivelSatisfacao { get; set; }
    }

   static class Program
    {
        // PORTA FIXA
      static readonly SerialPort serialPort = new("COM10", 115200, Parity.None, 8, StopBits.One);


        static void Main()
        {
            try
            {
                serialPort.NewLine = "\n";
                serialPort.DataReceived += DadosRecebidos;

                serialPort.Open();

                Console.WriteLine("==============================");
                Console.WriteLine("STM32 conectado na COM10");
                Console.WriteLine("BaudRate: 115200");
                Console.WriteLine("Aguardando dados...");
                Console.WriteLine("==============================");
                Console.WriteLine();

                Console.ReadLine();

                if (serialPort.IsOpen)
                {
                    serialPort.Close();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erro ao abrir a COM10:");
                Console.WriteLine(ex.Message);
            }
        }

        static void DadosRecebidos(
            object? sender,
            SerialDataReceivedEventArgs e)
        {
            try
            {
                while (serialPort.IsOpen && serialPort.BytesToRead > 0)
                {
                    string dados = serialPort.ReadLine().Trim();

                    if (string.IsNullOrWhiteSpace(dados))
                        continue;

                    ConverterJson(dados);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erro ao receber dados: " + ex.Message);
            }
        }

        static void ConverterJson(string json)
        {
            try
            {
                DadosSTM32? dados =
                    JsonSerializer.Deserialize<DadosSTM32>(json);

                if (dados == null)
                {
                    Console.WriteLine("JSON inválido.");
                    return;
                }

                Console.WriteLine();
                Console.WriteLine("================================");
                Console.WriteLine("        DADOS DO STM32");
                Console.WriteLine("================================");

                Console.WriteLine($"ADC:              {dados.Adc}");
                Console.WriteLine($"Tensão:           {dados.Tensao:F2} V");
                Console.WriteLine($"Porcentagem:      {dados.Porcentagem:F2} %");
                Console.WriteLine($"Nível satisfação: {dados.NivelSatisfacao}");

                Console.WriteLine("================================");
            }
            catch (JsonException ex)
            {
                Console.WriteLine("Erro ao converter JSON:");
                Console.WriteLine(ex.Message);
            }
        }
    }
}
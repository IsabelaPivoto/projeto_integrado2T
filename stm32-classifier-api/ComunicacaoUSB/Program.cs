using System;
using System.IO.Ports;

namespace ComunicacaoUSB
{
    class Program
    {
        static SerialPort? serialPort;

        static void Main()
        {
            Console.WriteLine("Portas COM disponíveis:");

            string[] portas = SerialPort.GetPortNames();

            foreach (string porta in portas)
            {
                Console.WriteLine(" - " + porta);
            }

            if (portas.Length == 0)
            {
                Console.WriteLine("Nenhuma porta COM encontrada.");
                Console.ReadKey();
                return;
            }

            string nomePorta = "COM10";

            serialPort = new SerialPort(
                nomePorta,
                3000,
                Parity.None,
                8,
                StopBits.One
            );

            serialPort.DataReceived += DadosRecebidos;

            try
            {
                serialPort.Open();

                Console.WriteLine();
                Console.WriteLine("Conectado ao STM32!");
                Console.WriteLine("Aguardando dados...");
                Console.WriteLine("Pressione ENTER para sair.");

                Console.ReadLine();

                serialPort.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Erro ao abrir a porta:");
                Console.WriteLine(ex.Message);
            }
        }

        static void DadosRecebidos(
            object? sender,
            SerialDataReceivedEventArgs e)
        {
            try
            {
                string dados = serialPort!.ReadLine();

                Console.WriteLine(
                    "STM32 -> C#: " + dados
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    "Erro ao receber dados: " + ex.Message
                );
            }
        }
    }
}

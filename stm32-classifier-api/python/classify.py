import sys
import json
import csv
from pathlib import Path

from sklearn.neighbors import KNeighborsClassifier

BASE_DIR = Path(__file__).resolve().parent
DATASET = BASE_DIR / "dataset.csv"


X = []
y = []

with open(DATASET, "r", encoding="utf-8") as arquivo:

    leitor = csv.DictReader(arquivo)

    for linha in leitor:

        adc = float(linha["adc"])
        classe = linha["classe"]

        X.append([adc])
        y.append(classe)


modelo = KNeighborsClassifier(n_neighbors=3)

modelo.fit(X, y)


entrada = sys.stdin.read().strip()


if not entrada:

    print(json.dumps({
        "erro": "Nenhum dado recebido."
    }, ensure_ascii=False))

    sys.exit(1)


try:

    dados = json.loads(entrada)

except json.JSONDecodeError:

    print(json.dumps({
        "erro": "JSON inválido."
    }, ensure_ascii=False))

    sys.exit(1)


if "adc" not in dados:

    print(json.dumps({
        "erro": "O campo 'adc' é obrigatório."
    }, ensure_ascii=False))

    sys.exit(1)


try:

    adc = float(dados["adc"])

except (ValueError, TypeError):

    print(json.dumps({
        "erro": "O ADC precisa ser um número."
    }, ensure_ascii=False))

    sys.exit(1)


if adc < 0 or adc > 4095:

    print(json.dumps({
        "erro": "O ADC deve estar entre 0 e 4095."
    }, ensure_ascii=False))

    sys.exit(1)


previsao = modelo.predict([[adc]])[0]

satisfacao = (adc / 4095) * 10


resultado = {
    "adc": adc,
    "satisfacao": round(satisfacao, 1),
    "classificacao": previsao
}


print(
    json.dumps(
        resultado,
        ensure_ascii=False
    )
)
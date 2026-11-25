# Como usar a fábrica no seu PC (Windows)

## 1. Instalar os programas (só uma vez)

1. **Git**: https://git-scm.com/download/win (avançar em tudo).
2. **Node.js LTS**: https://nodejs.org (botão "LTS", avançar em tudo).
3. **Python 3**: https://www.python.org/downloads/ — **marque "Add python.exe to PATH"** na primeira tela.
4. **App do Claude** para computador (você já tem).

## 2. Baixar o projeto (só uma vez)

1. Abra a pasta **Documentos**, clique na barra de endereço, digite `cmd` e aperte Enter.
2. Cole e aperte Enter (vai pedir login do GitHub no navegador):

   ```
   git clone -b claude/vibrant-keller-1cywhm https://github.com/victtorbrennon-gif/Reposit-rio-teste.git Barbearias
   ```

3. Abra a pasta **Documentos\Barbearias** e dê **dois cliques em `instalar.bat`**. Espere terminar (alguns minutos).

## 3. Trabalhar com o Claude no PC

Abra o **app do Claude → aba Code → escolha a pasta `Documentos\Barbearias`**.
Lá o Claude enxerga tudo e roda a fábrica direto no seu computador. É só pedir:

> "Monta o site da barbearia-do-joao" · "Grava o vídeo da Alpha" · "Publica a Alpha"

## 4. Ou fazer sozinho, com dois cliques

1. **`novo-cliente.bat`** → digite o nome (ex.: `barbearia-do-joao`). A pasta abre sozinha.
2. Arraste para ela o **logo** (com o nome `logo.png` ou `logo.jpg`) e as **fotos** para dentro de `fotos`.
3. Abra a **`ficha.txt`** (Bloco de Notas), preencha e salve.
4. **`fabrica.bat`** → digite o nome. No fim, a pasta `previa` abre com os prints (e o vídeo, se pediu).

Dúvida em qualquer passo: pergunte ao Claude.

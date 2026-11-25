# Fábrica de sites · clientes

Cada barbearia é **uma pasta** aqui dentro. O nome da pasta vira o nome do site (letras minúsculas e hífen, ex.: `barbearia-do-joao`).

```
clientes/
  barbearia-do-joao/
    ficha.txt      ← dados: nome, endereço, WhatsApp, serviços (preço e minutos), horários
    logo.png       ← o logo como vier (PNG, JPG ou WEBP). Pequeno ou com fundo? A fábrica resolve.
    fotos/         ← até 6 fotos do espaço e de cortes (JPG, PNG ou WEBP)
    entrega/       ← (gerado) logo em HD para entregar ao cliente
    previa/        ← (gerado) prints e vídeo de demonstração
    site.json      ← (gerado) configuração final, não edite
```

## Cliente novo, passo a passo

1. Mande no chat do Claude: **o logo, as fotos e os dados** (ou a ficha preenchida). Ou crie a pasta você mesmo: `npm run fabrica -- --novo barbearia-do-joao`.
2. A fábrica roda: `cd sitebuilder && npm run fabrica -- barbearia-do-joao` (com `--video` grava a demonstração).
3. Ela faz sozinha:
   - confere a ficha e avisa o que estiver faltando ou errado;
   - amplia o logo se for pequeno (sem mudar o desenho), tira fundo liso, gera o ícone e o logo em HD;
   - trata as fotos (gira certo, reduz o tamanho, apaga localização/GPS);
   - escolhe o estilo e a cor pelo logo (ou usa o que a ficha pedir);
   - escreve slogan e textos se a ficha não trouxer;
   - monta o site com agendamento e painel, roda os testes e tira os prints em `previa/`.
4. Publicar no Netlify: só quando você aprovar (cada publicação gasta crédito).

## Venda fechada (site final)

Na ficha: `demo: nao` e, se as fotos forem reais, `fotos_ilustrativas: nao`. Rode a fábrica de novo e publique.

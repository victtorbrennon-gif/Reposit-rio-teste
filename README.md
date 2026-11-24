# Minha Rotina

App pessoal para acompanhar a rotina diária.

**App atual:** https://claude.ai/artifact/AJ2totqj2CjhetECE5RrwH, publicado como artifact do Claude. Os dados ficam salvos online, no banco do artifact (`app/config` e `days/AAAA-MM-DD`), e o Claude consegue ler para as revisões semanais. Para gerar o arquivo publicado: `node tools/build-artifact.js` (sai em `artifact/minha-rotina.html`).

A versão do GitHub Pages (PWA, dados só no aparelho) continua no ar só para mover os dados para o app novo e para servir os calendários `.ics`.

## O que tem

- **Hoje**: checklist das atividades do dia, separadas em manhã, tarde e noite, com anel de progresso; contador de copos de água; nota do dia.
- **Plano**: treino de cada dia da semana (musculação + cardio), com check por exercício e campo para anotar a carga. Também tem guias de suplementos, alimentação, sono, pele, trajeto, moto e renda extra (conteúdo em `plan.js`).
- **Rotina**: adicionar, editar e remover atividades, com período, horário opcional e dias da semana.
- **Progresso**: sequência de dias com 80% ou mais, média dos últimos 7 dias, gráfico da semana, mapa dos últimos 30 dias, desempenho por atividade e registro semanal de peso e cintura. Também tem backup (exportar e importar JSON) e a meta de água.

## Como rodar

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Para usar no celular, publique a pasta em qualquer hospedagem estática (por exemplo, GitHub Pages) e, no navegador do celular, use "Adicionar à tela inicial".

## Lembretes (calendário)

`rotina.ics` e `agua.ics` são gerados a partir de `plan.js`. O app oferece assinar esses calendários pelo link `webcal://`, e o iPhone avisa em cada horário. Sempre que mudar `PRESET_ITEMS` ou `WATER_TIMES`, rode:

```bash
node tools/gerar-calendario.js
```


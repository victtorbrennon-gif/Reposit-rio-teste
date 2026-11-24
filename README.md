# Minha Rotina

App pessoal (PWA) para acompanhar a rotina diária. Funciona no navegador do celular, pode ser instalado na tela inicial e funciona offline. Não precisa de servidor nem conta: os dados ficam salvos no próprio aparelho.

## O que tem

- **Hoje**: checklist das atividades do dia, separadas em manhã, tarde e noite, com anel de progresso; contador de copos de água; nota do dia.
- **Rotina**: adicionar, editar e remover atividades, com período, horário opcional e dias da semana.
- **Progresso**: sequência de dias com 80% ou mais, média dos últimos 7 dias, gráfico da semana, mapa dos últimos 30 dias e desempenho por atividade. Também tem backup (exportar e importar JSON) e a meta de água.

## Como rodar

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Para usar no celular, publique a pasta em qualquer hospedagem estática (por exemplo, GitHub Pages) e, no navegador do celular, use "Adicionar à tela inicial".

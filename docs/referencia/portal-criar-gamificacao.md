# Referência — módulo Gamificação do portal CRIAR Varejo (loja ZYNK)

Capturado em 2026-08-05 do portal externo que a loja usa
(`portal.002384.criar-ip.com`, versão 1.0.277), logado como gestor. Serve de
referência para replicar funcionalidades no alvo/MetaFlow nas próximas fases.
Só leitura — nenhum dado foi alterado no portal.

## Mapa do módulo (menu Gamificação)

| Item | O que faz (descrição do próprio portal) | URL direta conhecida |
|---|---|---|
| Configurações | Comissão, Indicadores, faixas de pontuação, medalhas e níveis | `/gamificacao/config` |
| Desafios | Criar e gerenciar desafios de vendas | `/gamificacao/desafios` |
| Desempenho da Loja | Desempenho consolidado da loja com metas e ranking | (não capturada) |
| Metas | Metas de vendas por vendedor e loja | (não capturada) |
| Metas/Comissão p/ Categ. | Metas por categoria + comissão por dimensão/aging (2 abas) | (não capturada) |
| Meu Desempenho | Comissão, pontuação, nível, indicadores e medalhas do vendedor | (não capturada) |
| Meu Desempenho Diário | Vendas e metas do dia em tempo real | (não capturada) |
| Ranking da Equipe | Classificação dos vendedores | (não capturada) |

Só `config` e `desafios` aparecem como links diretos na home do módulo; as demais
telas abrem por um menu JS (`/menu`) que não consegui abrir por URL. Para
capturá-las, o gestor precisa navegar até elas e deixar aberto (como fez com a
home). "Meu Desempenho Diário" é a referência da Fase 2.

## Configurações da Gamificação (`/gamificacao/config`) — estrutura

Abas: **Indicadores por Vendedor · Níveis · Calcular/Recalcular · Visibilidade · Medalhas**.
Botões: "Sugerir Pontos Base" (analisa os últimos 12 meses de vendas para sugerir
pontos base equilibrados) e "Salvar".

### Comissão / Metas de Vendas (Indicadores por Vendedor)
Cada indicador tem: **Ativo**, **Ativo para cálculo de comissão** (checkbox),
**Tipo** e **Faixas** (botão "Configurar faixas").

- **Meta Valor (R$)** — Tipo: `Individual` | `Dividida` | `Meta por vendedor`; "Apenas um ativo"; tem Faixas.
- **Meta Peças** — "Apenas um ativo"; tem Faixas.

> Observação: o portal trata comissão como **por faixas de atingimento** + tipo
> (individual/dividida). O alvo, na Fase 1, implementou a regra simples da loja
> (2% se bate a meta, 1% se não). Faixas escalonadas seriam uma evolução futura.

### Indicadores Especiais (pontos por faixa)
- **Giro de Estoque Antigo** — pontos por peça, definidos por faixa de dias em estoque.
- **Mix de Grupos na Venda** — pontos definidos por faixas de quantidade de grupos.

### Indicadores da Gamificação (Ativo / Meta / Pontos / Tipo Fixo / Faixas)
- Cadastro de Novos Clientes
- Clientes em Recompra
- Clientes Resgatados (+1 ano)
- Condicionais Convertidas
- Peças por Atendimento
- Taxa de Conversão (%)
- Ticket Médio

> Vários desses indicadores (novos clientes, recompra, resgatados, condicionais,
> giro de estoque, mix de grupos) dependem de dados que o alvo **não coleta hoje**
> (venda por produto/categoria, base de clientes, estoque). Replicá-los exigiria
> ampliar a coleta de dados — mesma limitação já anotada para a Fase 4 (por categoria).

## Pendente de captura (próxima janela do portal online)
"Meu Desempenho Diário" (Fase 2), "Desempenho da Loja", "Metas/Comissão por
Categoria" e "Meu Desempenho". Quando o portal estiver acessível e o gestor
abrir essas telas, dá para capturar o layout/campos exatos.

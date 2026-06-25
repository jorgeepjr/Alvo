// Conteúdo dos manuais ZYNK transcrito dos PDFs originais, para leitura
// dentro do sistema (sem precisar baixar anexos).

export type Bloco =
  | { tipo: 'paragrafo'; texto: string }
  | { tipo: 'subtitulo'; texto: string }
  | { tipo: 'lista'; itens: string[] }
  | { tipo: 'citacao'; texto: string }

// publico: 'todos' = relevante para todos (inclui vendedor); 'gestor' = só a gestão vê.
export type Publico = 'todos' | 'gestor'

export type Secao = { titulo: string; blocos: Bloco[]; publico?: Publico }

export type Manual = {
  slug: string
  titulo: string
  descricao: string
  publico?: Publico
  oculto?: boolean // não aparece na lista (ex: conteúdo já coberto pelo sistema)
  secoes: Secao[]
}

export const MANUAIS: Manual[] = [
  {
    slug: 'rotina-de-vendas',
    titulo: 'Rotina de Vendas',
    descricao: 'A rotina diária da loja, hora a hora — do abrir ao fechar.',
    oculto: true, // já disponível como checklist diário no painel do sistema
    secoes: [
      {
        titulo: '09:00 — Organização Interna',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Organização geral (cabideiros, provadores, vitrines internas)',
              'Reposição de peças no salão de vendas',
              'Revisão de etiquetas e preços',
              'Conferência dos provadores',
              'Fazer café para a área do cliente',
              'Organização de estoque',
            ],
          },
        ],
      },
      {
        titulo: '09:30 — Ação Pessoal de Marketing (Instagram Pessoal)',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Fazer selfie ou vídeo mostrando o início do dia na loja',
              'Usar hashtags e marcar a @ da loja para engajar seguidores',
              'Mostrar bastidores e humanizar a equipe (ex: "Bom dia direto da ...")',
            ],
          },
        ],
      },
      {
        titulo: '10:00 — Montagem de Looks & Vitrine',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Criar combinações estratégicas com peças-chave e novidades',
              'Atualizar manequins e exposição da vitrine com foco em tendências e promoções',
            ],
          },
        ],
      },
      {
        titulo: '11:00 — Estratégia Digital do Dia (Instagram da Loja)',
        blocos: [
          { tipo: 'paragrafo', texto: 'Reunião rápida para decidir:' },
          {
            tipo: 'lista',
            itens: [
              'O que vamos postar hoje? (ex: lançamentos, promoções, dicas)',
              'Qual dor/necessidade do cliente vamos resolver com esse conteúdo?',
              'Confirmar com o responsável a pauta do dia',
            ],
          },
        ],
      },
      {
        titulo: 'Prospecção via mensagem (WhatsApp / Instagram / Sistema)',
        blocos: [
          { tipo: 'paragrafo', texto: 'Enviar mensagens personalizadas para:' },
          {
            tipo: 'lista',
            itens: [
              'Clientes inativos',
              'Amigos e conhecidos',
              'Aniversariantes do dia',
              'Seguidores que ainda não compraram',
            ],
          },
        ],
      },
      {
        titulo: '13:30 — Condicionais do Dia (para saída até 16:30)',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Enviar mensagens para clientes com perfil de condicional',
              'Alvo: no mínimo 25 contatos',
              'Linguagem pessoal: áudio com estilo da marca',
            ],
          },
        ],
      },
      {
        titulo: '14:30 — Organização de Looks para Conteúdo da Tarde',
        blocos: [
          { tipo: 'paragrafo', texto: 'Separar peças para vídeos, reels e TikToks. Pensar em temas como:' },
          {
            tipo: 'lista',
            itens: ['"3 looks com uma peça"', '"Looks para o fim de semana"', '"Achadinhos da semana"'],
          },
        ],
      },
      {
        titulo: '15:30 — Produto do Dia (Story/Reel)',
        blocos: [
          { tipo: 'paragrafo', texto: 'Apresentar uma peça nova:' },
          {
            tipo: 'lista',
            itens: [
              'Falar sobre tecido, modelagem, como usar',
              'Mostrar a peça no corpo se possível (comprovando caimento)',
              'Criar desejo de compra com storytelling',
              'Criar combinações com peças de promoção ou últimas unidades',
              'Fotografar e postar com destaque nos stories',
              'Incentivar vendas rápidas com urgência ("últimos tamanhos", "só hoje")',
            ],
          },
        ],
      },
      {
        titulo: '16:30 — Pós-Venda',
        blocos: [
          { tipo: 'paragrafo', texto: 'Acessar sistema/listas para contato com:' },
          {
            tipo: 'lista',
            itens: [
              'Clientes que compraram nos últimos 7 dias',
              'Clientes do mês anterior',
              'Agradecer a compra, verificar satisfação, oferecer assistência ou novidades',
            ],
          },
        ],
      },
      {
        titulo: '17:40 — Preparar para Fechamento',
        blocos: [
          {
            tipo: 'lista',
            itens: ['Máquinas de cartão carregando', 'Celular da loja na tomada', 'Looks de vitrine em ordem'],
          },
        ],
      },
      {
        titulo: '18:00 — Fechamento',
        blocos: [
          { tipo: 'lista', itens: ['Luzes apagadas', 'Portas fechadas', 'Ar desligado'] },
        ],
      },
    ],
  },

  {
    slug: 'cartilha-de-conduta',
    titulo: 'Cartilha de Conduta',
    descricao: 'Manual de excelência em atendimento da ZYNK.',
    secoes: [
      {
        titulo: 'Introdução',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Esta cartilha foi desenvolvida para estabelecer os padrões de conduta e excelência operacional em nossa loja de roupas. Nosso objetivo é criar uma experiência única para nossos clientes, transformando cada visita em um momento especial através do atendimento diferenciado e da organização exemplar.',
          },
          {
            tipo: 'paragrafo',
            texto:
              'O documento a seguir contém diretrizes práticas para garantir que nossa equipe mantenha sempre o mais alto nível de profissionalismo e eficiência.',
          },
        ],
      },
      {
        titulo: 'Objetivo do processo',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Padronizar o atendimento ao cliente em todos os pontos de contato',
              'Garantir a organização e limpeza constante do ambiente de vendas',
              'Criar experiências memoráveis que gerem fidelização e indicações',
              'Estabelecer rotinas operacionais que maximizem as vendas',
              'Manter a cultura de excelência e respeito entre toda a equipe',
            ],
          },
        ],
      },
      {
        titulo: 'Materiais e ferramentas necessárias',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Equipamentos: celular da empresa, máquina de cartão, sistema de vendas',
              'Materiais de limpeza: produtos de higienização, panos, aspirador',
              'Itens de organização: cabides, etiquetas, sacolas perfumadas',
              'Materiais para alfaiataria: máquina de costura, materiais de ajuste',
              'Lista de verificação diária (checklist de tarefas)',
            ],
          },
        ],
      },
      {
        titulo: '01. Fundamentos da Excelência (regras para ser exceção)',
        blocos: [
          { tipo: 'subtitulo', texto: '1.1 Disposição ao Acordar' },
          {
            tipo: 'lista',
            itens: [
              'Inicie cada dia com energia positiva e propósito claro',
              'Lembre-se: sua atitude influencia toda a equipe e os clientes',
            ],
          },
          { tipo: 'subtitulo', texto: '1.2 Higiene Pessoal' },
          {
            tipo: 'lista',
            itens: ['Apresentação impecável é obrigatória', 'Cabelos arrumados, uniformes limpos e bem passados'],
          },
          { tipo: 'subtitulo', texto: '1.3 Uniformes Limpos e Cheirosos' },
          { tipo: 'lista', itens: ['Uniforme sempre impecável', 'Use perfume suave e discreto'] },
          { tipo: 'subtitulo', texto: '1.4 Compromisso com Horário' },
          { tipo: 'lista', itens: ['Pontualidade é fundamental', 'Chegue sempre 10 minutos antes do horário'] },
          { tipo: 'subtitulo', texto: '1.5 Comprometimento com Organização' },
          {
            tipo: 'lista',
            itens: ['Mantenha seu espaço de trabalho sempre organizado', 'Organização reflete profissionalismo'],
          },
          { tipo: 'subtitulo', texto: '1.6 Atenção aos Detalhes e Foco para Escutar' },
          {
            tipo: 'lista',
            itens: [
              'Observe cada detalhe do cliente e do ambiente',
              'Pratique escuta ativa - entenda verdadeiramente o que o cliente precisa',
            ],
          },
          { tipo: 'subtitulo', texto: '1.7 Respeito Entre Colaboradores' },
          {
            tipo: 'lista',
            itens: ['Trate todos com cordialidade e profissionalismo', 'Trabalho em equipe é essencial para o sucesso'],
          },
          { tipo: 'subtitulo', texto: '1.8 Pensamentos Positivos e de Vencedores' },
          { tipo: 'lista', itens: ['Mantenha mentalidade focada em soluções', 'Celebre as conquistas da equipe'] },
        ],
      },
      {
        titulo: '02. Organização da Loja',
        blocos: [
          { tipo: 'subtitulo', texto: '2.1 Rotina de Entrada - Checklist Diário (chegada 10:00)' },
          {
            tipo: 'lista',
            itens: [
              'Verificar planilha de afazeres do dia anterior',
              'Dedicar 20 minutos para organização pessoal',
              'Revisar agenda do dia (semanal ou diário)',
              'Responsabilizar-se pelos afazeres pessoais (limpar piso, tirar pó)',
              'Avaliar disposição para cobrir tarefas de colegas (se necessário)',
              'Prestar atenção em detalhes: sujeira, looks desarrumados, objetos fora do lugar',
            ],
          },
          { tipo: 'subtitulo', texto: '2.2 Limpeza e Manutenção' },
          {
            tipo: 'lista',
            itens: [
              'Organizar looks e visualizar vitrine',
              'Apagar luzes desnecessárias e ajustar ar condicionado',
              'Verificar celulares da empresa na tomada',
              'Conferir máquinas de cartão',
              'Verificar alarme e trancar portas adequadamente',
              'INADMISSÍVEL: vitrine desorganizada',
            ],
          },
          {
            tipo: 'citacao',
            texto:
              'LEMBRE-SE: um lugar limpo e organizado vende mais e proporciona melhor ambiente de trabalho. OBRIGATÓRIO: revisar tudo 10 minutos antes do fechamento.',
          },
        ],
      },
      {
        titulo: '03. Execução do Bom Atendimento',
        blocos: [
          { tipo: 'subtitulo', texto: '3.1 Comunicação com Clientes' },
          {
            tipo: 'lista',
            itens: [
              'Avisar chegada de produtos solicitados',
              'Manter contato com clientes que fizeram pedidos',
              'Captar novos clientes potenciais',
              'Reativar clientes inativos',
              'Focar em clientes que compram novidades de marcas específicas',
              'Métodos de contato: ligação, mensagem, visitas presenciais na loja',
            ],
          },
          { tipo: 'subtitulo', texto: '3.2 Roteiro de Vendas - Redes Sociais' },
          {
            tipo: 'lista',
            itens: [
              'Resposta rápida no WhatsApp e Instagram, com clareza, bom humor e disposição',
              'Usar fotos atualizadas e vídeos detalhados dos produtos',
              'Manter tom acolhedor e profissional',
              'Captação de novos seguidores: enviar boas-vindas e se apresentar como representante da loja',
              'Cuidar da qualidade das postagens, legendas e ortografia',
              'Instagram como vitrine virtual: ser autêntico, transmitir confiança e manter feed organizado',
            ],
          },
          { tipo: 'subtitulo', texto: '3.3 Conteúdo para Redes Sociais — o que postar' },
          {
            tipo: 'lista',
            itens: [
              'Detalhes dos produtos e suas características',
              'Curiosidades sobre as peças',
              'Informações sobre garantias',
              'Nosso diferencial competitivo',
              'História da empresa e propósito',
              'Dia a dia e bastidores',
              'Conteúdo de entretenimento para equipe e clientes',
            ],
          },
          {
            tipo: 'citacao',
            texto:
              'IMPORTANTE: manter relatórios de vendas atualizados para avisar, lembrar, convidar, cuidar e manter clientes sempre próximos.',
          },
        ],
      },
      {
        titulo: '04. Atendimento Presencial',
        blocos: [
          { tipo: 'subtitulo', texto: '4.1 WhatsApp - Atendimento Digital' },
          {
            tipo: 'lista',
            itens: [
              'Rapidez e clareza em todas as respostas',
              'Resolver problemas com agilidade',
              'Áudios em prioridade para criar intimidade',
              'Sempre agradecer pelo contato',
              'Postar stories também no WhatsApp',
              'Manter catálogo atualizado com fotos recentes',
              'Criar lista de transmissão com ofertas exclusivas',
            ],
          },
          {
            tipo: 'citacao',
            texto:
              'IMPORTANTE: solicitar autorização do cliente para incluí-lo na "SALA VIP" onde enviamos ofertas exclusivas.',
          },
          { tipo: 'subtitulo', texto: '4.2 Atendimento com Excelência — Primeira Impressão' },
          {
            tipo: 'lista',
            itens: [
              'Sorriso no rosto - sempre!',
              'Apresentação impecável (higiene e uniforme)',
              'Receber com animação e chamar pelo nome quando possível',
              'Se não conhecer o nome: perguntar rapidamente e continuar usando o nome durante todo o atendimento',
            ],
          },
          { tipo: 'subtitulo', texto: 'Saudação Profissional' },
          {
            tipo: 'lista',
            itens: [
              'EVITAR: "Posso ajudar?"',
              'USAR: "Bem-vindo(a), [nome]! Que bom ter você aqui, vamos te ajudar da melhor maneira possível."',
              'Sempre oferecer: água, café ou cerveja para cada cliente e acompanhante',
              'Renovar a oferta periodicamente, demonstrando atenção',
            ],
          },
          { tipo: 'subtitulo', texto: '4.3 Processo de Venda Consultiva' },
          {
            tipo: 'lista',
            itens: [
              'Conhecimento do cliente: oferecer um tour pela loja antes de mostrar o produto específico',
              'Identificação de necessidades: entender a ocasião de uso (trabalho, viagem, festas). Ex: "Preciso de roupa para o trabalho" → "Com o que você trabalha?"',
              'Apresentação de produtos: mostrar opções variadas além do solicitado; é obrigação do vendedor levar as peças até o provador (não deixar o cliente carregar)',
              'Criação de vínculos: conversar sobre assuntos pessoais, mencionar amigos em comum, times e interesses; perguntar o que trouxe o cliente até a loja',
            ],
          },
        ],
      },
      {
        titulo: '05. Processos Específicos',
        blocos: [
          { tipo: 'subtitulo', texto: '5.1 Condicional - Passo a Passo (solicitado pelo WhatsApp)' },
          {
            tipo: 'lista',
            itens: [
              'Agradecer o contato e confirmar interesse',
              'Solicitar informações: tamanhos, gostos, cores',
              'Consultar histórico no sistema se cliente já cadastrado',
              'Cadastro completo: nome completo, CPF, data de nascimento, endereço completo, celular',
              'Conferir cada peça no sistema',
              'Preparar sacola perfumada com adesivos e brindes',
              'Organizar as roupas adequadamente na sacola',
              'Informar horário ideal para entrega (preferência: final da tarde, após 17h)',
              'Avisar sobre a saída do motoboy para entrega',
              'Definir prazo limite de 24 horas para o condicional',
              'Acompanhar via Instagram como estão as peças',
            ],
          },
          { tipo: 'subtitulo', texto: '5.2 Processo de Devolução' },
          {
            tipo: 'lista',
            itens: [
              'Solicitar peças que não ficaram adequadas',
              'Confirmar itens e forma de pagamento previamente estabelecida',
              'Levar máquina ou troco com o motoboy',
              'Agradecer novamente e confirmar disponibilidade',
            ],
          },
          { tipo: 'subtitulo', texto: '5.3 Alfaiataria - Serviço Especializado' },
          {
            tipo: 'paragrafo',
            texto:
              'Processo de ajuste personalizado para entregar o produto exatamente como o cliente deseja. Benefícios: peça única e exclusiva, caimento perfeito e valorização do investimento.',
          },
          {
            tipo: 'lista',
            itens: [
              'Comprimento: manga, barra de calça, barra de camiseta',
              'Largura: ajustes em calça (deixar mais justa), manga de camiseta (deixar mais slim)',
            ],
          },
        ],
      },
      {
        titulo: '06. Pós-Venda',
        blocos: [
          { tipo: 'subtitulo', texto: 'Ações Obrigatórias' },
          {
            tipo: 'lista',
            itens: [
              'Salvar contato do cliente e pesquisar compras anteriores',
              'Perguntar sobre satisfação com o último atendimento',
              'Verificar adequação do produto adquirido',
              'Solicitar feedback sobre possíveis ajustes',
              'Convidar para retorno - perguntar melhor dia e horário',
              'Solicitar indicações de amigos e familiares',
              'Investigar ocasiões especiais: viagens, trabalho, festas',
              'Criar conexão emocional com presentes e aniversários',
              'SEMPRE AGRADECER antes de tudo',
            ],
          },
        ],
      },
      {
        titulo: '07. Comportamentos Inaceitáveis',
        blocos: [
          { tipo: 'subtitulo', texto: 'O que NÃO aceitamos em nossa equipe:' },
          {
            tipo: 'lista',
            itens: [
              'Falta de pontualidade',
              'Egocentrismo e individualismo',
              'Falta de criatividade e disposição',
              'Não compreender o conceito de "servir"',
              'Falta de empatia com colegas e clientes',
              'Não ser comunicativo nas redes sociais',
              'Desorganização pessoal no ambiente de trabalho',
              'Não se comprometer com os objetivos da empresa',
              'Pensamento pequeno, fora do coletivo',
              'Qualquer forma de discriminação',
              'Dar apenas 100% - esperamos sempre mais',
              'Falta de respeito com colegas e clientes',
            ],
          },
        ],
      },
      {
        titulo: '08. Missão e Propósito — Nossa Essência',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Chegamos até aqui seguindo todos esses passos com excelência, com um só objetivo: "SERVIR". Servir pessoas que são nossos clientes, mas ao entrarem pela porta se tornam nossos amigos. E como recebemos nossos amigos? Com muita conversa e cerveja gelada.',
          },
          {
            tipo: 'paragrafo',
            texto:
              'Sua venda será consequência quando você servir nosso cliente com sorriso sincero, com o coração de quem só quer atender bem para que ele volte com um amigo, parente ou namorada.',
          },
          {
            tipo: 'citacao',
            texto:
              'Usando as técnicas de persuasão aliadas ao atendimento de excelência, é impossível nossos clientes saírem sem levar uma sacola, postando fotos e indicando para amigos. Essa é nossa essência.',
          },
        ],
      },
      {
        titulo: '09. Conclusão',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Esta cartilha representa nosso compromisso com a excelência. Cada colaborador é responsável por manter e elevar nossos padrões de qualidade.',
          },
          {
            tipo: 'citacao',
            texto:
              'Lembre-se: não vendemos apenas roupas, criamos experiências memoráveis e construímos relacionamentos duradouros.',
          },
        ],
      },
    ],
  },

  {
    slug: 'manual-do-instagram',
    titulo: 'Manual do Instagram',
    descricao: 'Como usar o Instagram da loja e o pessoal para gerar vendas.',
    secoes: [
      {
        titulo: 'Introdução',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Já estruturamos o Instagram para ter uma presença sólida, organizada e confiável. Agora é hora de ser intencional: transformar o engajamento em ações que geram vendas.',
          },
          { tipo: 'citacao', texto: '"Não adianta só ser bonito — tem que vender."' },
        ],
      },
      {
        titulo: 'Objetivo',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Ensinar lojistas e equipe a usar o Instagram (loja e pessoal) para fazer o cliente dar o primeiro passo',
              'Mostrar como, por que e quando incentivar o cliente a chamar, comprar, marcar ou visitar',
            ],
          },
          { tipo: 'paragrafo', texto: 'Responsável: dono, gerente e vendedores. Frequência: diária. Ferramentas: Instagram da loja, Instagram pessoal, WhatsApp.' },
        ],
      },
      {
        titulo: '1. Stories de Bom Dia — Instagram da Loja',
        blocos: [
          { tipo: 'paragrafo', texto: 'Uma rotina fixa de stories logo cedo, no perfil oficial da loja, para mostrar vida e convidar o cliente.' },
          { tipo: 'subtitulo', texto: 'Como fazer' },
          {
            tipo: 'lista',
            itens: [
              'Grave vídeo ou foto real da loja',
              'Fale de forma acolhedora, como recepcionista de hotel: "Bom dia! Hoje a loja tá pronta te esperando."',
              '"Chegaram novidades que vou te mostrar!"',
              'Mostre vitrines, looks montados, reposição',
              'Fale dos bastidores: equipe organizando, café pronto',
            ],
          },
          { tipo: 'subtitulo', texto: 'Por quê' },
          { tipo: 'lista', itens: ['Aquece o cliente logo cedo', 'Mostra vida e movimento', 'Cria hábito no seguidor'] },
        ],
      },
      {
        titulo: '2. Stories de Bom Dia — Instagram Pessoal de Cada Vendedor',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Cada vendedor é porta-voz direto e humano da marca. Usar o Instagram pessoal não é só divulgar produtos, mas construir uma relação íntima e confiável. Quando o cliente segue o vendedor, sente que fala com um amigo ou consultor de confiança — isso diminui barreiras para perguntar, negociar e comprar.',
          },
          { tipo: 'subtitulo', texto: 'Conteúdos sugeridos' },
          {
            tipo: 'lista',
            itens: [
              'Look do dia do vendedor',
              'Bastidores do deslocamento para a loja',
              'Mostrando o café ou a preparação da loja',
              'Comentando sobre novidades que chegaram',
              'Mostrando combinações de peças novas',
              'Falando da expectativa de receber clientes hoje',
            ],
          },
          {
            tipo: 'citacao',
            texto:
              'Exemplo de fala: "Bom dia, pessoal! Já tô aqui na loja hoje. Chegaram umas novidades ontem que eu quero muito mostrar pra vocês. Quem quiser já me chama por aqui!"',
          },
        ],
      },
      {
        titulo: '2.1 Ideias de conteúdo (loja e pessoal)',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Takes rápidos da fachada + VM interno com música + "loja aberta"',
              'Foto da bancada do café organizada: "venha tomar um café"',
              'Fotos de presentes em cima do caixa mostrando a logo',
              'Vídeo mostrando os presentes saindo, falando do cuidado e capricho',
              'Foto das sacolas de condicionais avisando como solicitar: "chame aqui, mande o endereço e seus tamanhos, o resto deixa com a gente"',
              'Vídeo montando um condicional',
              'Mostrar diferenças de modelagens de marcas e como encaixar em cada estilo',
              'Mostrar características únicas: tênis (palmilha, conforto), camisas (slim x regular), calça jeans (slim, skinny, regular, comfort), cintos, bonés, relógios',
              'Mostrar a variedade de algodões da loja (pima, modal, piquet, etc.)',
              'Mostrar a linha de acessórios: carteiras, cintos, chinelos, óculos',
              '"Vote: qual tênis você usaria no rolê?"',
              'Mostrar a playlist do dia com QR Code no story',
              '"Hoje tem cervejinha gelada" — mostrar no freezer',
              'Mostrar a equipe comemorando meta batida',
              'Mostrar passo a passo para pedir condicional via WhatsApp',
            ],
          },
        ],
      },
      {
        titulo: '3. Postagens no Instagram Pessoal do Vendedor',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'O perfil pessoal serve para criar conexão individual, como uma conversa entre amigos. É aqui que o vendedor se posiciona como consultor de confiança — alguém real, que usa as peças e dá dicas sinceras.',
          },
          { tipo: 'subtitulo', texto: 'O que postar' },
          {
            tipo: 'lista',
            itens: [
              'Look do dia com dica real e prática',
              'Combinação fácil para um evento específico (trabalho, festa, reunião)',
              'Bastidores escolhendo peças para um cliente (sem expor rosto/dados sem autorização)',
              'Atendimento personalizado (explicando como ajuda a resolver dúvidas)',
              'Momentos reais do dia a dia: "Hoje tô usando essa calça porque vou resolver mil coisas."',
            ],
          },
          { tipo: 'subtitulo', texto: 'Tom e abordagem' },
          {
            tipo: 'lista',
            itens: [
              'Falar como amigo, não como vendedor formal',
              'Evitar linguagem excessivamente comercial ou engessada',
              'Usar frases simples, naturais, que mostrem empatia',
            ],
          },
          {
            tipo: 'citacao',
            texto: 'Dica importante: garantir sempre autorização antes de mostrar o rosto do cliente em fotos ou vídeos.',
          },
          { tipo: 'paragrafo', texto: 'Frequência: pelo menos 2 a 3 vezes por semana, preferencialmente nos dias mais movimentados.' },
        ],
      },
      {
        titulo: '4. Acompanhamento do Gerente/Dono',
        publico: 'gestor',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Definir meta clara: cada vendedor faz no mínimo 1 story de bom dia diário no Instagram pessoal',
              'Acompanhar diariamente: verificar quem postou e quem não, orientando quando necessário',
              'Alinhar em reunião semanal: discutir tom, ideias de conteúdo, o que funcionou ou não',
              'Incentivar a criação pessoal: valorizar o jeito próprio de cada vendedor para os conteúdos soarem autênticos',
            ],
          },
          {
            tipo: 'citacao',
            texto:
              'Erro comum a evitar: copiar e colar o mesmo story do perfil da loja no perfil pessoal. O conteúdo pessoal precisa parecer único e verdadeiro — não um "repost institucional".',
          },
        ],
      },
      {
        titulo: '5. Dia da Produção Semanal',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Separe um momento fixo da semana para produzir fotos e vídeos com calma e qualidade, criando um banco de conteúdo pronto para a semana toda. Responsável: dono/gerente para organização e vendedores para participar. Frequência: 1x por semana.',
          },
          { tipo: 'subtitulo', texto: 'Passo a passo' },
          {
            tipo: 'lista',
            itens: [
              'Escolha um dia fixo (ex: segunda-feira, 9h às 11h, antes de abrir)',
              'Separe as peças e looks com antecedência, pensando em combinações prontas',
              'Prepare o local: limpe o cenário e organize um canto bem iluminado',
              'Defina quem fotografa e quem veste; revezem para mostrar estilos e corpos diferentes',
              'Use boa iluminação (luz natural perto de janelas, ou softbox/ring light)',
              'Faça fotos completas (corpo inteiro) e de detalhes (tecido, botão, estampa)',
              'Grave vídeos curtos/reels mostrando como usar e combinar a peça',
              'Organize o material em pasta no celular ou Drive, separado por data/tema',
              'Planeje as legendas já pensando em resolver a dor do cliente',
              'Combine o calendário de postagem (agendar ou decidir no grupo da equipe)',
            ],
          },
          {
            tipo: 'citacao',
            texto: 'Exemplo: segunda-feira produz fotos e vídeos; de terça a sexta, publicação programada e interação com os clientes.',
          },
        ],
      },
    ],
  },

  {
    slug: 'abordagens-prospeccao',
    titulo: 'Abordagens de Prospecção',
    descricao: 'Modelos de áudio/mensagem para clientes que já conhecem a loja.',
    secoes: [
      {
        titulo: 'Como usar',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Modelos prontos para abordar clientes que já conhecem a loja. Personalize com o nome do cliente e mande de preferência por áudio, com o estilo da marca.',
          },
        ],
      },
      {
        titulo: '1. Reativação (cliente sumido)',
        blocos: [
          { tipo: 'subtitulo', texto: 'Áudio' },
          {
            tipo: 'citacao',
            texto:
              'Fala, [nome]! Sumido hein… lembrei de você hoje aqui na loja porque chegou umas peças bem no teu estilo. Como você tá?',
          },
          { tipo: 'subtitulo', texto: 'Texto (se não responder)' },
          { tipo: 'citacao', texto: 'Chegou novidade aqui que é muito tua cara, depois te mostro.' },
        ],
      },
      {
        titulo: '2. Oportunidade (novidade)',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Mano, chegou uma peça aqui que na hora eu lembrei de você… é bem o estilo que você já pegou aqui na loja. Quer que eu te mande?',
          },
        ],
      },
      {
        titulo: '3. Condicional',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [nome]! Tô montando uns condicionais hoje e pensei em montar um pra você… quer que eu separe umas opções no teu estilo?',
          },
        ],
      },
      {
        titulo: '4. Relacionamento (sem vender direto)',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'E aí, [nome]! Como tá? Esses dias lembrei de você aqui na loja… sumiu! Tá trabalhando com o que agora?',
          },
        ],
      },
      {
        titulo: '5. Urgência (oferta leve)',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Mano, separei umas peças aqui e algumas já tão saindo… antes de acabar, quis te chamar pra ver primeiro. Quer que eu te mande?',
          },
        ],
      },
      {
        titulo: '6. Pós-venda que gera nova venda',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [nome]! E aquela peça que você pegou, curtiu? Tô montando uns looks novos que combinam com ela… depois te mostro.',
          },
        ],
      },
      {
        titulo: 'Pontos importantes',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Sempre iniciar com áudio',
              'Personalizar com o nome',
              'Evitar mensagens genéricas',
              'Focar em gerar conversa, não só vender',
              'Seguir o funil: Captação → Relacionamento → Persuasão → Fechamento',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'prospeccao-novos-clientes',
    titulo: 'Prospecção de Novos Clientes',
    descricao: 'Modelos de mensagem para atrair quem ainda não comprou.',
    secoes: [
      {
        titulo: 'Como usar',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Mensagens para o primeiro contato com quem ainda não é cliente (seguidores, indicações). Personalize com [Nome], [Seu Nome] e [Loja]. Prefira áudio e foque em criar conexão, sem empurrar venda no primeiro contato.',
          },
        ],
      },
      {
        titulo: '1. Primeiro contato pelo Instagram (áudio)',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Tudo certo? Vi que você acompanha nosso perfil e resolvi me apresentar. Meu nome é [Seu Nome], faço parte da equipe da [Loja]. Trabalho ajudando nossos clientes a encontrarem peças para o dia a dia, trabalho, eventos e momentos especiais. Não estou te chamando para comprar nada agora, só queria me colocar à disposição. Qualquer coisa que precisar, pode contar comigo. 👊',
          },
        ],
      },
      {
        titulo: '2. Primeiro contato por áudio',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Tudo certo? Vi que você acompanha nossa página e resolvi me apresentar. Sou [Seu Nome], da [Loja]. Sempre que precisar de ajuda para montar looks, encontrar alguma peça específica ou ficar por dentro das novidades, pode me chamar. Será um prazer te atender! 👊',
          },
        ],
      },
      {
        titulo: '3. Para quem segue a loja',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Vi que você já acompanha a gente faz um tempo e fiquei curioso... Você já conhece nossa loja pessoalmente ou nos encontrou apenas pelo Instagram?',
          },
        ],
      },
      {
        titulo: '4. Amigos de clientes',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Tudo certo? O [Nome do Cliente] comentou que você curte esse estilo de roupa e achei legal me apresentar. Sou [Seu Nome], da [Loja]. Trabalhamos com moda masculina e atendimento personalizado. Não estou te chamando para comprar nada agora, só queria abrir essa conexão. 👊',
          },
        ],
      },
      {
        titulo: '5. Com curiosidade',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Posso te fazer uma pergunta rápida? Hoje, quando você precisa comprar roupa, qual costuma ser sua maior dificuldade? Encontrar modelagem? Encontrar qualidade? Encontrar atendimento? Gosto de entender isso porque ajuda muito a atender melhor cada cliente.',
          },
        ],
      },
      {
        titulo: '6. Para empresário',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Vi que você trabalha com [área]. Atendemos muitos empresários aqui da cidade e uma coisa que escuto bastante é a dificuldade de encontrar roupas que sirvam tanto para o trabalho quanto para momentos mais descontraídos. Você costuma ter essa dificuldade também?',
          },
        ],
      },
      {
        titulo: '7. Para quem treina (academia)',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Vi que você treina firme. Me surgiu uma curiosidade... Quando vai sair depois do treino ou no final de semana, qual estilo de roupa você costuma usar?',
          },
        ],
      },
      {
        titulo: '8. Convite para conhecer a loja',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Quando tiver um tempo, passa aqui tomar um café com a gente. Sem compromisso nenhum. Quero te mostrar a loja, entender seu estilo e conhecer você melhor. Vai ser um prazer receber você. 👊',
          },
        ],
      },
      {
        titulo: '9. Reativação de seguidor frio',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Passando para saber uma coisa... Você continua acompanhando nossas novidades por aqui ou o Instagram anda escondendo nossos conteúdos? 😂',
          },
        ],
      },
      {
        titulo: '10. Mensagem forte para gerar visita',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Essa semana chegaram várias novidades que têm muito o perfil dos clientes que costumam comprar aqui. Antes de te mostrar qualquer peça, queria entender: qual tipo de roupa você mais usa hoje? Trabalho? Casual? Final de semana? Eventos?',
          },
        ],
      },
    ],
  },

  {
    slug: 'mensagens-datas-fechamento',
    titulo: 'Aniversário, Datas e Fechamento',
    descricao: 'Modelos para aniversariantes, datas/coleções e como levar a conversa até a venda.',
    secoes: [
      {
        titulo: 'Como usar',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'Complementos das abordagens: aniversário, datas comemorativas, lançamento de coleção, uma versão mais neutra (para clientes mais formais) e o roteiro do que falar depois que o cliente responde. Personalize com [Nome] e [Seu Nome].',
          },
        ],
      },
      {
        titulo: 'Aniversário — versão descontraída',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Hoje é dia de quê? É dia de VOCÊ! 🎉 Passei aqui só pra te desejar um feliz aniversário e dizer que separei uma condição especial pra você comemorar com a gente. Quer que eu te mostre?',
          },
        ],
      },
      {
        titulo: 'Aniversário — versão neutra',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Oi, [Nome]! Tudo bem? Passando para te desejar um feliz aniversário! 🎉 Preparamos um mimo especial pra você comemorar com a gente — quando quiser, é só me chamar que te conto.',
          },
        ],
      },
      {
        titulo: 'Data comemorativa — Dia dos Pais',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Tá chegando o Dia dos Pais e a gente preparou umas opções de presente que são a cara do seu pai (e que ele vai usar de verdade). Quer que eu separe algumas e te mande? Se preferir, monto um kit já embrulhado.',
          },
        ],
      },
      {
        titulo: 'Data comemorativa — Black Friday',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Nossa Black Friday já começou e as melhores peças costumam sair rápido. Antes de lotar, quis te avisar primeiro. Quer que eu separe os tamanhos no teu estilo pra você garantir?',
          },
        ],
      },
      {
        titulo: 'Lançamento de coleção',
        blocos: [
          {
            tipo: 'citacao',
            texto:
              'Fala, [Nome]! Chegou a coleção nova e tem peça que é muito a tua cara. Tô liberando pros clientes mais próximos verem antes de todo mundo. Quer que eu te mande um preview?',
          },
        ],
      },
      {
        titulo: 'Versão neutra (para clientes mais formais)',
        blocos: [
          {
            tipo: 'paragrafo',
            texto: 'Quando o cliente for mais reservado, troque o "mano/fala" por um tom mais elegante:',
          },
          {
            tipo: 'citacao',
            texto:
              'Olá, [Nome]! Tudo bem? Aqui é o [Seu Nome], da ZYNK. Chegaram novidades que combinam bastante com o seu estilo e lembrei de você. Quando tiver um tempo, posso te mostrar algumas opções?',
          },
        ],
      },
      {
        titulo: 'Depois que o cliente responde (continuação)',
        blocos: [
          { tipo: 'subtitulo', texto: 'Se demonstrou interesse' },
          {
            tipo: 'citacao',
            texto:
              'Show! Já vou separar 2 ou 3 opções no seu tamanho. Prefere receber por aqui (foto/vídeo) ou passar na loja pra experimentar com calma?',
          },
          { tipo: 'subtitulo', texto: 'Se respondeu morno' },
          {
            tipo: 'citacao',
            texto: 'Tranquilo! Deixa eu te mandar só uma foto rapidinha — se não for a sua cara, sem problema. Posso?',
          },
          { tipo: 'subtitulo', texto: 'Se sumiu de novo' },
          {
            tipo: 'citacao',
            texto: 'Sem pressa! Quando bater a vontade de renovar o guarda-roupa, é só me chamar. Tô por aqui. 👊',
          },
        ],
      },
      {
        titulo: 'Chamadas para ação (use sempre uma)',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Passa aqui essa semana que te mostro pessoalmente.',
              'Quer que eu separe e deixe reservado no teu nome?',
              'Te mando por aqui ou prefere ver na loja?',
              'Posso te enviar um condicional, sem compromisso?',
            ],
          },
        ],
      },
      {
        titulo: 'Boas práticas e cuidados',
        blocos: [
          {
            tipo: 'lista',
            itens: [
              'Mande no máximo ~25 a 30 contatos por dia (não vire spam).',
              'Sempre personalize com o nome — nada de mensagem genérica copiada.',
              'Áudio primeiro; texto só se a pessoa não responder.',
              'Termine quase sempre com uma chamada para ação (CTA).',
              'Escolha o tom (descontraído ou neutro) conforme o perfil do cliente.',
              'Anote quem você contatou (prospecção e pós-venda), para acompanhar o retorno.',
            ],
          },
        ],
      },
    ],
  },

  {
    slug: 'diagnostico',
    titulo: 'Diagnóstico & Fast Plan',
    descricao: 'Resumo estratégico e iniciativas de ganho rápido da loja.',
    publico: 'gestor',
    secoes: [
      {
        titulo: 'Resumo Atual',
        blocos: [
          {
            tipo: 'paragrafo',
            texto:
              'As ações de curto prazo para os próximos 30 dias serão focadas em estrutura e performance. O primeiro passo é criar e aplicar uma rotina operacional clara, com acompanhamento diário e uso de checklists. Em paralelo, será realizado um treinamento intensivo de atendimento para humanizar e qualificar o presencial, estimulando vínculo e continuidade nas conversas.',
          },
          {
            tipo: 'paragrafo',
            texto:
              'Também será feita a revisão completa do funil de vendas online, mapeando o percurso do cliente desde o primeiro contato até o fechamento. Por fim, serão definidas metas de faturamento e indicadores de performance — presencial e digital — para direcionar a equipe e mensurar resultados.',
          },
        ],
      },
      {
        titulo: 'Iniciativas de Ganho Rápido (IGRs)',
        blocos: [
          { tipo: 'subtitulo', texto: '1.0 Rotina de Vendas' },
          {
            tipo: 'paragrafo',
            texto:
              'Criada a partir do funil de vendas, ajuda todos os colaboradores a fazer a loja rodar sem cobrança constante. Deve ser feita todos os dias, seguindo passos e horários, com anotações de prospecção e pós-venda (nomes dos clientes contatados).',
          },
          { tipo: 'subtitulo', texto: '2.0 Rotina de Conduta da Loja' },
          {
            tipo: 'paragrafo',
            texto:
              'Aplicada para que os funcionários não sigam só as regras, mas saibam como segui-las, com explicação clara e detalhada — para maior entendimento e bem-estar de toda a equipe.',
          },
          { tipo: 'subtitulo', texto: '3.0 Meta de Prospecção' },
          {
            tipo: 'paragrafo',
            texto:
              '30 contatos por dia com áudio, através da lista de clientes da base e de novas captações em lugares movimentados da cidade, onde há maior número de pessoas com o perfil de estilo da loja.',
          },
        ],
      },
      {
        titulo: 'Fast Plan — Treinamentos (links externos)',
        blocos: [
          { tipo: 'subtitulo', texto: 'Vendas' },
          {
            tipo: 'paragrafo',
            texto:
              'Aulas de performance em vendas (tutorias comerciais) que auxiliam no atendimento presencial e online, ensinando como se comportar e como mandar áudios de prospecção e de pós-venda.',
          },
          { tipo: 'subtitulo', texto: 'Instagram / Produção de Conteúdo' },
          {
            tipo: 'paragrafo',
            texto:
              'Aulas sobre criação de conteúdo para o Instagram da loja, para montar postagens que gerem retorno do público-alvo.',
          },
          { tipo: 'subtitulo', texto: 'Pós-Venda' },
          {
            tipo: 'paragrafo',
            texto:
              'O pós-venda é um dos maiores meios de retorno de clientes e de aumento do ticket médio, pois o cliente entende o valor da peça e do atendimento de qualidade.',
          },
          {
            tipo: 'paragrafo',
            texto:
              'Os links das aulas (plataforma Varejo Pro / Astron Members) estão no PDF original do Diagnóstico, com o gestor.',
          },
        ],
      },
    ],
  },
]

export function getManual(slug: string): Manual | undefined {
  return MANUAIS.find((m) => m.slug === slug)
}

// Lista de manuais visíveis para o perfil. Gestor vê tudo; vendedor não vê
// os manuais marcados como 'gestor'.
export function manuaisVisiveis(isGestor: boolean): Manual[] {
  return MANUAIS.filter((m) => !m.oculto && (isGestor || m.publico !== 'gestor'))
}

// Retorna o manual com as seções filtradas conforme o perfil. Devolve
// undefined se o manual inteiro não for visível para o perfil.
export function getManualVisivel(slug: string, isGestor: boolean): Manual | undefined {
  const manual = getManual(slug)
  if (!manual) return undefined
  if (manual.oculto) return undefined
  if (!isGestor && manual.publico === 'gestor') return undefined
  if (isGestor) return manual
  return { ...manual, secoes: manual.secoes.filter((s) => s.publico !== 'gestor') }
}

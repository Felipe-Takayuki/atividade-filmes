// ============================================================
//  P1 — Relatório bimestral de atividades (entrega INDIVIDUAL)
//  ISW055 · Introdução à Computação em Nuvem · Fatec Pompeia · 2026.2
//  Aluno: Felipe Takayuki Tanaka Takahashi
// ============================================================

// ---------- DADOS DO ALUNO ----------
#let aluno = "Felipe Takayuki Tanaka Takahashi"
#let turma = "161_SIST. INTELIGENTES_N"
#let data-relatorio = "07/10/2026"

// ---------- configurações gerais ----------
#let disciplina = "Introdução à Computação em Nuvem"
#let codigo = "ISW055"
#let professor = "Prof. Allan Lincoln Rodrigues Siriani"
#let accent = rgb("#b96f1f")

#set document(title: "P1 — " + codigo + " — " + aluno, author: aluno)
#set page(paper: "a4", margin: (top: 2.2cm, bottom: 2.2cm, left: 2.5cm, right: 2cm))
#set text(size: 10pt, lang: "pt", region: "BR")
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => { v(0.5em); text(size: 14pt, it); v(0.2em) }
#show heading.where(level: 2): it => { v(0.4em); text(size: 12pt, it); v(0.1em) }
#show link: set text(fill: accent)
#show figure.caption: set text(size: 8.5pt, fill: luma(90))
#set table(stroke: 0.5pt + luma(200), inset: 5pt)
#show table: set text(hyphenate: false)
#show table: set par(justify: false)

#let evidencia(legenda, arquivo: none, altura: auto, largura: 100%, pagina: 1) = figure(
  if arquivo == none {
    rect(width: 100%, height: 4.5cm, radius: 4pt, stroke: (paint: luma(170), dash: "dashed"))[
      #align(center + horizon)[#text(fill: luma(130), size: 9pt)[Sem imagem]]
    ]
  } else {
    if altura == auto {
      image(arquivo, width: largura, page: pagina, fit: "contain")
    } else {
      image(arquivo, width: largura, height: altura, page: pagina, fit: "contain")
    }
  },
  kind: image,
  supplement: [Figura],
  caption: legenda,
)

#let registro = state("registro", ())

#let ficha-header(
  numero, titulo,
  descricao: "",
  planejada: "",
  realizada: "—",
  situacao: "entregue",
  evidencia-desc: "",
  url: "",
) = {
  registro.update(l => l + ((
    numero: numero, titulo: titulo, descricao: descricao,
    planejada: planejada, realizada: realizada, situacao: situacao,
  ),))
  heading(level: 2, [Atividade #numero — #titulo])
  table(
    columns: (3.2cm, 1fr),
    fill: (x, y) => if x == 0 { luma(245) } else { none },
    [*Descrição*], [#descricao],
    [*Data planejada*], [#planejada],
    [*Data realizada*], [#realizada],
    [*Situação*], [#situacao],
    [*Evidência*], [#evidencia-desc],
    [*Link*], [#if url == "" [—] else [#link(url)]],
  )
  v(0.2em)
}

// ============================================================
//  CAPA
// ============================================================
#align(center)[
  #v(2.5cm)
  #text(size: 12pt, tracking: 0.12em)[FATEC POMPEIA — SHUNJI NISHIMURA]
  #v(0.4em)
  #text(size: 10.5pt, fill: luma(110))[#disciplina · #codigo · #turma]
  #v(4cm)
  #text(size: 26pt, weight: "bold")[P1]
  #v(0.3em)
  #text(size: 18pt, weight: "bold")[Relatório bimestral de atividades]
  #v(0.8em)
  #text(size: 11pt, fill: luma(110))[Avaliação individual de prestação de contas · 2026.2]
  #v(4.5cm)
  #text(size: 14pt, weight: "medium")[#aluno]
  #v(1fr)
  #text(size: 10.5pt)[#professor \ Pompeia, #data-relatorio]
]

#set page(
  numbering: "1",
  number-align: right,
  header: context {
    set text(size: 8pt, fill: luma(120))
    [#codigo · P1 — Relatório bimestral #h(1fr) #aluno]
    line(length: 100%, stroke: 0.4pt + luma(200))
  },
)
#counter(page).update(1)

#outline(title: "Sumário", indent: 1.2em, depth: 2)
#pagebreak()

// ============================================================
= Introdução
// ============================================================

A disciplina de Introdução à Computação em Nuvem (ISW055), ministrada pelo Prof. Allan Lincoln Rodrigues Siriani na Faculdade de Tecnologia de Pompeia (Fatec), tem como objetivo central capacitar os estudantes nos fundamentos práticos da engenharia de software distribuída, padrões de microsserviços, isolamento por conteinerização e infraestrutura escalável em nuvem. Ao longo do primeiro bimestre do semestre letivo de 2026.2, a disciplina adotou uma metodologia de aprendizado baseada na evolução incremental e contínua de um ecossistema real de aplicações, partindo de um monólito inicial de nivelamento em sala até a orquestração de uma plataforma moderna baseada em múltiplos serviços independentes.

O projeto fio condutor do bimestre consistiu no desenvolvimento de um sistema completo de Catálogo de Filmes com foco na filmografia do ator Tom Hanks, alimentado de forma dinâmica pela API pública do The Movie Database (TMDB). Esse sistema evoluiu iterativamente através de entregas semanais planejadas, incorporando de ponta a ponta o desacoplamento de serviços, autenticação centralizada com JSON Web Tokens (JWT), fluxo seguro de recuperação de senha por e-mail transacional, autorização baseada em papéis (RBAC com enforcement HTTP 403), observabilidade com microsserviço de auditoria sobre Redis Streams e armazenamento de arquivos de mídia (avatares de perfil) em Object Storage compatível com AWS S3 (MinIO).

Este relatório consolida e presta contas de todas as atividades desenvolvidas e entregues individualmente pelo aluno durante o período avaliado. O documento está organizado em seções rigorosas que apresentam: a metodologia de desenvolvimento e rastreamento; o quadro sinóptico de entregas confrontando as datas planejadas e as datas efetivamente realizadas; as fichas detalhadas de cada atividade com a fundamentação técnica das decisões arquiteturais e suas respectivas evidências visuais (histórico de commits no Git, vínculos com as issues oficiais no GitHub e registros do sistema em execução); as atividades extras de observabilidade; e as considerações finais sobre as lições aprendidas.

// ============================================================
= Metodologia
// ============================================================

O ciclo de desenvolvimento de todas as atividades foi pautado pelas melhores práticas da indústria de software em termos de versionamento semântico, rastreabilidade bidirecional e isolamento de dependências. Com exceção do nivelamento inicial da Atividade 1 (desenvolvido presencialmente em sala de aula com repositório dedicado `Felipe-Takayuki/lista-de-produtos`), todas as entregas do projeto do catálogo de filmes foram construídas de forma estritamente cumulativa no mesmo repositório público do GitHub (`Felipe-Takayuki/atividade-filmes`). Essa abordagem garantiu a integridade histórica da arquitetura, demonstrando como cada microsserviço foi introduzido sem quebrar os requisitos funcionais estabelecidos anteriormente.

O ambiente de desenvolvimento e testes foi executado em ambiente Linux (distribuição Fedora), adotando o Docker e o Docker Compose como base padronizada de conteinerização. A infraestrutura foi configurada com isolamento rigoroso de redes virtuais (`app-network` em modo bridge): apenas a porta pública `:3000` do serviço de catálogo foi exposta para o host, enquanto os demais componentes (`auth-service`, `log-service`, `redis`, `mariadb` e `minio`) operaram estritamente em rede interna via diretivas `expose`, prevenindo a exposição indevida de superfícies de ataque e conflitos de portas em ambientes compartilhados como o Portainer.

Para atender aos critérios de transparência e auditoria exigidos pelo professor, a coleta das datas e horas das entregas baseou-se estritamente em duas fontes verificáveis: o histórico criptográfico de commits do Git e o registro público de Issues no GitHub. Os carimbos de data e hora foram conferidos através do comando oficial `git log -1 --date=format:"%d/%m/%Y %H:%M" --format="%h %ad"` executado no terminal local e cruzados com as Issues abertas no repositório (`issues #1, #2, #3, #4 e #5`). Para cada atividade, foram consolidados dois tipos de evidências: o print do terminal demonstrando o hash do commit, o autor, a data/hora e o repositório remoto; e o print do sistema em execução, comprovando o correto funcionamento das regras de negócio, telas da interface e tratamentos de segurança.

#pagebreak()

// ============================================================
= Quadro de entregas
// ============================================================

A tabela a seguir consolida o cronograma oficial de entregas do primeiro bimestre, confrontando as datas planejadas divulgadas no plano de ensino com as datas e horas reais de submissão comprovadas nas fichas da seção seguinte.

#context {
  let l = registro.final()
  table(
    columns: (auto, 1.4fr, 2fr, 2.4cm, 2.8cm, 2.1cm),
    align: (center, left, left, center, center, center),
    fill: (x, y) => if y == 0 { luma(235) } else { none },
    table.header([*Nº*], [*Atividade*], [*Descrição*], [*Data \ planejada*], [*Data \ realizada*], [*Situação*]),
    ..l.map(a => (
      [#a.numero], [#a.titulo], [#text(size: 8.5pt)[#a.descricao]],
      [#a.planejada], [#a.realizada], [#a.situacao],
    )).flatten()
  )
}

#pagebreak()

// ============================================================
= Atividades realizadas
// ============================================================

// ---------- ATIVIDADE 1 (Página 1/2) ----------
#ficha-header(
  "1", "Agenda telefônica em Flask",
  descricao: "Nivelamento em sala: sistema monolítico Flask + Jinja com persistência em JSON e migração para MySQL.",
  planejada: "07/08/2026",
  realizada: "07/08/2026 21:00",
  situacao: "entregue",
  evidencia-desc: "Realizada em sala — print do histórico de arquivos e do sistema web Flask rodando",
  url: "https://github.com/Felipe-Takayuki/lista-de-produtos",
)

*O que foi feito.* Durante a aula presencial de nivelamento na Fatec, foi construída uma aplicação web monolítica utilizando a linguagem Python com o microframework Flask e motor de templates Jinja2. O sistema teve como propósito gerenciar uma lista de registros telefônicos/contatos, implementando as operações CRUD completas aderentes ao protocolo HTTP e padrões REST: `POST` para novo cadastro, `GET` para listagem de registros ativos, `PUT` para atualização de dados cadastrais e `DELETE` para envio de itens à lixeira lógica (*soft delete*). A arquitetura inicial baseou-se na persistência de dados em arquivo local JSON (`banco.json`) com campos cronológicos de auditoria (`created_at`, `updated_at`, `deleted_at`). Na sequência do aprendizado, a aplicação foi evoluída com container Docker, conexão relacional via PyMySQL, script DDL de criação de tabelas (`schema.sql`) e orquestração no Docker Compose com variáveis de ambiente configuradas para deploy no Portainer.

#evidencia([Atividade 1 — evidência da entrega (repositório lista-de-produtos e timestamp da aula em 07/08/2026)], arquivo: "prints/atv1-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 1 (Página 2/2) ----------
#evidencia([Lista Telefônica — Contatos Ativos (CRUD)], arquivo: "prints/Lista Telefônica _ Agenda de Contatos.pdf", pagina: 2, altura: 7.2cm)

#evidencia([Lista Telefônica — Lixeira lógica (Soft Delete)], arquivo: "prints/Lista Telefônica - Lixeira _ Agenda de Contatos.pdf", pagina: 2, altura: 5.8cm)

*Dificuldades e como foram resolvidas.* O principal desafio técnico consistiu em modelar a alternância entre itens ativos e itens na lixeira sem incorrer na perda permanente de dados durante a manipulação em JSON. A solução adotada foi a implementação do padrão de *soft delete*, marcando os registros com status `"apagado"` e registrando a data de exclusão, criando endpoints segregados (`/dados` para ativos e `/lixeira` para restauração/hard delete). Essa abordagem simplificou a migração posterior para as tabelas relacionais do MySQL.

#pagebreak()

// ---------- ATIVIDADE 2 (Página 1/2) ----------
#ficha-header(
  "2", "Catálogo de filmes — Tom Hanks",
  descricao: "Consumo da API TMDB, persistência em MariaDB e segregação de favoritos e notas por usuário.",
  planejada: "20/08/2026",
  realizada: "20/08/2026 16:34",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit 230de48 + README + Issue #1 + print do catálogo",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/issues/1",
)

*O que foi feito.* Nesta atividade inicial do projeto semestral, foi concebido o Catálogo de Filmes do ator Tom Hanks, integrando dinamicamente a API pública internacional do The Movie Database (TMDB). A aplicação foi estruturada com backend em Node.js/Express e persistência relacional no MariaDB 10.11. O sistema implementou autenticação segura através de JSON Web Tokens (JWT) trafegados em cookies HTTP-only, permitindo a segregação estrita dos dados: cada usuário cadastrado possui sua própria lista privada de filmes favoritos e pode publicar notas e comentários pessoais nos filmes listados. Foi desenvolvido o arquivo `docker-compose.yml` para orquestrar os serviços `catalogo` (porta pública `:3000`) e `mariadb` em rede interna privada. A entrega foi formalizada no repositório público com menção ao professor no README e abertura da Issue \#1 (`entrega da atividade`).

#evidencia([Atividade 2 — evidência da entrega (commit 230de48 e vínculo com a Issue #1 em 20/08/2026)], arquivo: "prints/atv2-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 2 (Página 2/2) ----------
#evidencia([Atividade 2 — resultado funcional (Catálogo de Filmes com Tom Hanks em execução no navegador)], arquivo: "prints/screenshot-2026-10-02_12-55-47.png", altura: 9cm)

*Dificuldades e como foram resolvidas.* Durante o deploy no ambiente do Portainer, foram identificados conflitos gerados por nomes estáticos de containers e vinculação desnecessária de portas do MariaDB diretamente na interface de rede do host. O problema foi sanado com o commit `230de48`, removendo o mapeamento de portas externas no banco de dados e padronizando variáveis de ambiente no Compose, viabilizando a inicialização limpa da stack na porta 3000.

#pagebreak()

// ---------- ATIVIDADE 3 (Página 1/2) ----------
#ficha-header(
  "3", "Desacoplando o login — microsserviço de autenticação",
  descricao: "Login, cadastro e esqueci-minha-senha em microsserviço à parte na rede interna do Docker com tokens de 30 min.",
  planejada: "28/08/2026",
  realizada: "28/08/2026 13:56",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit 6d5adcb + docker-compose.yml + Issue #2 + prints do Mailtrap",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/issues/2",
)

*O que foi feito.* Realizou-se a primeira grande refatoração arquitetural do sistema, desacoplando completamente as responsabilidades de controle de identidade do monólito e criando o `auth-service` como um microsserviço independente em diretório e container próprio. O novo serviço assumiu o ciclo de vida completo de cadastro de usuários com hash criptográfico bcrypt, autenticação com geração de tokens JWT e o fluxo de recuperação de senha ("Esqueci minha senha"). Para isso, foram criados tokens aleatórios seguros de 32 bytes armazenados na tabela `reset_tokens` com validade estrita de 30 minutos e invalidação imediata após o primeiro uso (`usado = TRUE`). A infraestrutura foi orquestrada no Docker Compose com a rede bridge `app-network`: o container `auth-service` opera isolado com `expose: ["4000"]` (sem portas publicadas para o host), enquanto o `catalogo` atua como proxy reverso e gateway de entrada. O fluxo foi comprovado com envio real de e-mails via Mailtrap e registrado detalhadamente na Issue \#2.

#evidencia([Atividade 3 — evidência da entrega (commit 6d5adcb e documentação da Issue #2 em 28/08/2026)], arquivo: "prints/atv3-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 3 (Página 2/2) ----------
#evidencia([Tela de Login com auth-service isolado na rede interna], arquivo: "prints/screenshot-2026-10-02_13-01-16.png", altura: 6.8cm)

#evidencia([Recuperação de Senha com link de uso único e validade de 30 min], arquivo: "prints/screenshot-2026-10-02_13-01-25.png", altura: 6.8cm)

*Dificuldades e como foram resolvidas.* O desafio consistiu em garantir que requisições originadas no navegador cliente conseguissem consumir as operações de autenticação sem expor o `auth-service` publicamente na internet. A solução foi implementar um cliente HTTP interno no backend do catálogo (`AUTH_SERVICE_URL=http://auth-service:4000`), encaminhando cabeçalhos de autorização e tratando erros de rede com respostas padronizadas, além de validar no frontend a rejeição de links expirados ou já consumidos.

#pagebreak()

// ---------- ATIVIDADE 4 (Página 1/2) ----------
#ficha-header(
  "4", "Controle de acesso por papel — RBAC",
  descricao: "Autorização baseada em papéis com enforcement no backend (403 para usuário comum), moderação e promoção.",
  planejada: "04/09/2026",
  realizada: "04/09/2026 16:50",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit e5228cc + Issue #3 + moderação admin e bloqueio 403",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/issues/3",
)

*O que foi feito.* Implementou-se um sistema completo de Controle de Acesso Baseado em Papéis (RBAC - *Role-Based Access Control*), estruturado em torno de dois níveis hierárquicos: `usuario` (papel padrão atribuído automaticamente aos novos cadastros, com permissão para visualizar o catálogo, gerenciar sua própria lista de favoritos e criar/excluir apenas seus próprios comentários) e `admin` (administrador do sistema com poderes de moderação global de comentários e concessão de privilégios a outros usuários). Foi adotado o padrão arquitetural de *Enforcement Centralizado* (Padrão A), no qual cada operação sensível consulta o papel em tempo real no banco/auth-service, garantindo revogação ou concessão imediata de permissões. O backend rejeita terminantemente requisições não autorizadas com código HTTP `403 Forbidden` (`FORBIDDEN_NOT_ADMIN`). Na interface gráfica (React), foram introduzidos badges visuais (`admin` em dourado e `usuario` em azul), botões contextuais de moderação e o modal administrativo `Promover Admin por E-mail`, tudo documentado na Issue \#3.

#evidencia([Atividade 4 — evidência da entrega (commit e5228cc e submissão da Issue #3 em 04/09/2026)], arquivo: "prints/atv4-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 4 (Página 2/2) ----------
#evidencia([Moderação de comentários por ADMIN], arquivo: "prints/screenshot-2026-10-02_12-56-02.png", altura: 6.8cm)

#evidencia([Promoção de usuários para ADMIN], arquivo: "prints/screenshot-2026-10-02_12-56-34.png", altura: 6.8cm)

*Dificuldades e como foram resolvidas.* Um ponto crítico de segurança foi evitar vulnerabilidades de atribuição em massa (*mass assignment*), na qual requisições maliciosas enviadas via cURL ou Postman para o endpoint de cadastro tentassem injetar o atributo `role: "admin"`. Para eliminar esse risco, a rota `POST /api/auth/register` foi blindada no servidor, forçando irrevogavelmente o valor `role = 'usuario'` para todo novo registro e exigindo que qualquer elevação de cargo seja autenticada e disparada exclusivamente pela rota interna protegida de administração.

#pagebreak()

// ---------- ATIVIDADE 5 (Página 1/2) ----------
#ficha-header(
  "5", "Logs e auditoria",
  descricao: "Novo microsserviço log-service com Redis Streams (XADD/XREVRANGE) registrando logins, ações e tentativas 403.",
  planejada: "25/09/2026",
  realizada: "10/09/2026 15:48",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit b024bb0 + Issue #4 + log-service e Redis Streams",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/issues/4",
)

*O que foi feito.* Criação e integração do terceiro microsserviço da arquitetura: o `log-service` (porta interna `:5000`), desenvolvido em Node.js e acoplado a uma instância do banco NoSQL Redis 7 com persistência contínua AOF (*Append-Only File*). O serviço foi projetado para registrar de maneira centralizada e assíncrona todas as trilhas de auditoria da plataforma através de Redis Streams via comando nativo `XADD` sobre a chave `audit:events`. O sistema monitora ativamente operações como login, logout, adição/remoção de favoritos, criação/exclusão de comentários e, criticamente, incidentes de segurança com o evento `acao_negada_403`. Como bônus de rastreabilidade, cada registro captura o endereço IP de origem do cliente e dados contextuais da requisição. Para consulta, foi criada a rota administrativa `GET /api/logs`, restrita ao papel `admin` (com proteção RBAC 403), que lê a stream em ordem cronológica inversa usando `XREVRANGE` e alimenta um modal interativo na interface web. A atividade foi entregue e homologada na Issue \#4 com 15 dias de antecedência.

#evidencia([Atividade 5 — evidência da entrega (commit b024bb0 e Issue #4 entregue com 15 dias de antecedência)], arquivo: "prints/atv5-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 5 (Página 2/2) ----------
#evidencia([Atividade 5 — resultado funcional (painel de auditoria do log-service com Redis Streams e IPs de origem)], arquivo: "prints/screenshot-2026-10-02_12-56-49.png", altura: 9cm)

*Dificuldades e como foram resolvidas.* Havia a preocupação de que lentidões na escrita de logs de auditoria pudessem degradar o tempo de resposta percebido pelo usuário final no catálogo. Esse problema foi solucionado desacoplando os disparos de log no backend através de chamadas HTTP não-bloqueantes (*fire-and-forget*), protegidas com cláusulas `catch` e timeouts curtos (2 segundos), garantindo que a aplicação permaneça perfeitamente funcional mesmo caso o serviço de logs sofra manutenções.

#pagebreak()

// ---------- ATIVIDADE 6 (Página 1/2) ----------
#ficha-header(
  "6", "Upload e perfil de usuário",
  descricao: "Página de perfil com avatar no MinIO Object Storage (S3), metadados no MariaDB e proteção estrita RBAC 403.",
  planejada: "02/10/2026",
  realizada: "22/09/2026 15:38",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit cb238c8 + Issue #5 + MinIO e perfil com foto",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/issues/5",
)

*O que foi feito.* Implementação da arquitetura de Armazenamento de Objetos (*Object Storage*) compatível com o protocolo AWS S3, introduzindo o container MinIO com volume dedicado `minio-data` e bucket `catalogo-perfil`. Foi desenvolvida a funcionalidade completa de perfil do usuário: upload de avatares com validação rigorosa de mime-type (apenas imagens) e limite máximo de 5MB utilizando a biblioteca Multer; envio do binário diretamente para o MinIO gerando chaves determinísticas de objeto (`avatars/user-ID-timestamp.png`); e persistência relacional leve no MariaDB, que armazena exclusivamente a referência da foto (`foto_key`), o nome e a biografia do usuário. Para a segurança, aplicou-se o princípio da confiança zero: o backend confere o token JWT e bloqueia qualquer tentativa de um usuário consultar e-mails ou alterar o perfil de terceiros com código HTTP `403 Forbidden` (`FORBIDDEN_PROFILE_EDIT`). No README e na Issue \#5 foi documentada uma profunda análise de trade-offs entre buckets de leitura pública versus URLs pré-assinadas com HMAC, acompanhada de 10 testes automatizados aprovados e entrega realizada com 10 dias de antecedência.

#evidencia([Atividade 6 — evidência da entrega (commit cb238c8 e submissão da Issue #5 com 10 dias de antecedência)], arquivo: "prints/atv6-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE 6 (Página 2/2) ----------
#evidencia([Atividade 6 — resultado funcional (perfil com foto no MinIO, bio, dados e teste de proteção 403)], arquivo: "prints/screenshot-2026-10-02_12-56-18.png", altura: 9cm)

*Dificuldades e como foram resolvidas.* Em ambientes de hospedagem compartilhados, a porta padrão `:9000` do MinIO conflitou diretamente com a porta da API do Portainer pré-instalado na máquina. A dificuldade foi resolvida no Docker Compose eliminando a publicação de portas externas no host (`expose: ["9000", "9001"]`) e desenvolvendo uma rota interna de proxy seguro no backend do catálogo (`GET /api/profile/avatar/:fotoKey`), permitindo servir os avatares aos navegadores clientes de forma universal sem qualquer interferência de rede.

#pagebreak()

// ============================================================
= Atividades extras (opcional)
// ============================================================

// ---------- ATIVIDADE EXTRA E3 (Página 1/2) ----------
#ficha-header(
  "E3", "Observabilidade — health checks e métricas",
  descricao: "Endpoints de saúde e integridade em cascata (/api/health) e dependência com service_healthy no Docker Compose.",
  planejada: "sem prazo",
  realizada: "10/09/2026 15:48",
  situacao: "entregue",
  evidencia-desc: "GitHub — commit 8bf0461 + endpoints /health em cascata + README oficial",
  url: "https://github.com/Felipe-Takayuki/atividade-filmes/commit/8bf0461",
)

*O que foi feito.* Implementação de uma esteira robusta de verificação de integridade (*health checks*) distribuída entre os microsserviços do sistema. Foi criado o endpoint mestre `GET /api/health` no catálogo, complementado pelos endpoints `/health` no `auth-service` e no `log-service`. A rota inspeciona ativamente o status da conexão com a base relacional MariaDB executando a query `SELECT 1`, afere a latência e conectividade HTTP interna com o serviço de autenticação, valida a disponibilidade do serviço de logs e verifica a persistência dos streams no Redis. No arquivo `docker-compose.yml`, configurou-se uma checagem periódica nativa para o Redis (`redis-cli ping` a cada 5 segundos), instruindo o `log-service` a depender explicitamente da condição `condition: service_healthy`, garantindo que o cluster inicialize em ordem determinística sem race conditions.

#evidencia([Atividade E3 — evidência da entrega (commit 8bf0461 instrumentando a observabilidade em cascata)], arquivo: "prints/extra-e3-entrega.png", altura: 5.6cm)

#pagebreak()

// ---------- ATIVIDADE EXTRA E3 (Página 2/2) ----------
#evidencia([Atividade E3 — resultado (resposta JSON estruturada do health check /api/health)], arquivo: "prints/extra-e3-resultado.png", altura: 9cm)

*Dificuldades e como foram resolvidas.* O desafio foi estruturar a resposta do health check de modo que uma falha transitória em um serviço secundário não derrubasse a resposta geral do endpoint principal. A solução foi encapsular as chamadas internas com `AbortSignal.timeout(2000)` e categorizar o status dos serviços em três níveis (`connected`, `degraded`, `offline`), permitindo que a equipe de operações identifique imediatamente qual elo da infraestrutura demanda atenção.

#pagebreak()

// ============================================================
= Considerações finais
// ============================================================

A trajetória percorrida ao longo do primeiro bimestre de Introdução à Computação em Nuvem consolidou um salto qualitativo fundamental na maturidade técnica do desenvolvimento de software em arquiteturas distribuídas. Mais do que assimilar conceitos teóricos sobre containers e microsserviços, a oportunidade de construir passo a passo o Catálogo de Filmes exigiu o enfrentamento diário de problemas reais de engenharia: particionamento de responsabilidades entre serviços, comunicação segura em redes isoladas do Docker, tratamento de latências e falhas parciais, além da clara distinção entre persistência relacional transacional (MariaDB), bancos em memória para auditoria (Redis Streams) e armazenamento de grandes objetos não estruturados (MinIO S3).

O aspecto de maior complexidade técnica enfrentado no período residiu na implementação do Controle de Acesso Baseado em Papéis (RBAC) combinado com o isolamento de rede e a compatibilidade com a infraestrutura do Portainer. Foi necessário auditar minuciosamente cada rota da API para impedir brechas como *mass assignment* e vazamento de informações entre usuários, garantindo que o backend fizesse o enforcement absoluto das regras de negócio através de respostas HTTP 403 Forbidden. Caso tivesse que reiniciar o projeto, teria adotado desde o primeiro momento a rota proxy para o MinIO e um gateway padronizado para as chamadas internas, evitando os ajustes retroativos de portas que foram necessários durante a Atividade 6.

Para o segundo bimestre, pretendo utilizar a sólida arquitetura estabelecida como alicerce para a evolução da plataforma, explorando automações com esteiras de Integração e Entrega Contínuas (CI/CD) no GitHub Actions, orquestração avançada e o fechamento do ciclo de produto com a implementação de planos de assinatura e monetização (SaaS com Stripe), assegurando que o sistema continue escalável, resiliente e altamente auditável.

#v(1.5cm)

// ============================================================
= Declaração de autoria
// ============================================================

Declaro que este relatório foi elaborado por mim, individualmente, e que as evidências apresentadas correspondem a entregas de minha autoria, verificáveis nos links informados. Nas atividades realizadas em grupo ou nivelamentos em sala, o conteúdo aqui descrito refere-se integralmente à minha participação e desenvolvimento técnico.

#v(2.5cm)
#grid(
  columns: (1fr, 1fr), gutter: 2cm,
  align(center)[#line(length: 100%, stroke: 0.5pt) \ #aluno],
  align(center)[#line(length: 100%, stroke: 0.5pt) \ Pompeia, #data-relatorio],
)

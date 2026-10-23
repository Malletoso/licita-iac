/* ===================== LICITA IAC — NÚCLEO (regras + peças) =====================
   Funções puras: não tocam no DOM. Testáveis em Node com a lib "docx".
   Base: Lei nº 14.133/2021; valores do Decreto nº 12.807/2025 (vigência 2026).   */

const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
const num = v => { if (v === '' || v === null || v === undefined) return 0; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
const has = v => v !== undefined && v !== null && String(v).trim() !== '';
const ph = (v, label) => has(v) ? String(v).trim() : '⟦' + label + '⟧';
const fmtBRL = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n, d = 2) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtData = iso => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-'); return d && m && y ? `${d}/${m}/${y}` : ''; };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataExtenso = iso => { if (!iso) return '⟦data⟧'; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}`; };
const hojeISO = () => { const d = new Date(); const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };
const diasEntre = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Natureza do objeto (eixo 1) ---------- */
const NAT = {
  compra:           { l: 'Compra de bens', comum: true,  cat: 'II' },
  servico_comum:    { l: 'Serviço comum', comum: true,  cat: 'II' },
  servico_especial: { l: 'Serviço especial', comum: false, cat: 'II' },
  tecnico:          { l: 'Serviço técnico especializado de natureza predominantemente intelectual', comum: false, cat: 'II' },
  eng_comum:        { l: 'Serviço comum de engenharia', comum: true,  cat: 'I', eng: true },
  eng_especial:     { l: 'Serviço especial de engenharia', comum: false, cat: 'I', eng: true },
  obra:             { l: 'Obra', comum: false, cat: 'I', eng: true },
  manut_veic:       { l: 'Manutenção de veículos automotores (inclui peças)', comum: true,  cat: 'I' },
  locacao_imovel:   { l: 'Locação ou aquisição de imóvel', comum: false, cat: null },
  alienacao:        { l: 'Alienação de bens', comum: false, cat: null }
};

const PARAM = {
  S:   'Tabela oficial de referência (SINAPI, SICRO, CDHU) — art. 23, §2º, I (obras e serviços de engenharia)',
  I:   'Painel de Preços / Banco de Preços em Saúde (PNCP) — art. 23, §1º, I',
  II:  'Contratações similares da Administração (último ano) — art. 23, §1º, II',
  III: 'Mídia especializada, tabela oficial ou sítio eletrônico — art. 23, §1º, III',
  IV:  'Pesquisa direta com fornecedores — art. 23, §1º, IV',
  V:   'Base nacional de notas fiscais eletrônicas — art. 23, §1º, V'
};

const REG_FEDERAL = [
  'Instrução Normativa SEGES/ME nº 65/2021 (pesquisa de preços)',
  'Instrução Normativa SEGES/ME nº 58/2022 (estudo técnico preliminar)',
  'Instrução Normativa SEGES/ME nº 81/2022 (termo de referência)',
  'Instrução Normativa SEGES/ME nº 67/2021 (dispensa eletrônica)',
  'Instrução Normativa SEGES/ME nº 73/2022 (licitação por menor preço ou maior desconto)',
  'Decreto federal nº 11.462/2023 (sistema de registro de preços)',
  'Decreto federal nº 11.878/2024 (credenciamento)'
];

const SRP_HIP = {
  I: 'as características do objeto exigem contratações frequentes',
  II: 'é conveniente a aquisição com entregas parceladas ou a contratação de serviços remunerados por unidade de medida ou em regime de tarefa',
  III: 'é conveniente o atendimento a mais de um órgão ou entidade',
  IV: 'pela natureza do objeto, não é possível definir previamente o quantitativo a ser demandado'
};

const ALINEAS_74III = {
  a: 'estudos técnicos, planejamentos, projetos básicos ou projetos executivos',
  b: 'pareceres, perícias e avaliações em geral',
  c: 'assessorias ou consultorias técnicas e auditorias financeiras ou tributárias',
  d: 'fiscalização, supervisão ou gerenciamento de obras ou serviços',
  e: 'patrocínio ou defesa de causas judiciais ou administrativas',
  f: 'treinamento e aperfeiçoamento de pessoal',
  g: 'restauração de obras de arte e de bens de valor histórico',
  h: 'controles de qualidade e tecnológico, análises, testes e ensaios de campo e laboratoriais, instrumentação e monitoramento de parâmetros específicos de obras e do meio ambiente e demais serviços de engenharia que se enquadrem nesta alínea'
};

/* ---------- Imagens (logo, brasão de Iacanga, marca d'água) ---------- */
const IMG = (typeof ASSETS !== 'undefined') ? ASSETS
  : (typeof require === 'function' ? (() => { try { return require('./assets.js'); } catch (e) { return {}; } })() : {});
const REV = (typeof procCorrigido === 'function') ? { procCorrigido }
  : (typeof require === 'function' ? (() => { try { return require('./revisor.js'); } catch (e) { return {}; } })() : {});
const setorLic = cfg => has(cfg.nomeLicitacao) ? cfg.nomeLicitacao : 'Secretaria de Licitação';
/* O número do processo é atribuído pela Licitação: no modo Secretaria não é pendência */
const numProc = (p, a, cfg) => has(p.numero) ? p.numero : (a && a.simples ? `a ser atribuído pela ${setorLic(cfg)}` : '⟦nº do processo⟧');
const brasaoURI = cfg => cfg.brasao === 'iacanga' ? IMG.brasaoIacanga : (cfg.brasao || '');
const brasaoProp = cfg => cfg.brasao === 'iacanga' ? (IMG.brasaoProporcao || 0.845) : (num(cfg.brasaoProp) || 0.85);

const UF_NOME = { AC: 'do Acre', AL: 'de Alagoas', AP: 'do Amapá', AM: 'do Amazonas', BA: 'da Bahia', CE: 'do Ceará', DF: 'Distrito Federal', ES: 'do Espírito Santo', GO: 'de Goiás', MA: 'do Maranhão', MT: 'de Mato Grosso', MS: 'de Mato Grosso do Sul', MG: 'de Minas Gerais', PA: 'do Pará', PB: 'da Paraíba', PR: 'do Paraná', PE: 'de Pernambuco', PI: 'do Piauí', RJ: 'do Rio de Janeiro', RN: 'do Rio Grande do Norte', RS: 'do Rio Grande do Sul', RO: 'de Rondônia', RR: 'de Roraima', SC: 'de Santa Catarina', SP: 'de São Paulo', SE: 'de Sergipe', TO: 'do Tocantins' };
/* Cabeçalho no padrão da Prefeitura: título sublinhado e linhas de contato */
function linhasCabecalho(cfg) {
  const uf = (cfg.uf || '').toUpperCase();
  const estado = uf === 'DF' ? 'Distrito Federal' : UF_NOME[uf] ? 'Estado ' + UF_NOME[uf] : '';
  return {
    titulo: cfg.nome || '',
    linhas: [
      { t: estado },
      { t: has(cfg.site) ? 'Site: ' + cfg.site : '' },
      { t: has(cfg.email) ? 'e-mail: ' + cfg.email : '' },
      { t: cfg.endereco || '', b: true },
      { t: [has(cfg.fone) ? 'Fone: ' + cfg.fone : '', has(cfg.cnpj) ? 'CNPJ: ' + cfg.cnpj : ''].filter(Boolean).join(' – '), b: true }
    ].filter(l => has(l.t))
  };
}

const DADOS_IACANGA = {
  nome: 'Prefeitura do Município de Iacanga', ente: 'Município de Iacanga', cnpj: '46.137.477/0001-14',
  endereco: 'Av. das Acácias, 149 – Jardim das Flores – 17180-418 – Iacanga – SP', fone: '(14) 3294-9400',
  email: 'pmiacanga@iacanga.sp.gov.br', site: 'www.iacanga.sp.gov.br', brasao: 'iacanga', decretoGestao: 'Decreto Municipal nº 1.528/2025'
};

/* ---------- Configuração do município ---------- */
function cfgPadrao() {
  return {
    id: 'm_' + uid(), nome: DADOS_IACANGA.nome, ente: DADOS_IACANGA.ente, cnpj: DADOS_IACANGA.cnpj, endereco: DADOS_IACANGA.endereco,
    fone: DADOS_IACANGA.fone, email: DADOS_IACANGA.email, marcaDagua: true, brasaoProp: '', nomeLicitacao: 'Secretaria de Licitação', decretoGestao: DADOS_IACANGA.decretoGestao,
    cidade: 'Iacanga', uf: 'SP', comarca: '', ate20mil: true, site: DADOS_IACANGA.site, diario: '', brasao: 'iacanga', plataforma: '',
    regulamento: 'federal', regulamentoTexto: '', dobro: false, desvioAlerta: 30,
    valores: { ano: 2026, norma: 'Decreto nº 12.807, de 29 de dezembro de 2025', d75i: 130984.20, d75ii: 65492.11, d75p7: 10478.74, verbal: 13098.41, tecnico: 392952.63, grandeVulto: 261968421.04, meEpp: 80000 },
    autoridade: { nome: '', cargo: 'Prefeito Municipal' },
    agente: { nome: '', cargo: 'Agente de Contratação' },
    pregoeiro: { nome: '', cargo: 'Pregoeiro(a)' },
    juridico: { nome: '', cargo: 'Assessoria Jurídica' },
    contabilidade: { nome: '', cargo: 'Responsável pela Contabilidade' }
  };
}

/* Completa perfis salvos por versões anteriores */
function normalizarCfg(c) {
  const base = cfgPadrao();
  const neutros = { nomeLicitacao: base.nomeLicitacao, marcaDagua: true };
  Object.keys(base).forEach(k => { if (c[k] === undefined) c[k] = k in neutros ? neutros[k] : (typeof base[k] === 'object' ? base[k] : ''); });
  if (c.marcaDagua === '') c.marcaDagua = true;
  if (String(c.cidade || '').trim().toLowerCase() === 'iacanga') {
    ['cnpj', 'endereco', 'fone', 'email', 'site', 'brasao', 'decretoGestao'].forEach(k => { if (!has(c[k])) c[k] = DADOS_IACANGA[k]; });
    if (c.nome === 'Prefeitura Municipal de Iacanga') c.nome = DADOS_IACANGA.nome;
  }
  return c;
}

const RISCOS_BASE = [
  { fase: 'Planejamento', risco: 'Especificação insuficiente ou que restrinja indevidamente a competição', prob: 'M', imp: 'A', prev: 'Revisar requisitos com a área técnica; vedar marca sem justificativa; validar o TR antes da publicação', cont: 'Retificar o instrumento convocatório e reabrir prazo', resp: 'Unidade requisitante' },
  { fase: 'Planejamento', risco: 'Preço estimado distorcido (sobrepreço ou subestimativa)', prob: 'M', imp: 'A', prev: 'Usar ao menos 3 preços válidos, priorizando PNCP e contratações públicas; análise crítica dos valores discrepantes', cont: 'Refazer a pesquisa e reavaliar o enquadramento', resp: 'Agente de contratação' },
  { fase: 'Planejamento', risco: 'Ausência ou insuficiência de dotação orçamentária', prob: 'B', imp: 'A', prev: 'Reserva orçamentária antes da autorização', cont: 'Suplementação ou redução do quantitativo', resp: 'Contabilidade' },
  { fase: 'Seleção', risco: 'Procedimento deserto ou fracassado', prob: 'M', imp: 'M', prev: 'Ampla divulgação; prazos e exigências proporcionais', cont: 'Repetir o procedimento ou adotar o art. 75, III, se cabível', resp: 'Agente de contratação' },
  { fase: 'Seleção', risco: 'Proposta inexequível ou com preço manifestamente acima do mercado', prob: 'M', imp: 'M', prev: 'Critérios objetivos de aceitabilidade e diligência (art. 59)', cont: 'Desclassificação e convocação do próximo colocado', resp: 'Agente de contratação' },
  { fase: 'Execução', risco: 'Atraso na entrega ou na execução', prob: 'M', imp: 'M', prev: 'Prazos realistas no TR; acompanhamento pelo fiscal', cont: 'Notificação, aplicação de sanção e, se for o caso, extinção', resp: 'Fiscal do contrato' },
  { fase: 'Execução', risco: 'Objeto entregue em desacordo com a especificação', prob: 'M', imp: 'A', prev: 'Recebimento provisório com conferência técnica', cont: 'Recusa, substituição às expensas do contratado e sanção', resp: 'Fiscal do contrato' },
  { fase: 'Execução', risco: 'Fiscalização deficiente por falta de designação ou capacitação', prob: 'M', imp: 'M', prev: 'Designação formal de gestor e fiscal antes do início (art. 117)', cont: 'Substituição do fiscal e registro das ocorrências', resp: 'Autoridade competente' }
];

function procExemplo() {
  const hoje = hojeISO();
  return {
    id: 'p_' + uid(), exemplo: true, numero: '', criado: hoje, atualizado: Date.now(),
    demanda: {
      unidade: 'Departamento de Meio Ambiente', secretaria: 'Secretaria de Meio Ambiente, Agricultura e Saneamento',
      responsavel: '', cargo: 'Diretor de Departamento', data: hoje, prioridade: 'media', dataPretendida: '',
      necessidade: 'EXEMPLO — O Município não dispõe de mudas de espécies arbóreas nativas para executar o plantio previsto no plano municipal de arborização, que identificou pontos vagos em calçadas e praças. A falta de arborização reduz o sombreamento, agrava o desconforto térmico e deixa sem cobertura áreas onde houve supressão autorizada de exemplares.',
      consequencias: 'Sem a aquisição, o plantio programado para o período chuvoso não será executado e as compensações ambientais assumidas pelo Município ficarão pendentes.',
      pca: 'nao_elaborado', pcaRef: '', pcaJust: '', solicitacao: ''
    },
    objeto: {
      natureza: 'compra', resumo: 'Aquisição de mudas de espécies arbóreas nativas para arborização urbana',
      requisitos: 'Mudas sadias, sem pragas ou doenças, com fuste único e retilíneo, torrão firme, acompanhadas de nota fiscal com identificação da espécie e de comprovante de inscrição do viveiro no RENASEM.',
      memoriaQtd: 'Quantitativo definido a partir do levantamento de pontos vagos do plano de arborização, acrescido de 10% para reposição de perdas no primeiro ano.',
      entregaImediata: true, continuo: false, vigenciaMeses: '',
      solucao: 'Fornecimento das mudas em entrega única, no viveiro municipal, com garantia de substituição das mudas que apresentarem defeito no recebimento.',
      alternativas: 'Foram consideradas a produção própria em viveiro municipal (inviável no prazo, por falta de estrutura e matrizes) e a doação por programas estaduais (sem disponibilidade das espécies no período). A aquisição no mercado mostrou-se a solução adequada.',
      parcelamento: 'itens', justParcelamento: 'Julgamento por item, pois as espécies podem ser fornecidas por viveiros distintos, o que amplia a competição.',
      resultados: 'Plantio integral dos pontos vagos no período chuvoso, com menor taxa de perda e custo inferior à produção própria.',
      providencias: 'Designação de fiscal com conhecimento técnico em silvicultura urbana e preparo das covas antes da entrega.',
      correlatas: '', impactos: 'A contratação gera impacto ambiental positivo. Exige-se origem legal das mudas e recolhimento das embalagens pelo fornecedor (logística reversa).',
      conclusao: 'A contratação é viável e adequada ao atendimento da necessidade descrita.',
      regime: '', subcontratacao: 'nao', subcontratacaoJust: '',
      especificacoes: 'Padrão das mudas: altura mínima de 1,50 m medida do colo ao ápice, diâmetro do colo mínimo de 1,5 cm e copa formada com no mínimo 3 ramos.\n\nSanidade: As mudas devem estar isentas de pragas, doenças e plantas invasoras no torrão, com sistema radicular sem enovelamento.\n\nIdentificação: Cada lote deve vir etiquetado com o nome científico e o nome popular da espécie.',
      vantagens: '- Plantio no período chuvoso, com maior pegamento\n- Mudas já formadas, que dispensam viveiro próprio\n- Garantia de substituição das mudas recusadas',
      desvantagens: '- Custo unitário maior do que o da produção própria em longo prazo\n- Dependência da disponibilidade das espécies nos viveiros da região',
      justEscolha: 'A aquisição de mudas formadas é a única solução capaz de atender ao cronograma de plantio do período chuvoso, considerando que o Município não dispõe de viveiro com capacidade de produção.'
    },
    itens: [
      { id: uid(), desc: 'Muda de ipê-amarelo (Handroanthus chrysotrichus), altura mínima de 1,50 m, em embalagem de 15 L', unid: 'un', qtd: 120, catmat: '', precoRef: '', local: 'Viveiro Municipal', cot: [
        { id: uid(), orcId: 'o1', fonte: 'Viveiro A', param: 'IV', data: hoje, valor: 42.5, excluir: false },
        { id: uid(), orcId: 'o2', fonte: 'Viveiro B', param: 'IV', data: hoje, valor: 39.9, excluir: false },
        { id: uid(), fonte: 'Contrato de município vizinho (PNCP)', param: 'II', data: hoje, valor: 41.0, excluir: false }
      ] },
      { id: uid(), desc: 'Muda de pau-brasil (Paubrasilia echinata), altura mínima de 1,50 m, em embalagem de 15 L', unid: 'un', qtd: 80, catmat: '', precoRef: '', local: 'Viveiro Municipal', cot: [
        { id: uid(), orcId: 'o1', fonte: 'Viveiro A', param: 'IV', data: hoje, valor: 58.0, excluir: false },
        { id: uid(), orcId: 'o2', fonte: 'Viveiro B', param: 'IV', data: hoje, valor: 54.5, excluir: false },
        { id: uid(), orcId: 'o3', fonte: 'Viveiro C', param: 'IV', data: hoje, valor: 96.0, excluir: true, just: 'Valor 70% acima da mediana dos demais, desconsiderado como excessivamente elevado.' }
      ] }
    ],
    pesquisa: { metodo: 'mediana', just: '' },
    orcs: [
      { id: 'o1', empresa: 'Viveiro A', cnpj: '', data: hoje },
      { id: 'o2', empresa: 'Viveiro B', cnpj: '', data: hoje },
      { id: 'o3', empresa: 'Viveiro C', cnpj: '', data: hoje }
    ],
    pedido: { prazoResposta: '', contato: '', fornecedores: [{ id: uid(), nome: 'Viveiro A', contato: '' }, { id: uid(), nome: 'Viveiro B', contato: '' }, { id: uid(), nome: 'Viveiro C', contato: '' }] },
    situacao: {
      gastoExercicio: 0, gastoDesc: '', gastoConfirmado: false, exclusivo: false, artista: false, tecnico: false, tecnicoAlinea: '', notoria: '', credenciamento: false, credHip: 'I',
      imovel: false, emergencia: false, emergData: '', emergDesc: '', frustrada: false, frustradaData: '', frustradaMotivo: 'deserta', frustradaRef: '',
      catadores: false, hortifruti: false, entidadeAdm: false, pcd: false, instPesquisa: false, contratoPrograma: false,
      concursoPremio: false, dialogo: false, srp: false, srpHip: [], srpJust: '', srpOrgaos: false, outraHip: ''
    },
    enquadramento: { escolha: '', justDivergencia: '' },
    fornecedor: { razao: '', cnpj: '', endereco: '', representante: '', razaoEscolha: '', justPreco: '', docs: {} },
    disputa: { criterio: '', modo: 'aberto', intervalo: '', exclusivaME: 'auto', justNaoExclusiva: '', habTecnica: '', habEconomica: '', consorcio: false, visita: false, vistoria: 'nao', vistoriaLocal: '', dataSessao: '', adesao: false },
    execucao: {
      instrumento: 'auto', prazo: '15 (quinze) dias corridos, contados do recebimento da nota de empenho', local: 'Viveiro Municipal, em horário de expediente',
      recebimento: 'Provisório, no ato da entrega, para conferência das quantidades; definitivo, em até 5 (cinco) dias úteis, após verificação da qualidade das mudas.',
      garantia: 'Substituição, sem ônus, das mudas recusadas no recebimento definitivo.', assistencia: '', pagamentoDias: 30, reajuste: 'IPCA/IBGE', vigenciaTexto: '',
      garantiaContratual: 0, garantiaJust: '', multa: 10, obrigContratada: '', obrigContratante: '',
      prazoInicio: '', metodologia: '', medicao: '', prazoRejeicao: 5,
      gestor: '', gestorCargo: '', gestorCpf: '', fiscal: '', fiscalCargo: '', fiscalCpf: '',
      fiscalAdm: '', fiscalAdmCargo: '', fiscalAdmCpf: '', fiscalSet: '', fiscalSetCargo: '', fiscalSetCpf: ''
    },
    riscos: RISCOS_BASE.map(r => Object.assign({ id: uid() }, r)),
    orcamento: { orgao: '', unidade: '', funcional: '', natureza: '3.3.90.30 — Material de Consumo', fonte: '', ficha: '', dotacoes: [{ id: uid(), orgao: 'Meio Ambiente', ficha: '' }] }
  };
}

function procVazio() {
  const p = procExemplo();
  p.exemplo = false;
  p.demanda.necessidade = ''; p.demanda.consequencias = ''; p.demanda.responsavel = ''; p.demanda.cargo = '';
  Object.keys(p.objeto).forEach(k => { if (typeof p.objeto[k] === 'string') p.objeto[k] = ''; });
  p.objeto.natureza = 'compra'; p.objeto.parcelamento = 'itens'; p.objeto.entregaImediata = false;
  p.itens = [{ id: uid(), desc: '', unid: 'un', qtd: 1, catmat: '', precoRef: '', local: '', cot: [] }];
  p.objeto.subcontratacao = 'nao';
  ['prazo', 'local', 'recebimento', 'garantia'].forEach(k => p.execucao[k] = '');
  p.orcamento.dotacoes = [{ id: uid(), orgao: '', ficha: '' }];
  p.orcs = []; p.pedido = { prazoResposta: '', contato: '', fornecedores: [] };
  return p;
}

/* Completa campos que versões anteriores não tinham */
const PADROES_NOVOS = {
  demanda: { pcaJust: '', solicitacao: '' },
  objeto: { regime: '', subcontratacao: 'nao', subcontratacaoJust: '', especificacoes: '', vantagens: '', desvantagens: '', justEscolha: '' },
  disputa: { vistoria: 'nao', vistoriaLocal: '' },
  execucao: { garantiaJust: '', prazoInicio: '', metodologia: '', medicao: '', prazoRejeicao: 5, gestorCpf: '', fiscalCpf: '', fiscalAdm: '', fiscalAdmCargo: '', fiscalAdmCpf: '', fiscalSet: '', fiscalSetCargo: '', fiscalSetCpf: '' }
};
function normalizarProc(p) {
  Object.entries(PADROES_NOVOS).forEach(([g, v]) => { p[g] = p[g] || {}; Object.entries(v).forEach(([k, x]) => { if (p[g][k] === undefined) p[g][k] = x; }); });
  if (p.disputa.visita && p.disputa.vistoria === 'nao') { p.disputa.vistoria = 'facultativa'; p.disputa.visita = false; }
  p.orcamento = p.orcamento || {};
  if (p.orcamento.elemento === undefined) p.orcamento.elemento = '';
  if (p.orcamento.contabilidadeIndica === undefined) p.orcamento.contabilidadeIndica = false;
  if (p.pesquisa && p.pesquisa.justMenos3 === undefined) p.pesquisa.justMenos3 = '';
  if (!Array.isArray(p.orcamento.dotacoes)) p.orcamento.dotacoes = [{ id: uid(), orgao: '', ficha: p.orcamento.ficha || '' }];
  (p.itens || []).forEach(it => { if (it.lote === undefined) it.lote = ''; if (it.local === undefined) it.local = ''; });
  if (!p.orcs) p.orcs = [];
  if (!p.pedido) p.pedido = { prazoResposta: '', contato: '', fornecedores: [] };
  if (!p.pedido.fornecedores) p.pedido.fornecedores = [];
  (p.itens || []).forEach(it => { if (!it.cot) it.cot = []; });
  return p;
}

/* Orçamentos lançados por empresa (modo Secretaria) viram preços por item */
function syncOrcs(p) {
  normalizarProc(p);
  const porId = Object.fromEntries(p.orcs.map(o => [o.id, o]));
  p.itens.forEach(it => {
    it.cot = it.cot.filter(c => !c.orcId || porId[c.orcId]);
    it.cot.forEach(c => { const o = porId[c.orcId]; if (o) { c.fonte = o.empresa || 'Empresa sem nome'; c.data = o.data; c.param = 'IV'; } });
  });
  return p;
}
function valorOrc(p, orcId, itemId) { const it = p.itens.find(x => x.id === itemId); const c = it && it.cot.find(x => x.orcId === orcId); return c ? c.valor : ''; }
function setValorOrc(p, orcId, itemId, valor) {
  const it = p.itens.find(x => x.id === itemId); if (!it) return;
  let c = it.cot.find(x => x.orcId === orcId);
  if (!c) { const o = p.orcs.find(x => x.id === orcId) || {}; c = { id: uid(), orcId, fonte: o.empresa || '', param: 'IV', data: o.data || hojeISO(), valor: '', excluir: false }; it.cot.push(c); }
  c.valor = valor;
}

/* ---------- Pesquisa de preços ---------- */
function estat(it) {
  const v = (it.cot || []).filter(c => !c.excluir && num(c.valor) > 0).map(c => num(c.valor)).sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0 };
  const media = v.reduce((a, b) => a + b, 0) / n;
  const mediana = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  const dp = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - media) ** 2, 0) / (n - 1)) : 0;
  return { n, media, mediana, menor: v[0], maior: v[n - 1], cv: media ? dp / media : 0 };
}
function precoUnit(it, metodo) { const s = estat(it); return s.n ? round2(s[metodo] ?? s.mediana) : round2(num(it.precoRef)); }
function totalItem(it, metodo) { return round2(precoUnit(it, metodo) * num(it.qtd)); }
function estimativa(p) { return round2((p.itens || []).reduce((a, it) => a + totalItem(it, p.pesquisa.metodo), 0)); }
function desvio(it, c) { const s = estat(it); return s.n && s.mediana ? (num(c.valor) - s.mediana) / s.mediana : 0; }

/* ---------- Motor de enquadramento ---------- */
const STATUS_ORD = { ok: 0, alerta: 1, bloq: 2 };

function analisar(p, cfg) {
  const V = cfg.valores, s = p.situacao, nat = p.objeto.natureza, N = NAT[nat] || NAT.compra;
  const est = estimativa(p), mult = cfg.dobro ? 2 : 1;
  const dataProc = p.demanda.data || hojeISO();
  const H = [], alertas = [];
  const add = h => { h.motivos = h.motivos || []; h.requisitos = h.requisitos || []; H.push(h); return h; };

  // --- qualidade da pesquisa de preços
  const semPreco = p.itens.filter(it => estat(it).n === 0 && !num(it.precoRef));
  const poucos = p.itens.filter(it => { const n = estat(it).n; return n > 0 && n < 3; });
  const velhos = []; let soFornecedor = true;
  p.itens.forEach(it => (it.cot || []).forEach(c => {
    if (c.excluir) return;
    if (c.param !== 'IV') soFornecedor = false;
    if (c.param === 'IV' && c.data && diasEntre(c.data, dataProc) > 183) velhos.push(it.desc || 'item');
  }));
  if (semPreco.length) alertas.push({ n: 'bloq', t: `${semPreco.length} item(ns) sem preço estimado. Sem estimativa não há como enquadrar a contratação (art. 23).` });
  if (poucos.length) alertas.push({ n: 'alerta', t: `${poucos.length} item(ns) com menos de 3 preços válidos: exige justificativa nos autos${cfg.regulamento === 'federal' ? ' (IN SEGES/ME nº 65/2021, art. 6º)' : ''}.` });
  if (velhos.length) alertas.push({ n: 'alerta', t: 'Há orçamentos de fornecedores com mais de 6 meses (art. 23, §1º, IV).' });
  if ((N.eng) && p.itens.some(it => (it.cot || []).length) && !p.itens.some(it => (it.cot || []).some(c => !c.excluir && c.param === 'S'))) alertas.push({ n: 'alerta', t: 'Obras e serviços de engenharia: o valor estimado deve partir das tabelas oficiais (SINAPI, SICRO ou CDHU), com BDI e encargos (art. 23, §2º). Orçamentos de fornecedores só complementam.' });
  if (soFornecedor && p.itens.some(it => (it.cot || []).length)) alertas.push({ n: 'alerta', t: 'Pesquisa baseada só em orçamentos de fornecedores. Priorize PNCP e contratações públicas ou justifique a impossibilidade.' });

  // --- dispensa em razão do valor (art. 75, I e II)
  if (N.cat) {
    const cat = N.cat, lim = round2((cat === 'I' ? V.d75i : V.d75ii) * mult);
    const veic7 = nat === 'manut_veic' && est <= V.d75p7;
    const soma = round2(num(s.gastoExercicio) + est);
    const h = add({ id: cat === 'I' ? '75-I' : '75-II', grupo: 'Dispensa', base: `art. 75, inciso ${cat}`,
      titulo: cat === 'I' ? 'Dispensa em razão do valor — obras, serviços de engenharia e manutenção de veículos' : 'Dispensa em razão do valor — compras e outros serviços', limite: lim, soma });
    if (est > lim) { h.status = 'bloq'; h.motivos.push(`Valor estimado (${fmtBRL(est)}) acima do limite de ${fmtBRL(lim)} para ${V.ano}.`); }
    else if (veic7) { h.status = 'ok'; h.motivos.push(`Manutenção de veículos até ${fmtBRL(V.d75p7)}: o somatório do exercício não se aplica (art. 75, §7º).`); }
    else if (soma > lim) { h.status = 'bloq'; h.motivos.push(`Somatório do exercício com objetos do mesmo ramo (${fmtBRL(soma)}) ultrapassa o limite de ${fmtBRL(lim)}. Dispensa aqui configuraria fracionamento (art. 75, §1º).`); }
    else if (soma > 0.8 * lim) { h.status = 'alerta'; h.motivos.push(`Somatório do exercício em ${fmtNum(soma / lim * 100, 0)}% do limite. Confira se não há outras despesas do mesmo ramo na unidade gestora.`); }
    else { h.status = 'ok'; h.motivos.push(`Somatório do exercício: ${fmtBRL(soma)} de ${fmtBRL(lim)} (${fmtNum(soma / lim * 100, 0)}%).`); }
    if (!num(s.gastoExercicio) && !s.gastoConfirmado && h.status !== 'bloq' && !veic7) { h.status = h.status === 'ok' ? 'alerta' : h.status; h.motivos.push('Gasto anterior no exercício informado como zero. Confirme com a contabilidade antes de seguir.'); }
    if (semPreco.length) { h.status = 'bloq'; h.motivos.push('Estimativa incompleta.'); }
    h.requisitos.push('Aviso em sítio eletrônico oficial por no mínimo 3 dias úteis, preferencialmente (art. 75, §3º)', 'Instrução do art. 72', 'Registro do somatório do exercício por ramo de atividade');
    if (cfg.dobro) h.motivos.push('Limite em dobro (art. 75, §2º).');
  }

  // --- art. 75, III — licitação deserta ou fracassada
  if (s.frustrada) {
    const h = add({ id: '75-III', grupo: 'Dispensa', base: 'art. 75, inciso III', titulo: 'Licitação anterior deserta ou fracassada há menos de 1 ano' });
    if (!s.frustradaData) { h.status = 'alerta'; h.motivos.push('Informe a data do resultado da licitação anterior.'); }
    else if (diasEntre(s.frustradaData, dataProc) > 365) { h.status = 'bloq'; h.motivos.push('A licitação anterior foi encerrada há mais de 1 ano.'); }
    else { h.status = 'ok'; h.motivos.push(`Licitação anterior ${s.frustradaMotivo === 'deserta' ? 'sem interessados ou sem propostas válidas' : 'com propostas acima do mercado ou incompatíveis'}, em ${fmtData(s.frustradaData)}.`); }
    h.requisitos.push('Manutenção das condições do edital anterior', 'Juntada da ata ou do relatório da licitação anterior');
  }
  // --- art. 75, VIII — emergência ou calamidade
  if (s.emergencia) {
    const h = add({ id: '75-VIII', grupo: 'Dispensa', base: 'art. 75, inciso VIII', titulo: 'Emergência ou calamidade pública' });
    h.status = 'alerta';
    if (s.emergData && diasEntre(s.emergData, dataProc) > 365) { h.status = 'bloq'; h.motivos.push('Passou mais de 1 ano da ocorrência: o prazo máximo do inciso VIII se esgotou.'); }
    else h.motivos.push('Hipótese de controle rigoroso pelo Tribunal de Contas. A urgência precisa estar demonstrada com fatos, não com a demora administrativa.');
    if (!has(s.emergDesc)) h.motivos.push('Descreva a situação emergencial com dados concretos (laudo, boletim, decreto).');
    h.requisitos.push('Caracterização da situação emergencial ou calamitosa', 'Só os bens e parcelas concluíveis em até 1 ano da ocorrência', 'Vedadas a prorrogação e a recontratação da mesma empresa', 'Preços de mercado conforme art. 23 e apuração de responsabilidade de quem deu causa (art. 75, §6º)');
  }
  if (s.catadores) {
    const h = add({ id: '75-IV-j', grupo: 'Dispensa', base: 'art. 75, inciso IV, alínea "j"', titulo: 'Coleta e triagem de recicláveis por associação ou cooperativa de catadores' });
    h.status = ['servico_comum', 'servico_especial'].includes(nat) ? 'ok' : 'alerta';
    if (h.status === 'alerta') h.motivos.push('A hipótese trata de serviço. Revise a natureza do objeto.');
    h.requisitos.push('Entidade formada exclusivamente por pessoas físicas de baixa renda reconhecidas pelo poder público como catadores', 'Área com coleta seletiva', 'Equipamentos compatíveis com normas técnicas, ambientais e de saúde pública');
  }
  if (s.hortifruti) {
    const h = add({ id: '75-IV-e', grupo: 'Dispensa', base: 'art. 75, inciso IV, alínea "e"', titulo: 'Hortifrutigranjeiros, pães e perecíveis durante a licitação' });
    h.status = nat === 'compra' ? 'ok' : 'alerta';
    h.requisitos.push('Somente pelo período necessário à conclusão da licitação correspondente', 'Contratação com base no preço do dia', 'Comprovar que a licitação está em andamento');
  }
  if (s.entidadeAdm) add({ id: '75-IX', grupo: 'Dispensa', base: 'art. 75, inciso IX', titulo: 'Bens ou serviços de órgão ou entidade da Administração criados para esse fim', status: 'ok', requisitos: ['Ato de criação com finalidade específica', 'Preço compatível com o mercado'] });
  if (s.contratoPrograma) add({ id: '75-XI', grupo: 'Dispensa', base: 'art. 75, inciso XI', titulo: 'Contrato de programa com ente da Federação (gestão associada)', status: 'ok', requisitos: ['Consórcio público ou convênio de cooperação autorizado em lei'] });
  if (s.pcd) add({ id: '75-XIV', grupo: 'Dispensa', base: 'art. 75, inciso XIV', titulo: 'Associação de pessoas com deficiência', status: 'ok', requisitos: ['Associação sem fins lucrativos e de comprovada idoneidade', 'Serviço prestado exclusivamente por pessoas com deficiência', 'Preço compatível com o mercado'] });
  if (s.instPesquisa) add({ id: '75-XV', grupo: 'Dispensa', base: 'art. 75, inciso XV', titulo: 'Instituição brasileira de pesquisa, ensino ou desenvolvimento institucional', status: 'alerta', motivos: ['Exige nexo entre o objeto e a finalidade estatutária da instituição.'], requisitos: ['Inquestionável reputação ética e profissional', 'Instituição sem fins lucrativos', 'Nexo entre estatuto e objeto'] });
  if (has(s.outraHip)) add({ id: '75-OUTRA', grupo: 'Dispensa', base: s.outraHip, titulo: 'Outra hipótese de contratação direta informada pelo usuário', status: 'alerta', motivos: ['Hipótese não automatizada. Confira o texto legal e a jurisprudência do Tribunal de Contas.'] });

  // --- inexigibilidade (art. 74)
  if (s.exclusivo) add({ id: '74-I', grupo: 'Inexigibilidade', base: 'art. 74, inciso I', titulo: 'Fornecedor ou prestador exclusivo', status: nat === 'compra' || !N.eng ? 'ok' : 'alerta', requisitos: ['Atestado, certidão ou declaração de exclusividade (art. 74, §1º)', 'Vedada a preferência por marca específica', 'Justificativa de preço (art. 23, §4º)'] });
  if (s.artista) add({ id: '74-II', grupo: 'Inexigibilidade', base: 'art. 74, inciso II', titulo: 'Profissional do setor artístico', status: 'ok', requisitos: ['Consagração pela crítica especializada ou pela opinião pública', 'Contratação direta ou por empresário exclusivo (art. 74, §2º)'] });
  if (s.tecnico) {
    const h = add({ id: '74-III', grupo: 'Inexigibilidade', base: `art. 74, inciso III${s.tecnicoAlinea ? ', alínea "' + s.tecnicoAlinea + '"' : ''}`, titulo: 'Serviço técnico especializado com notória especialização' });
    h.status = nat === 'tecnico' ? 'alerta' : 'bloq';
    if (nat !== 'tecnico') h.motivos.push('A natureza do objeto não é serviço técnico especializado de natureza predominantemente intelectual.');
    else h.motivos.push('Demonstre a notória especialização e por que o serviço não pode ser comparado objetivamente.');
    if (!s.tecnicoAlinea) h.motivos.push('Indique a alínea do inciso III.');
    h.requisitos.push('Notória especialização comprovada (art. 74, §3º)', 'Vedada para publicidade e divulgação', 'Vedada a subcontratação ou atuação de profissionais diversos dos que justificaram a escolha (art. 74, §4º)');
  }
  if (s.credenciamento) add({ id: '74-IV', grupo: 'Inexigibilidade', base: 'art. 74, inciso IV', titulo: 'Credenciamento', status: 'alerta', motivos: ['Exige edital de chamamento público permanente, aberto a qualquer interessado que atenda às condições (art. 79).'], requisitos: ['Hipótese do art. 79 identificada (contratação paralela, seleção por terceiros ou mercado fluido)', 'Edital de chamamento com regras e valores prefixados'] });
  if (s.imovel) add({ id: '74-V', grupo: 'Inexigibilidade', base: 'art. 74, inciso V', titulo: 'Aquisição ou locação de imóvel com características que tornem necessária a escolha', status: nat === 'locacao_imovel' ? 'ok' : 'alerta', requisitos: ['Avaliação prévia do bem, do estado de conservação, das adaptações e do prazo de amortização', 'Certificação de inexistência de imóveis públicos vagos e disponíveis', 'Justificativa da singularidade do imóvel (art. 74, §5º)'] });

  // --- licitação (art. 28)
  const eletronica = cfg.ate20mil && dataProc < '2027-04-01'
    ? 'forma eletrônica preferencial; o Município tem até 01/04/2027 para torná-la obrigatória (art. 176, II)'
    : 'forma eletrônica obrigatória, salvo motivação com gravação em áudio e vídeo (art. 17, §2º)';
  if (nat === 'alienacao') {
    add({ id: 'LEILAO', grupo: 'Licitação', base: 'art. 28, IV', titulo: 'Leilão', status: 'ok', motivos: ['Modalidade própria para alienação de bens.'], requisitos: ['Avaliação prévia dos bens', 'Critério de maior lance'] });
  } else {
    const pg = add({ id: 'PREGAO', grupo: 'Licitação', base: 'art. 28, I, e art. 29', titulo: 'Pregão' });
    if (N.comum) { pg.status = 'ok'; pg.motivos.push('Objeto comum: o pregão é a modalidade obrigatória (art. 6º, XLI).'); }
    else { pg.status = 'bloq'; pg.motivos.push(nat === 'obra' || nat === 'eng_especial' ? 'Pregão não se aplica a obras e serviços especiais de engenharia (art. 29, parágrafo único).' : nat === 'tecnico' ? 'Pregão não se aplica a serviços técnicos especializados de natureza predominantemente intelectual (art. 29, parágrafo único).' : 'Objeto não é comum.'); }
    pg.requisitos.push(eletronica);
    const cc = add({ id: 'CONCORRENCIA', grupo: 'Licitação', base: 'art. 28, II', titulo: 'Concorrência' });
    if (N.comum) { cc.status = 'bloq'; cc.motivos.push('Para bens e serviços comuns o pregão é obrigatório.'); }
    else { cc.status = 'ok'; cc.motivos.push('Modalidade para obras, serviços especiais e serviços técnicos especializados.'); }
    if (nat === 'tecnico' && est > V.tecnico) cc.motivos.push(`Acima de ${fmtBRL(V.tecnico)}: julgamento obrigatório por melhor técnica ou técnica e preço 70/30 (art. 37, §2º).`);
    cc.requisitos.push(eletronica);
    if (s.concursoPremio) add({ id: 'CONCURSO', grupo: 'Licitação', base: 'art. 28, III, e art. 30', titulo: 'Concurso', status: 'ok', requisitos: ['Trabalho técnico, científico ou artístico', 'Prêmio ou remuneração ao vencedor', 'Cessão dos direitos patrimoniais (art. 30, parágrafo único)'] });
    if (s.dialogo) add({ id: 'DIALOGO', grupo: 'Licitação', base: 'art. 28, V, e art. 32', titulo: 'Diálogo competitivo', status: 'alerta', motivos: ['Restrito a objetos com inovação técnica ou solução não definível pela Administração. Uso raro em municípios.'], requisitos: ['Hipóteses do art. 32, I ou II', 'Comissão de no mínimo 3 servidores efetivos'] });
  }

  // --- SRP em contratação direta
  if (s.srp) H.filter(h => h.grupo !== 'Licitação').forEach(h => {
    if (!s.srpOrgaos) { h.status = h.status === 'ok' ? 'alerta' : h.status; h.motivos.push('Registro de preços em contratação direta só para mais de um órgão ou entidade (art. 82, §6º).'); }
  });

  H.forEach(h => { if (!h.status) h.status = 'ok'; });
  if (semPreco.length) H.forEach(h => { if (h.status === 'ok') { h.status = 'alerta'; h.motivos.push('Estimativa de preço incompleta: o enquadramento é provisório.'); } });

  // --- sugestão
  const especificas = H.filter(h => h.status !== 'bloq' && h.grupo !== 'Licitação' && !['75-I', '75-II'].includes(h.id));
  const valor = H.find(h => ['75-I', '75-II'].includes(h.id) && h.status !== 'bloq');
  const lic = H.filter(h => h.grupo === 'Licitação' && h.status !== 'bloq');
  let sug = (especificas.find(h => h.status === 'ok') || especificas[0]) || valor || lic[0] || null;
  let escolhida = H.find(h => h.id === p.enquadramento.escolha && h.status !== 'bloq') || sug;

  // --- alertas gerais
  if (est > V.grandeVulto) alertas.push({ n: 'alerta', t: 'Contratação de grande vulto: matriz de riscos e programa de integridade obrigatórios (arts. 22, §3º, e 25, §4º).' });
  if (escolhida && escolhida.grupo === 'Licitação' && escolhida.id === 'PREGAO') {
    const ex = exclusivosME(p, cfg);
    if (ex.lista.length && p.disputa.exclusivaME !== 'nao') alertas.push({ n: 'info', t: `${ex.tipo === 'global' ? 'Contratação' : ex.lista.length + (ex.tipo === 'lotes' ? ' lote(s)' : ' item(ns)')} até ${fmtBRL(V.meEpp)}: participação exclusiva de ME/EPP (LC nº 123/2006, art. 48, I), salvo art. 49.` });
  }
  if (p.objeto.parcelamento === 'lotes' && p.itens.some(it => !has(it.lote))) alertas.push({ n: 'alerta', t: 'Julgamento por lote com item sem lote definido.' });
  if (p.situacao.srp && !(p.situacao.srpHip || []).length) alertas.push({ n: 'alerta', t: 'Registro de preços marcado sem hipótese de cabimento indicada.' });
  if (p.situacao.srp && ['obra'].includes(nat)) alertas.push({ n: 'alerta', t: 'Registro de preços para obra só cabe com projeto padronizado e necessidade permanente (art. 85).' });
  const etpFacultativo = cfg.regulamento === 'federal' && escolhida && ['75-I', '75-II', '75-VIII'].includes(escolhida.id);

  // --- instrumento (art. 95)
  let instrumento;
  const porValor = escolhida && ['75-I', '75-II'].includes(escolhida.id);
  const entregaImediata = p.objeto.entregaImediata && !has(p.execucao.assistencia) && nat === 'compra';
  if (s.srp) instrumento = { tipo: 'ata', t: 'Ata de registro de preços (arts. 82 a 86); cada contratação posterior por contrato ou instrumento substitutivo' };
  else if (p.execucao.instrumento === 'contrato') instrumento = { tipo: 'contrato', t: 'Termo de contrato (opção do usuário)' };
  else if ((porValor || entregaImediata) && p.execucao.instrumento !== 'contrato') instrumento = { tipo: 'substitutivo', t: `Instrumento substitutivo admitido (art. 95, ${porValor ? 'I' : 'II'}): nota de empenho, autorização de compra ou ordem de serviço`, podeContrato: true };
  else instrumento = { tipo: 'contrato', t: 'Termo de contrato obrigatório (art. 95, caput)' };
  if (p.execucao.instrumento === 'substitutivo' && !(porValor || entregaImediata) && !s.srp) alertas.push({ n: 'bloq', t: 'Instrumento substitutivo escolhido fora das hipóteses do art. 95. O termo de contrato é obrigatório.' });

  // --- prazo do edital (art. 55)
  let prazoEdital = null;
  if (escolhida && escolhida.grupo === 'Licitação') {
    const crit = criterioPadrao(p, escolhida, est, cfg);
    const precoOuDesc = /menor preço|maior desconto/i.test(crit);
    if (escolhida.id === 'LEILAO') prazoEdital = '15 dias úteis (art. 55, III)';
    else if (/técnica/i.test(crit)) prazoEdital = '35 dias úteis (art. 55, IV)';
    else if (nat === 'compra') prazoEdital = precoOuDesc ? '8 dias úteis (art. 55, I, "a")' : '15 dias úteis (art. 55, I, "b")';
    else if (N.comum) prazoEdital = '10 dias úteis (art. 55, II, "a")';
    else prazoEdital = precoOuDesc ? '25 dias úteis (art. 55, II, "b")' : '35 dias úteis (art. 55, II, "d")';
  }

  return { est, H, sug, escolhida, alertas, instrumento, prazoEdital, etpFacultativo, eletronica, direta: escolhida && escolhida.grupo !== 'Licitação' };
}

function criterioPadrao(p, h, est, cfg) {
  if (has(p.disputa.criterio)) return p.disputa.criterio;
  if (!h) return 'menor preço';
  if (h.id === 'LEILAO') return 'maior lance';
  if (h.id === 'CONCURSO') return 'melhor técnica ou conteúdo artístico';
  if (p.objeto.natureza === 'tecnico' && est > cfg.valores.tecnico) return 'técnica e preço';
  return 'menor preço';
}

/* ======================= PEÇAS DO PROCESSO ======================= */
/* Blocos: title, h, p, li, table, kv, sig, note, pb, space */

function cab(p) { return { proc: numProc(p, a, cfg) }; }
/* ---------- Itens e lotes ---------- */
function grupoLotes(p) {
  if (p.objeto.parcelamento !== 'lotes') return null;
  const g = {};
  p.itens.forEach((it, i) => { const k = has(it.lote) ? String(it.lote).trim() : '?'; (g[k] = g[k] || []).push({ it, i }); });
  const ord = (a, b) => (a === '?') - (b === '?') || (parseFloat(a) || 0) - (parseFloat(b) || 0) || a.localeCompare(b);
  return Object.keys(g).sort(ord).map(k => ({ lote: k, itens: g[k], total: round2(g[k].reduce((x, o) => x + totalItem(o.it, p.pesquisa.metodo), 0)) }));
}
const nomeLote = k => k === '?' ? 'Lote ⟦não informado⟧' : 'Lote ' + k;
function composicaoLotes(p) {
  const L = grupoLotes(p); if (!L) return '';
  return 'Composição dos lotes: ' + L.map(g => `${nomeLote(g.lote)} — ${g.itens.length > 1 ? 'itens' : 'item'} ${g.itens.map(o => o.i + 1).join(', ')}`).join('; ') + '.';
}
function textoJulgamento(p) {
  const par = p.objeto.parcelamento;
  if (par === 'lotes') return 'O julgamento será por lote. Cada lote é disputado e adjudicado separadamente, podendo haver um vencedor diferente para cada lote. O fornecedor pode participar de um ou mais lotes, mas deve cotar todos os itens de cada lote em que participar.';
  if (par === 'global') return 'O julgamento será global: um único fornecedor será contratado para a totalidade dos itens.';
  return p.itens.length > 1 ? 'O julgamento será por item. Cada item é disputado e adjudicado separadamente, podendo haver um vencedor diferente para cada item.' : '';
}
function itensTabela(p, comPreco = true, emBranco = false) {
  const m = p.pesquisa.metodo, L = grupoLotes(p);
  const cols = [{ h: 'Item', w: 1 }, { h: 'Descrição', w: comPreco ? 7 : 9 }, { h: 'Unid.', w: 1.3 }, { h: 'Qtd.', w: 1.3 }];
  if (comPreco) cols.push({ h: 'Valor unit.', w: 2.2 }, { h: 'Valor total', w: 2.4 });
  const vazio = comPreco ? ['', ''] : [];
  const linha = o => [String(o.i + 1), ph(o.it.desc, 'descrição do item'), o.it.unid || 'un', fmtNum(o.it.qtd, 0)]
    .concat(comPreco ? (emBranco ? ['', ''] : [fmtBRL(precoUnit(o.it, m)), fmtBRL(totalItem(o.it, m))]) : []);
  let rows;
  if (L) {
    rows = [];
    L.forEach(g => {
      rows.push(['', `**${nomeLote(g.lote).toUpperCase()}**`, '', '', ...vazio]);
      g.itens.forEach(o => rows.push(linha(o)));
      if (comPreco) rows.push(['', `**Subtotal — ${nomeLote(g.lote).toLowerCase()}**`, '', '', '', emBranco ? '' : '**' + fmtBRL(g.total) + '**']);
    });
  } else rows = p.itens.map((it, i) => linha({ it, i }));
  const t = { t: 'table', cols, rows };
  if (comPreco) t.foot = ['', emBranco ? '**Total**' : '**Valor total estimado**', '', '', '', emBranco ? '' : '**' + fmtBRL(estimativa(p)) + '**'];
  return t;
}
/* Itens ou lotes de participação exclusiva de ME/EPP (LC 123, art. 48, I) */
function exclusivosME(p, cfg) {
  const L = grupoLotes(p), lim = cfg.valores.meEpp;
  if (L) return { tipo: 'lotes', lista: L.filter(g => g.total <= lim).map(g => g.lote) };
  if (p.objeto.parcelamento === 'global') return { tipo: 'global', lista: estimativa(p) <= lim ? ['global'] : [] };
  return { tipo: 'itens', lista: p.itens.map((it, i) => ({ i: i + 1, v: totalItem(it, p.pesquisa.metodo) })).filter(x => x.v <= lim).map(x => x.i) };
}

function pcaTexto(d) {
  if (d.pca === 'sim') return `A contratação está prevista no Plano de Contratações Anual${has(d.pcaRef) ? ' (' + d.pcaRef + ')' : ''}, em alinhamento com o planejamento da Administração.`;
  if (d.pca === 'nao') return 'A contratação não consta do Plano de Contratações Anual. ⟦justificar a inclusão superveniente⟧';
  return 'O Município ainda não elaborou o Plano de Contratações Anual (art. 12, VII, de elaboração facultativa conforme regulamento). A demanda alinha-se às ações da unidade requisitante previstas no orçamento vigente.';
}
const NIVEL = { B: 1, M: 2, A: 3 };
const NOME_NIVEL = { B: 'Baixa', M: 'Média', A: 'Alta' };
function nivelRisco(r) { const v = (NIVEL[r.prob] || 2) * (NIVEL[r.imp] || 2); return v >= 6 ? 'Alto' : v >= 3 ? 'Médio' : 'Baixo'; }
function regTexto(cfg) {
  if (cfg.regulamento === 'federal') return 'regulamentos federais aplicados pelo Município com fundamento no art. 187 da Lei nº 14.133/2021';
  return has(cfg.regulamentoTexto) ? cfg.regulamentoTexto : '⟦regulamento municipal da Lei nº 14.133/2021⟧';
}
function dotacaoTexto(o) {
  return `Órgão ${ph(o.orgao, 'órgão')}; Unidade ${ph(o.unidade, 'unidade orçamentária')}; Funcional programática ${ph(o.funcional, 'funcional programática')}; Natureza da despesa ${ph(o.natureza, 'natureza da despesa')}; Fonte ${ph(o.fonte, 'fonte de recurso')}; Ficha ${ph(o.ficha, 'ficha')}`;
}
function hipTexto(a) { return a.escolhida ? `${a.escolhida.titulo} — ${a.escolhida.base} da Lei nº 14.133/2021` : '⟦enquadramento⟧'; }

/* ---------- Natureza da despesa ---------- */
const ELEMENTOS = {
  consumo: '3.3.90.30 – Material de Consumo',
  permanente: '4.4.90.52 – Equipamentos e Material Permanente',
  servPJ: '3.3.90.39 – Outros Serviços de Terceiros – Pessoa Jurídica',
  obras: '4.4.90.51 – Obras e Instalações'
};
function elementoPadrao(nat) { return nat === 'compra' ? 'consumo' : nat === 'obra' ? 'obras' : 'servPJ'; }
function elementoTexto(p) { return ELEMENTOS[p.orcamento.elemento || elementoPadrao(p.objeto.natureza)]; }
function dotacoesValidas(p) { return (p.orcamento.dotacoes || []).filter(x => has(x.ficha) || has(x.orgao)); }

/* ---------- Valor por extenso ---------- */
function extenso(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  const U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const D = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const C = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = x => {
    if (x === 100) return 'cem';
    const c = Math.floor(x / 100), r = x % 100, p = [];
    if (c) p.push(C[c]);
    if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' e ' + U[r % 10] : ''));
    return p.join(' e ');
  };
  if (!n) return 'zero';
  const nomes = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
  const grupos = []; let x = n; while (x > 0) { grupos.push(x % 1000); x = Math.floor(x / 1000); }
  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i]; if (!g) continue;
    partes.push({ g, t: i === 1 && g === 1 ? 'mil' : ate999(g) + (i ? ' ' + nomes[i][g === 1 ? 0 : 1] : '') });
  }
  return partes.map((q, k) => k === 0 ? q.t : ((k === partes.length - 1 && (q.g < 100 || q.g % 100 === 0)) ? ' e ' : ', ') + q.t).join('');
}
function reaisExtenso(v) {
  const cent = Math.round((Number(v) || 0) * 100), r = Math.floor(cent / 100), c = cent % 100;
  let s = '';
  if (r) s = extenso(r) + (r >= 1e6 && r % 1e6 === 0 ? ' de reais' : r === 1 ? ' real' : ' reais');
  if (c) s += (r ? ' e ' : '') + extenso(c) + (c === 1 ? ' centavo' : ' centavos');
  if (!s) s = 'zero real';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const valorExtenso = v => `${fmtBRL(v)} (${reaisExtenso(v)})`;

/* CPF em documento público: só os 3 primeiros e os 2 últimos dígitos (LGPD) */
function mascaraCPF(c) {
  const d = String(c || '').replace(/\D/g, '');
  if (d.length !== 11) return has(c) ? String(c).trim() : '';
  return `${d.slice(0, 3)}.XXX.XXX-${d.slice(9)}`;
}
const minuscIni = s => { s = String(s || '').trim(); return /^[A-ZÀ-Ú][a-zà-ú]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; };
const semPonto = s => String(s || '').trim().replace(/[.;:]+$/, '');

/* ---------- Texto livre → cláusulas numeradas ----------
   Cada parágrafo vira uma cláusula (3.1, 3.2…); linhas iniciadas por "-" ou "•"
   viram marcadores; "Título curto: texto" ganha o título em negrito.            */
function paragrafos(texto) {
  const out = [];
  let novo = true;
  String(texto || '').replace(/\r/g, '').split('\n').forEach(l => {
    const t = l.trim();
    if (!t) { novo = true; return; }
    const m = t.match(/^(?:[-•*●▪]|\d+[.)]|[a-z][.)])\s+(.+)$/);
    const ult = out[out.length - 1];
    if (m && /^[-•*●▪]/.test(t)) { if (ult) ult.bul.push(m[1]); else out.push({ texto: m[1], bul: [] }); novo = false; return; }
    if (!novo && ult && !ult.bul.length && !/[.:;!?]$/.test(ult.texto)) { ult.texto += ' ' + t; return; }
    out.push({ texto: t, bul: [] }); novo = false;
  });
  return out;
}
function comTitulo(t) {
  const s = String(t || '');
  if (/^\*\*/.test(s)) return s;
  const m = s.match(/^([A-ZÀ-Ú][^:.;]{1,60}):(\s+\S[\s\S]*)$/);
  if (m && m[1].trim().split(/\s+/).length <= 7) return `**${m[1].trim()}:**${m[2]}`;
  return s;
}

/* Montador de peça com seções "01 – TÍTULO" e cláusulas 1.1, 1.2, 1.2.1 */
function Peca() {
  const B = []; let s = 0, c = 0;
  const api = {
    blocks: B,
    raw(b) { B.push(b); return api; },
    sec(tit) { s++; c = 0; B.push({ t: 'sec', text: `${String(s).padStart(2, '0')} – ${tit.toUpperCase()}` }); return api; },
    sub(tit) { B.push({ t: 'sub', text: tit }); return api; },
    cl(text, bul, usuario) {
      c++; const n = `${s}.${c}.`;
      B.push({ t: 'cl', num: n, text: usuario ? comTitulo(text) : text });
      (bul || []).forEach(x => B.push({ t: 'bul', text: comTitulo(x) }));
      return n;
    },
    sub2(pai, k, text, bul) {
      B.push({ t: 'cl', num: `${pai}${k}.`, text: comTitulo(text), nivel: 2 });
      (bul || []).forEach(x => B.push({ t: 'bul', text: comTitulo(x), nivel: 2 }));
    },
    bul(text) { B.push({ t: 'bul', text: comTitulo(text) }); },
    texto(t, label) {
      const ps = paragrafos(t);
      if (!ps.length) { if (label) api.cl('⟦' + label + '⟧'); return false; }
      ps.forEach(x => api.cl(x.texto, x.bul, true));
      return true;
    },
    subtexto(pai, t) { paragrafos(t).forEach((x, k) => api.sub2(pai, k + 1, x.texto, x.bul)); }
  };
  return api;
}

/* ---------- Pessoas e textos recorrentes ---------- */
function pessoa(nome, cargo, cpf, label) {
  const partes = [ph(nome, label || 'nome')];
  if (has(cargo)) partes.push(cargo.trim());
  const m = mascaraCPF(cpf);
  partes.push(m ? 'CPF nº ' + m : '⟦CPF⟧');
  return partes.join(', ');
}
const REGIMES = {
  preco_unitario: 'empreitada por preço unitário', preco_global: 'empreitada por preço global', integral: 'empreitada integral',
  tarefa: 'contratação por tarefa', integrada: 'contratação integrada', semi: 'contratação semi-integrada', servico_assoc: 'fornecimento e prestação de serviço associado'
};
const ehEng = nat => !!(NAT[nat] || {}).eng || nat === 'manut_veic';
const ehCompra = nat => nat === 'compra';
function regimeTexto(o) { return ehCompra(o.natureza) ? '' : (REGIMES[o.regime] || ''); }
function decretoGestao(cfg) { return has(cfg.decretoGestao) ? cfg.decretoGestao.trim() : ''; }
const DEC_IACANGA = 'Decreto Municipal nº 1.528/2025';
function refDec(cfg, art) { const d = decretoGestao(cfg); return d === DEC_IACANGA && art ? `${art.startsWith(',') ? '' : ' '}${art} do ${d}` : ''; }

function textoJulgamentoTR(p) {
  const par = p.objeto.parcelamento, n = p.itens.length;
  if (par === 'global' || n === 1) return n === 1
    ? 'A contratação compreende item único, devendo a empresa vencedora responsabilizar-se pela totalidade do objeto.'
    : 'A licitação será processada como lote único, englobando todos os itens e serviços detalhados, devendo a empresa vencedora responsabilizar-se pela totalidade dos serviços e materiais exigidos.';
  if (par === 'lotes') return `A contratação será dividida em lotes, cada um disputado e adjudicado separadamente, podendo haver um vencedor diferente para cada lote. O licitante poderá participar de um ou mais lotes, desde que cote todos os itens de cada lote. ${composicaoLotes(p)}`;
  return 'A contratação será dividida por itens, cada um disputado e adjudicado separadamente, podendo haver um vencedor diferente para cada item.';
}
function fontesPesquisa(p) {
  const usados = new Set();
  p.itens.forEach(it => (it.cot || []).forEach(c => { if (!c.excluir && num(c.valor) > 0) usados.add(c.param || 'IV'); }));
  const nomes = {
    S: 'tabelas oficiais de referência (SINAPI, SICRO ou CDHU)', I: 'painel de preços e contratações publicadas no PNCP', II: 'contratações similares de outros entes públicos',
    III: 'mídia especializada, tabelas de referência e sítios eletrônicos', IV: 'orçamentos obtidos diretamente com fornecedores do ramo', V: 'base nacional de notas fiscais eletrônicas'
  };
  const l = ['S', 'I', 'II', 'III', 'IV', 'V'].filter(k => usados.has(k)).map(k => nomes[k]);
  return l.length ? l.join('; ') : '⟦fontes da pesquisa de preços⟧';
}
function cicloVida(p) {
  const o = p.objeto, nat = o.natureza, sec = ph(p.demanda.secretaria, 'secretaria requisitante');
  if (ehCompra(nat)) return [
    `**Início do ciclo de vida:** O ciclo inicia-se com a emissão da nota de empenho ou da autorização de fornecimento, a partir da qual a contratada deverá separar, embalar e transportar os bens até o local indicado, às suas expensas.`,
    `**Entrega e recebimento:** Os bens serão recebidos provisoriamente, para conferência das quantidades, e definitivamente, após a verificação da conformidade com as especificações deste estudo e do Termo de Referência.`,
    `**Uso:** Após o aceite, os bens serão utilizados pelo(a) ${sec} na finalidade que motivou a contratação, cabendo ao fiscal registrar eventuais defeitos.`,
    `**Garantia:** Durante o prazo de garantia, a contratada deverá substituir, sem ônus para a Administração, os bens que apresentarem vícios ou defeitos, mediante notificação do fiscal.`,
    `**Final do ciclo de vida:** Embalagens e bens inservíveis deverão ter destinação ambientalmente adequada, observadas a Lei nº 12.305/2010 (Política Nacional de Resíduos Sólidos) e, quando aplicável, a logística reversa a cargo do fornecedor.`
  ];
  if (ehEng(nat)) return [
    `**Início do ciclo de vida:** O ciclo inicia-se com a emissão da Ordem de Serviço, a partir da qual a contratada deverá mobilizar os recursos humanos, materiais e equipamentos necessários, responsabilizando-se pelo fornecimento e transporte de todos os insumos.`,
    `**Execução:** Os serviços deverão seguir rigorosamente as especificações técnicas estabelecidas, garantindo a correta aplicação dos materiais e a conformidade estrutural. A localização e a prioridade dos trabalhos serão definidas pelo(a) ${sec}.`,
    `**Operação e uso:** Após a execução e o aceite pela Administração, o objeto deverá apresentar resistência e durabilidade compatíveis com as condições ambientais e de uso, cumprindo sua função ao longo da vida útil.`,
    `**Manutenção:** A contratada deverá assegurar a qualidade dos materiais e da execução, com garantia unificada de material e serviço. A fiscalização municipal realizará inspeções periódicas para acionar a garantia, quando necessário.`,
    `**Final do ciclo de vida:** Ao término da vida útil, os materiais deverão ser removidos e, preferencialmente, reaproveitados. O descarte do material não reaproveitável deverá ser ambientalmente adequado, observadas a Lei nº 12.305/2010 e a Resolução CONAMA nº 307/2002.`
  ];
  return [
    `**Início do ciclo de vida:** O ciclo inicia-se com a emissão da Ordem de Serviço, a partir da qual a contratada deverá mobilizar a equipe e os recursos necessários à execução.`,
    `**Execução:** Os serviços serão prestados conforme as especificações, os prazos e a metodologia deste estudo e do Termo de Referência, sob acompanhamento do fiscal do contrato.`,
    `**Resultado e recebimento:** Cada etapa executada será medida e recebida pela fiscalização, que verificará o atendimento das exigências técnicas antes do pagamento.`,
    `**Encerramento:** Ao final da execução, o gestor do contrato registrará a avaliação do desempenho da contratada, subsidiando futuras contratações.`
  ];
}
function garantiaPadrao(nat) {
  if (ehEng(nat) && nat !== 'manut_veic') return 'O prazo de garantia será de 5 (cinco) anos, contados do recebimento definitivo, quanto à solidez e à segurança do trabalho, em razão dos materiais e do solo, nos termos do art. 618 da Lei nº 10.406/2002 (Código Civil). Para componentes de desgaste natural ou mecanismos móveis, aplica-se a garantia legal de 90 (noventa) dias ou a do fabricante, prevalecendo a maior.';
  if (nat === 'manut_veic') return 'Os serviços terão garantia mínima de 90 (noventa) dias e as peças, a garantia do fabricante, nunca inferior a 90 (noventa) dias, contados do recebimento definitivo.';
  if (ehCompra(nat)) return 'Os bens terão garantia mínima igual à garantia legal (Código de Defesa do Consumidor) ou à oferecida pelo fabricante, prevalecendo a maior, contada do recebimento definitivo.';
  return 'Durante a vigência contratual, a contratada deverá refazer, sem ônus para a Administração, os serviços executados em desacordo com as especificações.';
}
function medicaoPadrao(p) {
  const NOMES = { un: 'unidade', und: 'unidade', unid: 'unidade', unidade: 'unidade', m: 'metro linear', ml: 'metro linear', 'metro linear': 'metro linear', metro: 'metro linear', 'm²': 'metro quadrado', m2: 'metro quadrado', 'metro quadrado': 'metro quadrado', 'm³': 'metro cúbico', m3: 'metro cúbico', kg: 'quilo', l: 'litro', h: 'hora', hora: 'hora', mês: 'mês', mes: 'mês', 'diária': 'diária', serviço: 'serviço' };
  const unids = [...new Set(p.itens.map(it => { const u = String(it.unid || 'un').trim(); return NOMES[u.toLowerCase()] || u; }).filter(Boolean))];
  const lista = unids.length > 1 ? unids.slice(0, -1).join(', ') + ' e ' + unids[unids.length - 1] : unids[0];
  const compra = ehCompra(p.objeto.natureza);
  return compra
    ? `Os bens serão quantificados por ${lista} efetivamente entregue e aceito pela fiscalização, conforme cada autorização de fornecimento, mediante verificação do cumprimento das especificações técnicas.`
    : `Os serviços serão medidos por ${lista} efetivamente executado e aprovado pela fiscalização, após a conclusão de cada etapa solicitada na Ordem de Serviço, mediante verificação do cumprimento das especificações técnicas.`;
}
function vigenciaTR(p) {
  const o = p.objeto, e = p.execucao;
  if (o.continuo) return `O prazo de vigência do contrato será de ${ph(e.vigenciaTexto || (o.vigenciaMeses ? o.vigenciaMeses + ' (' + extenso(num(o.vigenciaMeses)) + ') meses' : ''), 'vigência')}, contado da assinatura, prorrogável sucessivamente até o limite de 10 (dez) anos, na forma dos arts. 106 e 107 da Lei nº 14.133/2021.`;
  if (ehCompra(o.natureza) && o.entregaImediata && !has(e.vigenciaTexto)) return 'Por se tratar de compra com entrega imediata e integral, sem obrigações futuras, a contratação poderá ser formalizada por instrumento substitutivo do contrato, como a nota de empenho (art. 95, II, da Lei nº 14.133/2021).';
  return `O prazo de vigência do contrato será de ${ph(e.vigenciaTexto, 'vigência, ex.: 12 (doze) meses')}, contado da assinatura. Não concluído o objeto no período, o prazo será prorrogado automaticamente, na forma do art. 111 da Lei nº 14.133/2021.`;
}
function selecaoTR(p, cfg, a) {
  const h = a.escolhida;
  if (!h) return ['⟦forma de seleção do fornecedor⟧'];
  if (!a.direta) {
    const crit = criterioPadrao(p, h, a.est, cfg).toUpperCase();
    const julg = p.objeto.parcelamento === 'lotes' ? ' POR LOTE' : p.objeto.parcelamento === 'global' && p.itens.length > 1 ? ' GLOBAL' : p.itens.length > 1 ? ' POR ITEM' : '';
    return [`**Forma de Seleção:** O fornecedor será selecionado por meio de LICITAÇÃO, na modalidade ${h.titulo.toUpperCase()}, sob a forma ELETRÔNICA, com adoção do critério de julgamento pelo ${crit}${julg}.`];
  }
  const out = [`**Forma de Seleção:** O fornecedor será selecionado por meio de contratação direta, com fundamento no ${h.base} da Lei nº 14.133/2021 (${h.titulo.toLowerCase()}).`];
  if (['75-I', '75-II'].includes(h.id)) {
    out.push('A contratação será precedida de aviso em sítio eletrônico oficial, pelo prazo mínimo de 3 (três) dias úteis, para obtenção de propostas adicionais, selecionando-se a de menor preço (art. 75, §3º).');
    if (a.simples) out.push(`O enquadramento será confirmado pela ${setorLic(cfg)}, após a verificação do somatório das despesas de mesma natureza no exercício (art. 75, §1º).`);
  }
  return out;
}

function criteriosSustentabilidade(nat) {
  const L = ['A contratada deverá dar destinação ambientalmente adequada às embalagens, sobras e resíduos gerados, sem ônus para a Administração, conforme a Lei nº 12.305/2010.'];
  if (ehCompra(nat)) L.push('Os bens deverão atender às normas técnicas da ABNT e, quando aplicável, à certificação do INMETRO e aos registros exigidos pelos órgãos competentes, sendo preferidos produtos com embalagens recicláveis ou de menor volume.');
  else L.push('A contratada deverá utilizar materiais e equipamentos que atendam às normas técnicas da ABNT, priorizar a redução do consumo de água e energia e fornecer aos seus empregados os equipamentos de proteção individual exigidos pelas Normas Regulamentadoras do Ministério do Trabalho.');
  return L;
}
function obrigacoesContratada(p, cfg) {
  const nat = p.objeto.natureza, compra = ehCompra(nat), eng = ehEng(nat) && nat !== 'manut_veic';
  const L = [
    `${compra ? 'entregar os bens' : 'executar os serviços'} conforme as especificações, quantidades, prazos e locais definidos neste Termo de Referência e na proposta apresentada;`,
    `${compra ? 'substituir, às suas expensas, os bens' : 'refazer, às suas expensas, os serviços'} recusados pela fiscalização, no prazo de ${num(p.execucao.prazoRejeicao) || 5} (${extenso(num(p.execucao.prazoRejeicao) || 5)}) dias;`,
    'responsabilizar-se pelos danos causados à Administração ou a terceiros, decorrentes de culpa ou dolo na execução do contrato;',
    'manter, durante toda a execução, as condições de habilitação e qualificação exigidas na contratação;',
    'arcar com todos os encargos trabalhistas, previdenciários, fiscais, comerciais e de transporte resultantes da execução;',
    'comunicar à fiscalização, por escrito e de imediato, qualquer ocorrência que possa comprometer o cumprimento do objeto;',
    'atender às solicitações e determinações da fiscalização, prestando os esclarecimentos que forem requeridos;',
    'não transferir a terceiros, total ou parcialmente, o objeto contratado, salvo quando expressamente admitida a subcontratação;'
  ];
  if (!compra) L.splice(2, 0, 'indicar preposto para representá-la durante a execução, com poderes para resolver as questões operacionais;', 'fornecer aos seus empregados os uniformes, crachás e equipamentos de proteção individual exigidos pelas Normas Regulamentadoras, responsabilizando-se pela segurança do trabalho;');
  if (eng) L.splice(2, 0, 'apresentar, antes do início dos serviços, a Anotação de Responsabilidade Técnica (ART) ou o Registro de Responsabilidade Técnica (RRT) do profissional responsável pela execução;', 'manter o local de execução limpo e sinalizado, removendo entulhos e sobras de materiais ao final de cada etapa;');
  if (compra) L.splice(2, 0, 'entregar os bens em embalagens adequadas, com identificação do produto, do fabricante e, quando aplicável, do prazo de validade;');
  return L;
}
function obrigacoesContratante(p) {
  const compra = ehCompra(p.objeto.natureza);
  return [
    `receber ${compra ? 'os bens' : 'os serviços'} nas condições e prazos estabelecidos neste Termo de Referência;`,
    'prestar as informações e os esclarecimentos que venham a ser solicitados pela contratada;',
    `${compra ? 'permitir o acesso dos empregados da contratada ao local de entrega' : 'permitir o acesso dos empregados da contratada aos locais de execução'}, observadas as normas de segurança;`,
    'acompanhar e fiscalizar a execução, por meio do gestor e dos fiscais designados;',
    'notificar a contratada, por escrito, sobre falhas ou irregularidades constatadas, fixando prazo para a correção;',
    'efetuar o pagamento no prazo e nas condições estabelecidos, após o atesto da fiscalização;',
    'aplicar as sanções cabíveis, assegurados o contraditório e a ampla defesa.'
  ];
}

/* ======================= ETP (modelo Iacanga) ======================= */
function docETP(p, cfg, a) {
  const o = p.objeto, d = p.demanda, e = p.execucao, P = Peca(), ano = cfg.valores.ano;
  P.raw({ t: 'title', text: 'ESTUDO TÉCNICO PRELIMINAR' });

  P.sec('Da unidade requisitante');
  P.cl(`**Órgão Requisitante:** ${ph(d.secretaria, 'secretaria')}${has(d.unidade) && d.unidade !== d.secretaria ? ', por meio do(a) ' + d.unidade : ''}, sob a responsabilidade de ${ph(d.responsavel, 'nome do responsável')}, ${ph(d.cargo, 'cargo')}.`);
  P.cl(`**Fundamentação Legal:** Este Estudo Técnico Preliminar (ETP) foi elaborado em observância ao art. 18, §§ 1º e 2º, da Lei Federal nº 14.133/2021${cfg.regulamento === 'municipal' && has(cfg.regulamentoTexto) ? ' e ao ' + cfg.regulamentoTexto : ''}, com a finalidade de caracterizar a necessidade e a melhor solução para o interesse público.`);

  P.sec('Do objeto');
  const reg = regimeTexto(o);
  P.cl(`O presente processo tem por objetivo a ${minuscIni(semPonto(ph(o.resumo, 'objeto')))}${reg ? ', sob o regime de ' + reg : ''}, conforme as especificações técnicas e os quantitativos constantes deste estudo e do Termo de Referência.`);
  const comLocal = p.itens.some(it => has(it.local));
  P.cl('O objeto compreende os seguintes itens:');
  P.raw(comLocal
    ? { t: 'table', cols: [{ h: 'Item', w: 1 }, { h: 'Descrição técnica', w: 6 }, { h: 'Locais', w: 3.4 }], rows: p.itens.map((it, i) => [String(i + 1).padStart(2, '0'), ph(it.desc, 'descrição do item'), has(it.local) ? it.local : '—']) }
    : itensTabela(p, false));
  P.texto(o.requisitos);
  if (has(o.especificacoes)) { P.cl('Todos os materiais e a execução dos serviços devem respeitar rigorosamente as especificações abaixo.'); P.texto(o.especificacoes); }

  P.sec('Fundamentação e descrição da necessidade da contratação');
  P.texto(d.necessidade, 'descrição da necessidade: problema, quem é afetado, desde quando, risco');
  if (has(d.consequencias)) P.cl(`**Consequências da não contratação:** ${d.consequencias.trim()}`);

  P.sec('Demonstração da previsão da contratação no Plano Anual de Contratações');
  if (d.pca === 'sim') P.cl(`A presente contratação está prevista no Plano de Contratações Anual (PCA) do exercício de ${ano}${has(d.pcaRef) ? ' (' + d.pcaRef.trim() + ')' : ''}, em alinhamento com o planejamento da Administração.`);
  else {
    if (d.pca === 'nao') {
      P.cl(`A presente contratação não constou inicialmente no Plano de Contratações Anual (PCA) do exercício de ${ano}.`);
      P.texto(d.pcaJust, 'justificativa da inclusão da demanda fora do PCA (demanda superveniente)');
    } else P.cl(`O Município não elaborou Plano de Contratações Anual para o exercício de ${ano}, instrumento de elaboração facultativa (art. 12, VII, da Lei nº 14.133/2021). A demanda alinha-se às ações da unidade requisitante previstas no orçamento vigente.`);
  }
  const dotsE = dotacoesValidas(p);
  P.cl(`A contratação possui adequação orçamentária, havendo previsão de recursos na Lei Orçamentária Anual (LOA) vigente, na natureza de despesa ${elementoTexto(p)}${dotsE.length ? ', nas dotações: ' + dotsE.map(x => `${ph(x.orgao, 'secretaria')} (ficha ${ph(x.ficha, 'ficha')})`).join('; ') : ', em dotação a ser indicada pela unidade de contabilidade'}, conforme declaração de disponibilidade orçamentária a ser juntada aos autos.`);

  P.sec('Requisitos da contratação');
  P.cl('A CONTRATADA deverá preencher todos os requisitos de regularidade jurídica, fiscal, social, trabalhista, técnica e econômico-financeira previstos na Lei nº 14.133/2021.');
  if (has(p.disputa.habTecnica)) P.cl(`Para fins de habilitação técnica, a contratada deverá comprovar: ${p.disputa.habTecnica.trim()}`);
  P.sub('Subcontratação');
  P.cl(o.subcontratacao === 'parcial' ? `É admitida a subcontratação parcial do objeto, nos limites autorizados pela Administração e sem transferência da responsabilidade da contratada (art. 122 da Lei nº 14.133/2021). ${has(o.subcontratacaoJust) ? o.subcontratacaoJust.trim() : '⟦parcelas que podem ser subcontratadas e limite⟧'}` : 'Não é admitida a subcontratação do objeto contratual.');
  P.sub('Garantia da contratação');
  P.cl(num(e.garantiaContratual) > 0
    ? `Será exigida garantia de ${num(e.garantiaContratual)}% do valor inicial do contrato, em uma das modalidades do art. 96, §1º, da Lei nº 14.133/2021.`
    : `Não haverá exigência da garantia da contratação de que tratam os arts. 96 e seguintes da Lei nº 14.133/2021, ${has(e.garantiaJust) ? semPonto(minuscIni(e.garantiaJust)) : 'considerando a natureza do objeto e que o pagamento ocorrerá somente após a execução e o recebimento'}.`);
  if (has(e.metodologia)) { const ps = paragrafos(e.metodologia); P.cl(`Na execução do ${ehCompra(o.natureza) ? 'fornecimento' : 'serviço'}, devem ser observados:`, ps.flatMap(x => [x.texto, ...x.bul])); }
  P.sub('Critérios de sustentabilidade');
  criteriosSustentabilidade(o.natureza).forEach(t => P.cl(t));
  P.sub('Garantia, manutenção e assistência técnica');
  P.texto(has(e.garantia) ? e.garantia : garantiaPadrao(o.natureza));
  if (has(e.assistencia)) P.texto(e.assistencia);
  vistoriaClausulas(P, p, false);

  P.sec('Estimativas das quantidades para a contratação');
  P.texto(o.memoriaQtd, 'memória de cálculo das quantidades: a conta que leva a cada quantidade');
  if (comLocal) P.raw(itensTabela(p, false));
  P.cl(textoJulgamentoTR(p));

  P.sec('Levantamento de mercado');
  if (!P.texto(o.alternativas)) P.cl('Foi realizado levantamento das soluções disponíveis no mercado para o atendimento da necessidade, considerando a aquisição ou contratação junto a fornecedores especializados.');
  if (has(o.vantagens)) P.cl(`**Vantagens da solução escolhida:**`, paragrafos(o.vantagens).flatMap(x => [x.texto, ...x.bul]));
  if (has(o.desvantagens)) P.cl(`**Desvantagens e riscos da solução escolhida:**`, paragrafos(o.desvantagens).flatMap(x => [x.texto, ...x.bul]));
  if (has(o.justEscolha)) { P.sub('Justificativa da escolha da solução'); P.texto(o.justEscolha); }
  const nForn = new Set(p.itens.flatMap(it => (it.cot || []).filter(c => !c.excluir && num(c.valor) > 0).map(c => c.fonte))).size;
  P.cl(`Para a elaboração deste Estudo Técnico Preliminar, foi realizada pesquisa de mercado${nForn ? `, com ${nForn} ${nForn > 1 ? 'fontes de preço válidas' : 'fonte de preço válida'}` : ''}, assegurando a viabilidade técnica e econômica da solução proposta.`);

  P.sec('Descrição da solução como um todo');
  P.texto(o.solucao);
  cicloVida(p).forEach(t => P.cl(t));

  P.sec('Do parcelamento ou não da contratação');
  if (p.itens.length === 1) P.cl('O objeto é composto por item único, não havendo parcelamento a considerar.');
  else if (o.parcelamento === 'itens') P.cl('A contratação será parcelada por itens, regra prevista no art. 40, V, "b", da Lei nº 14.133/2021, permitindo que cada item seja disputado separadamente, o que amplia a competição e favorece a obtenção de preços mais vantajosos.');
  else {
    P.cl(o.parcelamento === 'lotes'
      ? `A contratação será dividida em lotes, agrupando itens de mesma natureza. ${composicaoLotes(p)}`
      : `A presente contratação não será parcelada, optando-se pela adjudicação do objeto a um único fornecedor, com fundamento no art. 40, §3º${ehCompra(o.natureza) ? '' : ', e no art. 47, §1º'}, da Lei nº 14.133/2021.`);
    P.texto(o.justParcelamento, o.parcelamento === 'lotes' ? 'justificativa técnica ou econômica do agrupamento em lotes' : 'justificativa técnica e econômica do não parcelamento');
  }

  P.sec('Estimativa do valor da contratação');
  P.cl(`O valor total estimado para a contratação é de **${valorExtenso(a.est)}**, conforme a composição abaixo:`);
  P.raw(itensTabela(p, true));
  P.cl(`**Metodologia de Pesquisa:** A estimativa de preços foi realizada em conformidade com o art. 23 da Lei nº 14.133/2021, com base em: ${fontesPesquisa(p)}.`);
  const exc = p.itens.reduce((x, it) => x + (it.cot || []).filter(c => c.excluir).length, 0);
  P.cl(`**Critério de Cálculo:** Para a definição do valor de referência de cada item, foi utilizada a ${{ media: 'média', mediana: 'mediana', menor: 'menor valor' }[p.pesquisa.metodo] || 'mediana'} dos preços válidos${exc ? `, desconsiderando-se ${exc} ${exc > 1 ? 'valores' : 'valor'} com variação excessiva em relação à tendência central (inexequíveis ou com sobrepreço)` : ''}, garantindo a economicidade e a compatibilidade com a realidade de mercado.`);
  if (has(p.pesquisa.just)) P.texto(p.pesquisa.just);
  P.cl('A memória de cálculo detalhada, com as planilhas comparativas, as fontes consultadas e a data-base dos orçamentos, encontra-se acostada aos autos do processo administrativo.');

  P.sec('Demonstrativo dos resultados pretendidos');
  if (!P.texto(o.resultados)) {
    P.cl('Atender integralmente à necessidade descrita no item 03 deste estudo, nas quantidades e especificações definidas.');
    P.cl('Assegurar a economicidade e a eficiência da contratação, com qualidade e durabilidade compatíveis com o uso pretendido.');
    P.cl('Garantir a continuidade e a regularidade dos serviços públicos prestados pela unidade requisitante.');
  }

  P.sec('Providências a serem adotadas pela Administração previamente à celebração do contrato');
  if (!P.texto(o.providencias)) P.cl('Não serão necessárias providências prévias à celebração do contrato, além da designação formal do gestor e dos fiscais (art. 117 da Lei nº 14.133/2021).');

  P.sec('Contratações correlatas e/ou interdependentes');
  if (!P.texto(o.correlatas)) P.cl('Não foram identificadas contratações correlatas ou interdependentes para a viabilidade do objeto.');

  P.sec('Descrição de possíveis impactos ambientais e respectivas medidas mitigadoras');
  if (!P.texto(o.impactos)) P.cl(`A contratada deverá adotar práticas de sustentabilidade na execução, dando destinação ambientalmente adequada às embalagens e aos resíduos gerados, sem ônus para a Administração, conforme a Lei nº 12.305/2010${ehEng(o.natureza) && o.natureza !== 'manut_veic' ? ' e a Resolução CONAMA nº 307/2002' : ''}.`);

  P.sec('Posicionamento conclusivo e escolha da solução');
  P.texto(o.conclusao);
  P.cl('Pelo exposto, declara-se a viabilidade e a razoabilidade da contratação, nos termos dispostos na solicitação e neste Estudo Técnico Preliminar.');

  P.raw({ t: 'p', text: `${cfg.cidade}, ${dataExtenso(d.data)}.`, align: 'right' });
  P.raw({ t: 'sig', nome: ph(d.responsavel, 'nome do responsável'), cargo: ph(d.cargo, 'cargo'), caps: true });
  return { id: 'etp', titulo: 'Estudo Técnico Preliminar', sigla: 'ETP', fund: 'art. 18, §1º', blocks: P.blocks };
}

function vistoriaClausulas(P, p, tr) {
  const v = p.disputa.vistoria || 'nao', onde = ph(p.disputa.vistoriaLocal || p.demanda.secretaria, 'unidade para agendamento');
  if (v === 'nao') return;
  if (tr) {
    const n = P.cl('**Da Vistoria Técnica:**');
    P.sub2(n, 1, v === 'obrigatoria'
      ? 'A licitante deverá realizar vistoria técnica prévia aos locais de execução, a fim de avaliar as condições dos terrenos, acessos e demais particularidades que influenciem a composição de seus preços. ⟦justificar a obrigatoriedade: imprescindível ao conhecimento do objeto (art. 63, §2º)⟧'
      : 'É facultada à licitante a realização de vistoria técnica prévia aos locais onde serão executados os serviços, a fim de avaliar as condições dos terrenos, acessos e demais particularidades que possam influenciar na composição de seus preços.');
    P.sub2(n, 2, `A vistoria deverá ser agendada junto ao(à) ${onde}, mediante contato prévio.`);
    if (v === 'facultativa') P.sub2(n, 3, 'Caso a licitante opte por não realizar a vistoria, deverá apresentar Declaração de Pleno Conhecimento do Objeto, atestando ciência das condições locais e de que os preços propostos são suficientes para a execução integral, não podendo alegar desconhecimento para pleitear aditivos ou reequilíbrio (art. 63, §3º).');
    return;
  }
  P.cl(v === 'obrigatoria'
    ? 'Dadas as particularidades dos locais de execução, a vistoria técnica prévia será obrigatória.'
    : 'Dada a dispersão e as particularidades dos locais de execução, facultar-se-á aos interessados a realização de vistoria técnica prévia.');
  if (v === 'facultativa') P.cl('Caso a licitante opte por não realizar a vistoria, deverá apresentar, junto à proposta, declaração formal de pleno conhecimento das condições locais e da natureza dos serviços.');
  P.cl(`O agendamento da vistoria deverá ser realizado junto ao(à) ${onde}.`);
}

/* ======================= TR (modelo Iacanga) ======================= */
function docTR(p, cfg, a) {
  const o = p.objeto, e = p.execucao, d = p.demanda, P = Peca(), compra = ehCompra(o.natureza);
  P.raw({ t: 'title', text: 'TERMO DE REFERÊNCIA' });

  P.sec('Condições gerais da contratação');
  P.cl(`O presente Termo de Referência tem por objetivo a ${minuscIni(semPonto(ph(o.resumo, 'objeto')))}, no âmbito do(a) ${ph(d.secretaria, 'secretaria')}.`);
  P.cl(textoJulgamentoTR(p));
  P.cl(vigenciaTR(p));
  P.cl(`A solução consiste ${compra ? 'no fornecimento dos itens' : 'na execução dos itens'} abaixo descritos, conforme as especificações técnicas detalhadas:`);
  P.raw(itensTabela(p, false));
  const locais = p.itens.map((it, i) => has(it.local) ? `Item ${String(i + 1).padStart(2, '0')}: ${it.local.trim()}` : null).filter(Boolean);
  if (locais.length) P.cl(`Os locais de ${compra ? 'entrega' : 'execução'}, por item, são:`, locais);
  if (has(o.requisitos) || has(o.especificacoes)) {
    const n = P.cl('**Detalhamento Técnico dos Materiais e Serviços:**');
    const ps = paragrafos([o.requisitos, o.especificacoes].filter(has).join('\n\n'));
    ps.forEach((x, k) => P.sub2(n, k + 1, x.texto, x.bul));
  }

  P.sec('Fundamentação e descrição da necessidade da contratação');
  P.texto(d.necessidade, 'descrição da necessidade');
  if (has(d.consequencias)) P.cl(`**Consequências da não contratação:** ${d.consequencias.trim()}`);
  P.cl('A fundamentação completa da contratação consta do Estudo Técnico Preliminar que integra os autos.');

  P.sec('Descrição da solução como um todo');
  if (!P.texto(o.solucao)) P.cl(`A solução proposta consiste na ${minuscIni(semPonto(ph(o.resumo, 'objeto')))}, abrangendo ${compra ? 'o fornecimento, a entrega e a garantia dos bens' : 'o fornecimento de todos os materiais, equipamentos e mão de obra necessários'}, conforme as especificações técnicas e os quantitativos deste Termo de Referência.`);

  P.sec('Requisitos da contratação');
  P.cl('A CONTRATADA deverá preencher todos os requisitos de regularidade jurídica, fiscal, social, trabalhista, técnica e econômico-financeira previstos na Lei nº 14.133/2021.');
  if (has(p.disputa.habTecnica)) { const n = P.cl('Para fins de habilitação técnica e garantia da qualidade, a contratada deverá comprovar:'); paragrafos(p.disputa.habTecnica).forEach((x, k) => P.sub2(n, k + 1, x.texto, x.bul)); }
  if (has(p.disputa.habEconomica)) P.cl(`**Qualificação econômico-financeira:** ${p.disputa.habEconomica.trim()}`);
  P.cl(o.subcontratacao === 'parcial' ? `É admitida a subcontratação parcial, sem transferência de responsabilidade da contratada (art. 122). ${has(o.subcontratacaoJust) ? o.subcontratacaoJust.trim() : '⟦parcelas e limite da subcontratação⟧'}` : 'Não será admitida a subcontratação do objeto.');
  P.cl(has(e.garantia) ? e.garantia.trim() : garantiaPadrao(o.natureza));
  P.cl(num(e.garantiaContratual) > 0 ? `Será exigida garantia de ${num(e.garantiaContratual)}% do valor inicial do contrato, em uma das modalidades do art. 96, §1º, da Lei nº 14.133/2021.` : 'Não será exigida garantia da contratação (arts. 96 e seguintes da Lei nº 14.133/2021).');
  vistoriaClausulas(P, p, true);

  P.sec('Execução do objeto');
  if (has(e.metodologia)) { const ps = paragrafos(e.metodologia); P.cl(`A execução ${compra ? 'do fornecimento' : 'dos serviços'} deverá observar rigorosamente a seguinte metodologia:`, ps.flatMap(x => [x.texto, ...x.bul])); }
  P.cl(`${compra ? 'Os bens serão entregues' : 'Os serviços serão prestados'} em: ${ph(e.local, 'local de entrega ou execução')}${compra ? '' : ', conforme demanda e emissão de Ordem de Serviço'}.`);
  P.cl([has(e.prazoInicio) ? `A contratada terá até ${semPonto(e.prazoInicio)} para iniciar ${compra ? 'o fornecimento' : 'os serviços'}.` : '', `O prazo de ${compra ? 'entrega' : 'execução'} é de ${semPonto(ph(e.prazo, 'prazo de entrega ou execução'))}.`].filter(Boolean).join(' '));
  P.cl(has(e.recebimento) ? e.recebimento.trim() : `O recebimento provisório ocorrerá no ato da ${compra ? 'entrega' : 'conclusão de cada etapa'}, para efeito de posterior verificação, e o definitivo, após a verificação da qualidade e da conformidade com este termo, em até 10 (dez) dias úteis (art. 140 da Lei nº 14.133/2021).`);

  P.sub('Obrigações da Contratada');
  P.cl('Constituem obrigações da contratada, além das demais previstas neste Termo de Referência e na legislação:', obrigacoesContratada(p, cfg));
  P.sub('Obrigações da Contratante');
  P.cl('Constituem obrigações da contratante:', obrigacoesContratante(p));

  P.sec('Gestão e fiscalização');
  P.sub('GESTOR DO CONTRATO');
  P.cl(`Indica-se o(a) servidor(a) ${pessoa(e.gestor, e.gestorCargo, e.gestorCpf, 'nome do gestor')}, para atuar como Gestor do Contrato.`);
  P.sub('FISCAL TÉCNICO DO CONTRATO');
  P.cl(`Indica-se o(a) servidor(a) ${pessoa(e.fiscal, e.fiscalCargo, e.fiscalCpf, 'nome do fiscal técnico')}, para atuar como Fiscal Técnico do Contrato.`);
  if (has(e.fiscalAdm)) { P.sub('FISCAL ADMINISTRATIVO DO CONTRATO'); P.cl(`Indica-se o(a) servidor(a) ${pessoa(e.fiscalAdm, e.fiscalAdmCargo, e.fiscalAdmCpf)}, para atuar como Fiscal Administrativo do Contrato.`); }
  if (has(e.fiscalSet)) { P.sub('FISCAL SETORIAL DO CONTRATO'); P.cl(`Indica-se o(a) servidor(a) ${pessoa(e.fiscalSet, e.fiscalSetCargo, e.fiscalSetCpf)}, para atuar como Fiscal Setorial do Contrato.`); }
  P.cl(decretoGestao(cfg)
    ? `As atribuições e responsabilidades dos agentes indicados estão discriminadas no ${decretoGestao(cfg)}${has(cfg.site) ? ', disponível no endereço eletrônico oficial do Município (' + cfg.site + ')' : ''}, e no art. 117 da Lei nº 14.133/2021.`
    : 'As atribuições dos agentes indicados observarão o art. 117 da Lei nº 14.133/2021 e o regulamento aplicável.');

  P.sec('Critérios de medição e de pagamento');
  P.cl(`**Acompanhamento e Medição:** ${has(e.medicao) ? e.medicao.trim() : medicaoPadrao(p)}`);
  P.cl(`**Rejeição:** ${compra ? 'Os bens' : 'Os serviços'} poderão ser rejeitados, no todo ou em parte, quando em desacordo com as especificações, devendo ser ${compra ? 'substituídos' : 'refeitos'} pela contratada, às suas custas, no prazo de ${num(e.prazoRejeicao) || 5} (${extenso(num(e.prazoRejeicao) || 5)}) dias.`);
  P.cl(`**Prazo de Pagamento:** O pagamento será efetuado em até ${num(e.pagamentoDias) || 30} (${extenso(num(e.pagamentoDias) || 30)}) dias, contados da emissão da nota fiscal devidamente atestada pela fiscalização, observada a ordem cronológica de pagamentos (art. 141 da Lei nº 14.133/2021).`);
  P.cl('**Nota Fiscal:** A nota fiscal deverá ser emitida em nome do ' + (cfg.ente || 'Município') + (has(cfg.cnpj) ? ', CNPJ ' + cfg.cnpj : '') + ', com a discriminação dos itens, quantidades e valores, e o número do empenho, acompanhada das certidões de regularidade fiscal e trabalhista vigentes.');
  P.cl('**Condições do Pagamento:** O pagamento fica condicionado à verificação da regularidade fiscal, social e trabalhista da contratada. Havendo irregularidade, a contratada será notificada para regularizar a situação, sem prejuízo das sanções cabíveis. É vedada a antecipação de pagamento sem a correspondente execução.');
  P.cl('**Retenções:** Serão efetuadas as retenções tributárias e previdenciárias previstas na legislação aplicável, quando cabíveis.');
  if (has(e.reajuste) && (o.continuo || !compra)) P.cl(`**Reajuste:** Os preços poderão ser reajustados após 12 (doze) meses da data do orçamento estimado, pelo índice ${e.reajuste.trim()} (art. 25, §7º).`);

  P.sec('Forma e critérios de seleção do fornecedor e forma de fornecimento');
  selecaoTR(p, cfg, a).forEach(t => P.cl(t));
  P.cl(`**Forma de Fornecimento:** ${compra
    ? (o.entregaImediata ? 'O fornecimento será integral, em entrega única, após o recebimento da nota de empenho.' : 'O fornecimento será parcelado, conforme as solicitações da unidade requisitante.')
    : 'A execução do objeto será realizada por local, mediante Ordem de Serviço, com pagamento após medição e atesto do fiscal técnico.'}`);

  P.sec('Estimativas do valor da contratação');
  P.cl(`O custo estimado total da contratação é de **${valorExtenso(a.est)}**, conforme ${{ media: 'média', mediana: 'mediana', menor: 'menor valor' }[p.pesquisa.metodo] || 'mediana'} dos preços válidos de cada item, apurados na pesquisa de preços que integra os autos.`);

  P.sec('Adequação orçamentária');
  P.cl('As despesas decorrentes da presente contratação correrão à conta de recursos específicos consignados no Orçamento vigente.');
  const dots = dotacoesValidas(p);
  if (dots.length) P.cl(`As despesas serão atendidas pelas dotações orçamentárias próprias de ${dots.length > 1 ? 'cada órgão requisitante' : 'o órgão requisitante'} para o exercício de ${cfg.valores.ano}${dots.length > 1 ? ', conforme suas respectivas cotas-partes' : ''}, sendo:`, dots.map(x => `${ph(x.orgao, 'secretaria da dotação')}: ficha ${ph(x.ficha, 'ficha da dotação')}`));
  else if (!a.simples && has(p.orcamento.ficha)) P.cl(`Dotação: ${dotacaoTexto(p.orcamento)}.`);
  else if (p.orcamento.contabilidadeIndica) P.cl('A dotação orçamentária será indicada pela unidade de contabilidade, por ocasião da reserva.');
  else P.cl('⟦ficha da dotação orçamentária⟧');
  P.cl(`**Natureza da Despesa:** ${elementoTexto(p)}.`);

  if (a.instrumento && a.instrumento.tipo === 'substitutivo') {
    P.sec('Sanções administrativas');
    P.cl(`Comete infração administrativa a contratada que incorrer nas condutas do art. 155 da Lei nº 14.133/2021, sujeitando-se às seguintes sanções, assegurados o contraditório e a ampla defesa:`, [
      'advertência, quando não se justificar sanção mais grave;',
      `multa moratória de 0,5% (meio por cento) por dia de atraso sobre o valor da parcela em atraso, limitada a 10% (dez por cento);`,
      `multa compensatória de até ${num(e.multa) || 10}% (${extenso(num(e.multa) || 10)} por cento) sobre o valor da contratação, por inexecução parcial ou total;`,
      'impedimento de licitar e contratar com o Município pelo prazo de até 3 (três) anos;',
      'declaração de inidoneidade para licitar ou contratar, nos casos mais graves.'
    ]);
    P.cl('As sanções serão aplicadas após processo administrativo, observados os arts. 156 a 163 da Lei nº 14.133/2021, e as multas poderão ser descontadas dos pagamentos devidos.');
  }

  P.raw({ t: 'p', text: `${cfg.cidade}, ${dataExtenso(d.data)}.`, align: 'right' });
  P.raw({ t: 'sig', nome: ph(d.responsavel, 'nome do responsável'), cargo: ph(d.cargo, 'cargo'), caps: true });
  return { id: 'tr', titulo: 'Termo de Referência', sigla: 'TR', fund: 'art. 6º, XXIII', blocks: P.blocks };
}

/* ============ Termo de Responsabilidade na Gestão e Fiscalização (modelo Iacanga) ============ */
function docDesignacao(p, cfg, a) {
  const e = p.execucao, d = p.demanda, B = [];
  const dec = decretoGestao(cfg), ente = cfg.ente || ('Município de ' + cfg.cidade);
  const lista = itens => itens.forEach((t, i) => B.push({ t: 'p', text: `${ROMANOS[i]} – ${t}${i < itens.length - 2 ? ';' : i === itens.length - 2 ? '; e' : '.'}` }));
  B.push({ t: 'title', text: 'TERMO DE RESPONSABILIDADE NA GESTÃO E FISCALIZAÇÃO DO CONTRATO', under: true });
  if (has(d.solicitacao)) B.push({ t: 'p', text: `**Solicitação:** ${semPonto(d.solicitacao)}.` });
  if (has(p.numero)) B.push({ t: 'p', text: `**Processo:** ${p.numero}.` });
  B.push({ t: 'p', text: `**Objeto:** ${semPonto(ph(p.objeto.resumo, 'objeto'))}.` });
  B.push({ t: 'p', text: `Considerando a celebração do Contrato que será firmado entre o ${ente}/${cfg.uf || 'SP'} e a empresa a ser contratada, é imperioso nomear servidores para o desempenho das funções de Gestor e Fiscais de Contrato, conforme previsto na Lei nº 14.133/2021, arts. 7º, § 3º, e 117${dec ? ', e no ' + dec : ''}.` });
  B.push({ t: 'p', text: 'Por meio do presente Termo, os servidores abaixo nominados ratificam sua ciência e anuência quanto às funções assumidas e às responsabilidades delas decorrentes, apondo suas assinaturas ao final.' });
  const nomeado = (papel, nome, cargo, cpf) => B.push({ t: 'p', text: `Fica nomeado(a), como ${papel} do Contrato a ser celebrado, o(a) servidor(a) ${pessoa(nome, cargo, cpf, 'nome do ' + papel.toLowerCase())}.` });
  const temSet = has(e.fiscalSet), temAdm = has(e.fiscalAdm), r = art => refDec(cfg, art);
  let k = 1;
  B.push({ t: 'sub', text: `${k++} – DO GESTOR` });
  nomeado('Gestor', e.gestor, e.gestorCargo, e.gestorCpf);
  B.push({ t: 'sub', text: 'DAS RESPONSABILIDADES DO GESTOR' });
  B.push({ t: 'p', text: 'O Gestor do Contrato está ciente e de acordo com suas atribuições, que são:' });
  lista([
    `coordenar as atividades relacionadas às fiscalizações técnica, administrativa e setorial (esta, se for o caso)${r('de que tratam os incisos II, III e IV do art. 15')}`,
    'acompanhar os registros das ocorrências relacionadas à execução do Contrato e as medidas adotadas, informando à autoridade superior aquelas que ultrapassarem a sua competência',
    'acompanhar a manutenção das condições de habilitação da contratada, para fins de empenho de despesa e de pagamento, anotando os problemas que obstem o fluxo normal da liquidação e do pagamento da despesa no relatório de riscos eventuais',
    'coordenar a rotina de acompanhamento e de fiscalização do Contrato, cujo histórico de gerenciamento deverá conter todos os registros formais da execução, a exemplo da ordem de serviço, do registro de ocorrências, das alterações e das prorrogações contratuais, e elaborar relatório destinado à verificação da necessidade de adequações do Contrato para fins de atendimento da finalidade da Administração',
    `coordenar os atos preparatórios à instrução processual e ao envio da documentação pertinente ao setor de Contratos, objetivando a formalização dos procedimentos${r('de que trata o inciso I do art. 15')}`,
    'elaborar o relatório final de que trata a alínea "d" do inciso VI do § 3º do art. 174 da Lei nº 14.133/2021, fazendo uso das informações obtidas durante a execução do Contrato',
    'coordenar a atualização contínua do relatório de riscos, quando couber, durante a gestão do Contrato, com apoio dos Fiscais Técnico, Administrativo e Setorial (este, se for o caso)',
    'emitir documento comprobatório da avaliação realizada pelos fiscais quanto ao cumprimento de obrigações assumidas pela contratada, com menção ao seu desempenho na execução contratual, baseado em indicadores objetivamente definidos e aferidos, e a eventuais penalidades aplicadas',
    `realizar o recebimento definitivo do objeto do Contrato${r('referido no art. 22')}, mediante termo detalhado que comprove o atendimento das exigências contratuais`,
    'tomar providências para a formalização de processo administrativo de responsabilização para fins de aplicação de sanções, a ser conduzido pela comissão de que trata o art. 158 da Lei nº 14.133/2021, ou pelo agente ou setor competente, conforme o caso'
  ]);
  B.push({ t: 'sub', text: `${k++} – DO FISCAL TÉCNICO` });
  nomeado('Fiscal Técnico', e.fiscal, e.fiscalCargo, e.fiscalCpf);
  B.push({ t: 'sub', text: 'DA RESPONSABILIDADE DA FISCALIZAÇÃO TÉCNICA' });
  B.push({ t: 'p', text: 'O Fiscal Técnico do Contrato está ciente e de acordo com suas atribuições, que são:' });
  lista([
    'prestar apoio técnico e operacional ao Gestor do Contrato, com informações pertinentes às suas competências',
    'anotar, no histórico de gerenciamento do Contrato, todas as ocorrências relacionadas à execução do Contrato, com a descrição do que for necessário para a regularização das faltas ou dos defeitos observados',
    'emitir notificações para a correção de rotinas ou de qualquer inexatidão ou irregularidade constatada, com a definição de prazo para a correção',
    'informar ao Gestor do Contrato, em tempo hábil, a situação que demandar decisão ou adoção de medidas que ultrapassem a sua competência, para que adote as medidas necessárias e saneadoras, se for o caso',
    'comunicar imediatamente ao Gestor do Contrato quaisquer ocorrências que possam inviabilizar a execução do Contrato nas datas estabelecidas',
    'fiscalizar a execução do Contrato, para que sejam cumpridas as condições estabelecidas, de modo a assegurar os melhores resultados para a Administração, com a conferência das notas fiscais e das documentações exigidas para o pagamento e, após o ateste, que certifica o recebimento provisório, encaminhar ao Gestor do Contrato para ratificação',
    'comunicar ao Gestor do Contrato, em tempo hábil, o término do Contrato sob sua responsabilidade, com vistas à renovação tempestiva ou à prorrogação contratual',
    `participar da atualização do relatório de riscos durante a fase de gestão do Contrato, em conjunto com os demais fiscais${r(', conforme o disposto no inciso VII do art. 16')}`,
    `auxiliar o Gestor do Contrato, com as informações necessárias, na elaboração do documento comprobatório da avaliação realizada na fiscalização do cumprimento de obrigações assumidas pela contratada${r(', conforme o disposto no inciso VIII do art. 16')}`,
    `realizar o recebimento provisório do objeto do Contrato${r('referido no art. 20')}, mediante termo detalhado que comprove o cumprimento das exigências de caráter técnico`
  ]);
  if (temAdm) {
    B.push({ t: 'sub', text: `${k++} – DO FISCAL ADMINISTRATIVO` });
    nomeado('Fiscal Administrativo', e.fiscalAdm, e.fiscalAdmCargo, e.fiscalAdmCpf);
    B.push({ t: 'sub', text: 'DA RESPONSABILIDADE DA FISCALIZAÇÃO ADMINISTRATIVA' });
    B.push({ t: 'p', text: 'O Fiscal Administrativo do Contrato está ciente e de acordo com suas atribuições, que são:' });
    lista([
      'prestar apoio técnico e operacional ao Gestor do Contrato, com a realização das tarefas ligadas ao controle dos prazos relacionados ao Contrato e à formalização de apostilamentos e de termos aditivos, ao acompanhamento do empenho e do pagamento e ao acompanhamento de garantias e glosas',
      'verificar a manutenção das condições de habilitação da contratada, com a solicitação dos documentos comprobatórios pertinentes, caso necessário',
      'examinar a regularidade no recolhimento das contribuições fiscais, trabalhistas e previdenciárias',
      'atuar tempestivamente na solução de eventuais problemas relacionados ao descumprimento das obrigações contratuais, reportando-se ao Gestor do Contrato, a fim de que este tome as providências cabíveis',
      `participar da atualização do relatório de riscos durante a fase de gestão do Contrato, em conjunto com os demais fiscais${r(', conforme o disposto no inciso VII do art. 16')}`,
      `auxiliar o Gestor do Contrato, com as informações necessárias, na elaboração do documento comprobatório da avaliação realizada na fiscalização do cumprimento de obrigações assumidas pela contratada${r(', conforme o disposto no inciso VIII do art. 16')}`,
      `realizar o recebimento provisório do objeto do Contrato${r('referido no art. 20')}, mediante termo detalhado que comprove o cumprimento das exigências de caráter administrativo`
    ]);
  }
  if (temSet) {
    B.push({ t: 'sub', text: `${k++} – DO FISCAL SETORIAL` });
    nomeado('Fiscal Setorial', e.fiscalSet, e.fiscalSetCargo, e.fiscalSetCpf);
    B.push({ t: 'sub', text: 'DA RESPONSABILIDADE DA FISCALIZAÇÃO SETORIAL' });
    B.push({ t: 'p', text: 'O Fiscal Setorial do Contrato está ciente e de acordo com suas atribuições, que são:' });
    B.push({ t: 'p', text: `I – exercer as atribuições de fiscalização técnica e administrativa na unidade em que o objeto for executado${r('de que tratam o art. 17 e o art. 18')}, reportando-se ao Gestor do Contrato.` });
  }
  B.push({ t: 'p', text: `${cfg.cidade}, ${dataExtenso(d.data)}.`, align: 'right' });
  B.push({ t: 'sig', nome: `${ph(e.gestor, 'nome do gestor')} – Gestor` });
  B.push({ t: 'sig', nome: `${ph(e.fiscal, 'nome do fiscal técnico')} – Fiscal Técnico` });
  if (temAdm) B.push({ t: 'sig', nome: `${e.fiscalAdm.trim()} – Fiscal Administrativo` });
  if (temSet) B.push({ t: 'sig', nome: `${e.fiscalSet.trim()} – Fiscal Setorial` });
  return { id: 'designacao', titulo: 'Termo de Responsabilidade na Gestão e Fiscalização', sigla: 'TRS', fund: 'arts. 7º e 117', blocks: B };
}
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function docDFD(p, cfg, a) {
  const d = p.demanda;
  return { id: 'dfd', titulo: 'Documento de Formalização de Demanda', sigla: 'DFD', fund: 'art. 12, VII, e art. 72, I', blocks: [
    { t: 'title', text: 'DOCUMENTO DE FORMALIZAÇÃO DE DEMANDA', sub: 'Lei nº 14.133/2021, art. 12, VII, e art. 72, I' },
    { t: 'kv', rows: [['Processo', numProc(p, a, cfg)], ['Secretaria', ph(d.secretaria, 'secretaria')], ['Unidade requisitante', ph(d.unidade, 'unidade requisitante')], ['Responsável', `${ph(d.responsavel, 'nome do responsável')} — ${ph(d.cargo, 'cargo')}`], ['Data', fmtData(d.data) || '⟦data⟧']] },
    { t: 'h', text: '1. Objeto' }, { t: 'p', text: ph(p.objeto.resumo, 'descrição resumida do objeto') },
    { t: 'h', text: '2. Justificativa da necessidade' }, { t: 'p', text: ph(d.necessidade, 'problema a resolver, sob a ótica do interesse público') },
    { t: 'h', text: '3. Consequências da não contratação' }, { t: 'p', text: ph(d.consequencias, 'o que acontece se a contratação não ocorrer') },
    { t: 'h', text: '4. Quantidades e estimativa preliminar' }, itensTabela(p, true),
    { t: 'h', text: '5. Previsão no Plano de Contratações Anual' }, { t: 'p', text: pcaTexto(d) },
    { t: 'h', text: '6. Prazo e prioridade' }, { t: 'p', text: `Prioridade ${({ alta: 'alta', media: 'média', baixa: 'baixa' })[d.prioridade] || 'média'}. Data pretendida para o início do fornecimento ou da execução: ${fmtData(d.dataPretendida) || '⟦data pretendida⟧'}.` },
    { t: 'h', text: '7. Indicação de gestor e fiscal' }, { t: 'p', text: `Gestor: ${ph(p.execucao.gestor, 'nome do gestor')}. Fiscal técnico: ${ph(p.execucao.fiscal, 'nome do fiscal')}.${has(p.execucao.fiscalAdm) ? ' Fiscal administrativo: ' + p.execucao.fiscalAdm + '.' : ''}` },
    { t: 'p', text: `${cfg.cidade}, ${dataExtenso(d.data)}.`, align: 'right' },
    { t: 'sig', nome: ph(d.responsavel, 'nome do responsável'), cargo: `${ph(d.cargo, 'cargo')} — ${ph(d.unidade, 'unidade')}` }
  ] };
}

function docRiscos(p, cfg, a) {
  const rows = p.riscos.map((r, i) => [String(i + 1), r.fase, ph(r.risco, 'risco'), NOME_NIVEL[r.prob] || 'Média', NOME_NIVEL[r.imp] || 'Média', nivelRisco(r), ph(r.prev, 'ação preventiva'), ph(r.cont, 'ação de contingência'), ph(r.resp, 'responsável')]);
  return { id: 'riscos', titulo: 'Mapa de Riscos', sigla: 'MR', fund: 'art. 18, X, e art. 72, I', landscape: true, blocks: [
    { t: 'title', text: 'MAPA DE RISCOS', sub: 'Lei nº 14.133/2021, art. 18, X, e art. 72, I' },
    { t: 'kv', rows: [['Processo', numProc(p, a, cfg)], ['Objeto', ph(p.objeto.resumo, 'objeto')], ['Enquadramento', hipTexto(a)]] },
    { t: 'p', text: 'Nível de risco = probabilidade × impacto (Baixa = 1, Média = 2, Alta = 3). Resultado de 1 a 2: baixo; 3 a 4: médio; 6 a 9: alto.' },
    { t: 'table', small: true, cols: [{ h: 'Nº', w: .6 }, { h: 'Fase', w: 1.6 }, { h: 'Risco', w: 3.6 }, { h: 'Prob.', w: 1.2 }, { h: 'Impacto', w: 1.3 }, { h: 'Nível', w: 1.2 }, { h: 'Ação preventiva', w: 3.6 }, { h: 'Contingência', w: 3.2 }, { h: 'Responsável', w: 2 }], rows },
    { t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
    { t: 'sig', nome: ph(p.demanda.responsavel, 'nome do responsável'), cargo: ph(p.demanda.cargo, 'cargo') }
  ] };
}

function docPrecos(p, cfg, a) {
  const m = p.pesquisa.metodo, nomeM = { media: 'média', mediana: 'mediana', menor: 'menor valor' }[m];
  const blocks = [
    { t: 'title', text: a.simples ? 'MAPA DE ORÇAMENTOS' : 'RELATÓRIO DE PESQUISA DE PREÇOS', sub: `Lei nº 14.133/2021, art. 23${cfg.regulamento === 'federal' ? ', e IN SEGES/ME nº 65/2021' : ''}` },
    { t: 'kv', rows: [['Processo', numProc(p, a, cfg)], ['Objeto', ph(p.objeto.resumo, 'objeto')], ['Método', `${nomeM} dos preços válidos`]] },
    { t: 'p', text: `A pesquisa observou os parâmetros do art. 23, §1º, da Lei nº 14.133/2021. Os preços foram analisados criticamente; os valores desconsiderados estão identificados com a respectiva justificativa. O preço de referência de cada item corresponde à ${nomeM} dos preços válidos.` }
  ];
  p.itens.forEach((it, i) => {
    const s = estat(it);
    blocks.push({ t: 'h', text: `Item ${i + 1} — ${ph(it.desc, 'descrição do item')}` });
    if ((it.cot || []).length) {
      blocks.push({ t: 'table', small: true, cols: [{ h: 'Fonte', w: 4 }, { h: 'Art. 23, §1º', w: 1.7 }, { h: 'Data', w: 1.8 }, { h: 'Valor unit.', w: 2 }, { h: 'Situação', w: 4 }],
        rows: it.cot.map(c => [ph(c.fonte, 'fonte'), 'inciso ' + (c.param || '?'), fmtData(c.data) || '⟦data⟧', fmtBRL(num(c.valor)), c.excluir ? 'Desconsiderado. ' + ph(c.just, 'justificativa da exclusão') : 'Válido'])
      });
      blocks.push({ t: 'p', text: s.n ? `Preços válidos: ${s.n}. Menor: ${fmtBRL(s.menor)}. Média: ${fmtBRL(s.media)}. Mediana: ${fmtBRL(s.mediana)}. Coeficiente de variação: ${fmtNum(s.cv * 100, 1)}%. **Preço de referência: ${fmtBRL(precoUnit(it, m))}**, para ${fmtNum(it.qtd, 0)} ${it.unid || 'un'}, totalizando ${fmtBRL(totalItem(it, m))}.` : `Sem preços válidos. Preço de referência informado: ${fmtBRL(num(it.precoRef))}. ⟦justificar a origem do preço⟧` });
      if (s.n && s.n < 3) blocks.push({ t: 'p', text: `Menos de três preços válidos. ${has(p.pesquisa.justMenos3) ? p.pesquisa.justMenos3.trim() : '⟦justificativa para menos de três orçamentos⟧'}` });
      if (s.cv > 0.25) blocks.push({ t: 'p', text: `Análise crítica: a amostra apresentou dispersão elevada (coeficiente de variação de ${fmtNum(s.cv * 100, 1)}%), razão pela qual o preço de referência ${p.pesquisa.metodo === 'mediana' ? 'adota a mediana, que reduz a influência de valores extremos' : 'deve ser reavaliado, preferindo-se a mediana'}.` });
    } else blocks.push({ t: 'p', text: '⟦registrar os preços coletados⟧' });
  });
  blocks.push({ t: 'h', text: 'Resumo' }, itensTabela(p, true));
  if (has(p.pesquisa.just)) blocks.push({ t: 'p', text: p.pesquisa.just });
  if (a.simples) blocks.push({ t: 'note', text: `Orçamentos obtidos junto a fornecedores (art. 23, §1º, IV). A ${setorLic(cfg)} poderá complementar a pesquisa com os demais parâmetros do art. 23, como o Painel de Preços do PNCP e contratações similares de outros órgãos.` });
  blocks.push({ t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
    a.simples ? { t: 'sig', nome: ph(p.demanda.responsavel, 'nome do responsável'), cargo: `${ph(p.demanda.cargo, 'cargo')} — ${ph(p.demanda.unidade, 'unidade')}` } : { t: 'sig', nome: ph(cfg.agente.nome, 'nome do agente de contratação'), cargo: cfg.agente.cargo });
  return { id: 'precos', titulo: a.simples ? 'Mapa de Orçamentos' : 'Relatório de Pesquisa de Preços', sigla: a.simples ? 'MO' : 'PP', fund: 'art. 23', blocks };
}

function docOrcamento(p, cfg, a) {
  return { id: 'orcamento', titulo: 'Reserva e Disponibilidade Orçamentária', sigla: 'DO', fund: 'art. 72, IV, e art. 150', blocks: [
    { t: 'title', text: 'SOLICITAÇÃO DE RESERVA E DECLARAÇÃO DE DISPONIBILIDADE ORÇAMENTÁRIA', sub: 'Lei nº 14.133/2021, arts. 72, IV, e 150' },
    { t: 'p', text: `À Contabilidade. Solicito a reserva orçamentária para ${ph(p.objeto.resumo, 'objeto')}, no valor estimado de **${fmtBRL(a.est)}**, referente ao Processo Administrativo nº ${numProc(p, a, cfg)}.` },
    { t: 'sig', nome: ph(p.demanda.responsavel, 'nome do responsável'), cargo: ph(p.demanda.unidade, 'unidade') },
    { t: 'h', text: 'Declaração' },
    { t: 'p', text: `Declaro que existe dotação orçamentária suficiente para a despesa acima, compatível com a Lei Orçamentária Anual, a Lei de Diretrizes Orçamentárias e o Plano Plurianual, e que foi efetuada a reserva no valor de ${fmtBRL(a.est)}, na seguinte classificação:` },
    { t: 'kv', rows: [['Órgão', ph(p.orcamento.orgao, 'órgão')], ['Unidade orçamentária', ph(p.orcamento.unidade, 'unidade')], ['Funcional programática', ph(p.orcamento.funcional, 'funcional programática')], ['Natureza da despesa', ph(p.orcamento.natureza, 'natureza')], ['Fonte de recurso', ph(p.orcamento.fonte, 'fonte')], ['Ficha', ph(p.orcamento.ficha, 'ficha')]] },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.contabilidade.nome, 'nome do responsável pela contabilidade'), cargo: cfg.contabilidade.cargo }
  ] };
}

function docJustDireta(p, cfg, a) {
  const h = a.escolhida, s = p.situacao, f = p.fornecedor;
  const carac = [];
  if (['75-I', '75-II'].includes(h.id)) carac.push(`O valor estimado de ${fmtBRL(a.est)} somado às despesas com objetos do mesmo ramo de atividade já realizadas no exercício pela unidade gestora (${fmtBRL(num(s.gastoExercicio))}${has(s.gastoDesc) ? ': ' + s.gastoDesc : ''}) totaliza ${fmtBRL(h.soma)}, inferior ao limite de ${fmtBRL(h.limite)} atualizado pelo ${cfg.valores.norma}, observado o art. 75, §1º.`);
  if (h.id === '75-III') carac.push(`A licitação ${ph(s.frustradaRef, 'identificação da licitação anterior')}, encerrada em ${fmtData(s.frustradaData) || '⟦data⟧'}, resultou ${s.frustradaMotivo === 'deserta' ? 'deserta ou sem propostas válidas' : 'fracassada por preços acima do mercado ou incompatíveis'}. Mantêm-se as condições do edital anterior.`);
  if (h.id === '75-VIII') carac.push(`Situação emergencial: ${ph(s.emergDesc, 'descrição fática da emergência, com documentos')}, ocorrida em ${fmtData(s.emergData) || '⟦data da ocorrência⟧'}. A contratação limita-se ao necessário para afastar o risco e às parcelas concluíveis em até 1 ano da ocorrência, vedadas a prorrogação e a recontratação da mesma empresa.`);
  if (h.id === '74-III') carac.push(`Serviço técnico do art. 74, III, alínea "${ph(s.tecnicoAlinea, 'alínea')}" (${ALINEAS_74III[s.tecnicoAlinea] || '⟦descrição⟧'}). Notória especialização: ${ph(s.notoria, 'comprovação da notória especialização (art. 74, §3º)')}.`);
  if (h.id === '74-I') carac.push('A exclusividade do fornecedor está comprovada por ⟦atestado, certidão ou declaração de exclusividade⟧, juntado aos autos (art. 74, §1º).');
  if (h.id === '74-IV') carac.push(`Credenciamento na hipótese do art. 79, ${s.credHip}, mediante edital de chamamento público permanente.`);
  if (!carac.length) carac.push('⟦caracterização fática do enquadramento⟧');
  const docs = DOCS_HAB.map(dd => [dd.l, (f.docs || {})[dd.k] ? 'Juntado' : '⟦pendente⟧']);
  return { id: 'justificativa', titulo: 'Justificativa da Contratação Direta', sigla: 'JCD', fund: 'art. 72', blocks: [
    { t: 'title', text: `JUSTIFICATIVA DE ${h.grupo === 'Inexigibilidade' ? 'INEXIGIBILIDADE' : 'DISPENSA'} DE LICITAÇÃO`, sub: `Lei nº 14.133/2021, ${h.base}, e art. 72` },
    { t: 'kv', rows: [['Processo', numProc(p, a, cfg)], ['Objeto', ph(p.objeto.resumo, 'objeto')], ['Fundamento', `${h.base} da Lei nº 14.133/2021`], ['Valor', fmtBRL(a.est)]] },
    { t: 'h', text: '1. Enquadramento' }, ...carac.map(c => ({ t: 'p', text: c })),
    ...(has(p.enquadramento.justDivergencia) ? [{ t: 'p', text: p.enquadramento.justDivergencia }] : []),
    { t: 'h', text: '2. Razão da escolha do contratado (art. 72, VI)' },
    { t: 'p', text: `${ph(f.razao, 'razão social')}, CNPJ ${ph(f.cnpj, 'CNPJ')}. ${ph(f.razaoEscolha, 'motivo objetivo da escolha deste fornecedor')}` },
    { t: 'h', text: '3. Justificativa do preço (art. 72, VII)' },
    { t: 'p', text: has(f.justPreco) ? f.justPreco : `O preço contratado é compatível com o praticado no mercado, conforme relatório de pesquisa de preços anexo (art. 23${a.escolhida.grupo === 'Inexigibilidade' ? ', §4º' : ''}).` },
    { t: 'h', text: '4. Habilitação (art. 72, V)' },
    { t: 'table', cols: [{ h: 'Documento', w: 9 }, { h: 'Situação', w: 3 }], rows: docs },
    { t: 'h', text: '5. Requisitos da hipótese' }, ...h.requisitos.map(r => ({ t: 'li', text: r })),
    { t: 'h', text: '6. Conclusão' },
    { t: 'p', text: `Presentes os requisitos legais, submete-se a contratação direta à análise jurídica (art. 53) e à autorização da autoridade competente (art. 72, VIII).` },
    { t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.agente.nome, 'nome do agente de contratação'), cargo: cfg.agente.cargo },
    { t: 'sig', nome: ph(p.demanda.responsavel, 'nome do responsável'), cargo: ph(p.demanda.cargo, 'cargo') }
  ] };
}
const DOCS_HAB = [
  { k: 'cnpj', l: 'Inscrição no CNPJ e ato constitutivo (art. 66)' },
  { k: 'federal', l: 'Certidão conjunta de débitos federais e Dívida Ativa da União' },
  { k: 'fgts', l: 'Certificado de regularidade do FGTS' },
  { k: 'cndt', l: 'Certidão negativa de débitos trabalhistas' },
  { k: 'estadual', l: 'Regularidade com a Fazenda estadual' },
  { k: 'municipal', l: 'Regularidade com a Fazenda municipal' },
  { k: 'menor', l: 'Declaração de cumprimento do art. 7º, XXXIII, da Constituição' },
  { k: 'impedimento', l: 'Consulta ao CEIS, CNEP e cadastro de apenados do TCESP' }
];

function docAviso(p, cfg, a) {
  return { id: 'aviso', titulo: 'Aviso de Contratação Direta', sigla: 'AV', fund: 'art. 75, §3º', blocks: [
    { t: 'title', text: 'AVISO DE CONTRATAÇÃO DIRETA', sub: `Dispensa de licitação — ${a.escolhida.base} e §3º da Lei nº 14.133/2021` },
    { t: 'p', text: `O ${cfg.ente} torna pública a intenção de contratar, por dispensa de licitação em razão do valor, o objeto abaixo, e convida eventuais interessados a apresentar propostas adicionais.` },
    { t: 'kv', rows: [['Processo', numProc(p, a, cfg)], ['Objeto', ph(p.objeto.resumo, 'objeto')], ['Critério', 'Menor preço ' + ({ itens: 'por item', lotes: 'por lote', global: 'global' })[p.objeto.parcelamento]], ['Prazo para propostas', 'Mínimo de 3 (três) dias úteis a contar da publicação: até ⟦data e hora⟧'], ['Envio das propostas', ph(cfg.plataforma, 'plataforma eletrônica ou endereço eletrônico')]] },
    itensTabela(p, false),
    { t: 'p', text: 'A proposta deverá conter a descrição do objeto, o preço unitário e total, o prazo de validade e os dados do proponente. O vencedor deverá apresentar os documentos de habilitação indicados no termo de referência.' },
    { t: 'p', text: `O termo de referência está disponível em ${ph(cfg.site, 'sítio eletrônico oficial')}.` },
    { t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.agente.nome, 'nome do agente de contratação'), cargo: cfg.agente.cargo }
  ] };
}

function docAutorizacao(p, cfg, a) {
  const f = p.fornecedor, h = a.escolhida;
  if (!a.direta) return { id: 'autorizacao', titulo: 'Autorização de Abertura', sigla: 'AUT', fund: 'art. 18 e art. 53', blocks: [
    { t: 'title', text: 'AUTORIZAÇÃO PARA ABERTURA DE LICITAÇÃO', sub: 'Lei nº 14.133/2021' },
    { t: 'p', text: `Considerando a demanda formalizada, o estudo técnico preliminar, o termo de referência, a pesquisa de preços, a reserva orçamentária e o parecer jurídico constantes do Processo Administrativo nº ${numProc(p, a, cfg)}, **AUTORIZO** a abertura de licitação na modalidade ${h ? h.titulo.toLowerCase() : '⟦modalidade⟧'}, critério de julgamento ${criterioPadrao(p, h, a.est, cfg)}, para ${ph(p.objeto.resumo, 'objeto')}, com valor estimado de ${fmtBRL(a.est)}.` },
    { t: 'p', text: `Designo como ${h && h.id === 'PREGAO' ? 'pregoeiro(a)' : 'agente de contratação'} ${ph(h && h.id === 'PREGAO' ? cfg.pregoeiro.nome : cfg.agente.nome, 'nome')}, nos termos do art. 8º.` },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.autoridade.nome, 'nome da autoridade competente'), cargo: cfg.autoridade.cargo }
  ] };
  return { id: 'autorizacao', titulo: 'Autorização e Extrato', sigla: 'AUT', fund: 'art. 72, VIII, e parágrafo único', blocks: [
    { t: 'title', text: 'TERMO DE AUTORIZAÇÃO DE CONTRATAÇÃO DIRETA', sub: 'Lei nº 14.133/2021, art. 72, VIII' },
    { t: 'p', text: `Considerando a instrução do Processo Administrativo nº ${numProc(p, a, cfg)}, a justificativa de ${h.grupo.toLowerCase()} e o parecer jurídico, **AUTORIZO** a contratação direta de ${ph(f.razao, 'razão social')}, CNPJ ${ph(f.cnpj, 'CNPJ')}, para ${ph(p.objeto.resumo, 'objeto')}, no valor de ${fmtBRL(a.est)}, com fundamento no ${h.base} da Lei nº 14.133/2021.` },
    { t: 'p', text: 'Determino a divulgação deste ato em sítio eletrônico oficial (art. 72, parágrafo único) e no Portal Nacional de Contratações Públicas (art. 94), como condição de eficácia.' },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.autoridade.nome, 'nome da autoridade competente'), cargo: cfg.autoridade.cargo },
    { t: 'h', text: 'EXTRATO PARA PUBLICAÇÃO' },
    { t: 'p', text: `${cfg.ente.toUpperCase()}. Processo nº ${ph(p.numero, 'nº')}. ${h.grupo.toUpperCase()} DE LICITAÇÃO, ${h.base} da Lei nº 14.133/2021. Contratado: ${ph(f.razao, 'razão social')}, CNPJ ${ph(f.cnpj, 'CNPJ')}. Objeto: ${ph(p.objeto.resumo, 'objeto')}. Valor: ${fmtBRL(a.est)}. Dotação: ${ph(p.orcamento.ficha, 'ficha')}. Autorização: ${ph(cfg.autoridade.nome, 'autoridade')}, ${cfg.autoridade.cargo}.` }
  ] };
}

function docJuridico(p, cfg, a, pecas) {
  return { id: 'juridico', titulo: 'Encaminhamento à Assessoria Jurídica', sigla: 'EJ', fund: 'art. 53', blocks: [
    { t: 'title', text: 'ENCAMINHAMENTO PARA ANÁLISE JURÍDICA', sub: 'Lei nº 14.133/2021, art. 53' },
    { t: 'p', text: `À ${cfg.juridico.cargo}. Encaminho o Processo Administrativo nº ${numProc(p, a, cfg)}, referente a ${ph(p.objeto.resumo, 'objeto')}, para controle prévio de legalidade, nos termos do art. 53 da Lei nº 14.133/2021. Enquadramento proposto: ${hipTexto(a)}.` },
    { t: 'p', text: 'Peças juntadas:' },
    ...pecas.filter(x => x.id !== 'juridico' && x.id !== 'autorizacao').map(x => ({ t: 'li', text: `${x.titulo} (${x.fund})` })),
    { t: 'p', text: 'Solicita-se manifestação sobre a regularidade da instrução, o enquadramento legal e as minutas.' },
    { t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.agente.nome, 'nome do agente de contratação'), cargo: cfg.agente.cargo }
  ] };
}

function docEdital(p, cfg, a) {
  const h = a.escolhida, d = p.disputa, crit = criterioPadrao(p, h, a.est, cfg);
  const mod = h.titulo.toUpperCase(), srp = p.situacao.srp;
  const ex = exclusivosME(p, cfg), unid = ex.tipo === 'lotes' ? 'lotes' : 'itens';
  const exclTxt = d.exclusivaME === 'nao'
    ? `Não se aplica a participação exclusiva de ME/EPP: ${ph(d.justNaoExclusiva, 'justificativa com base no art. 49 da LC nº 123/2006')}.`
    : !ex.lista.length ? `Não há ${unid} de participação exclusiva de ME/EPP.`
    : ex.tipo === 'global' ? 'A licitação destina-se à participação exclusiva de microempresas e empresas de pequeno porte (LC nº 123/2006, art. 48, I).'
    : `Os ${unid} ${ex.lista.join(', ')} destinam-se à participação exclusiva de microempresas e empresas de pequeno porte (LC nº 123/2006, art. 48, I).`;
  const B = [
    { t: 'title', text: `EDITAL DE ${mod} ELETRÔNICO Nº ⟦nº/ano⟧`, sub: `Processo Administrativo nº ${numProc(p, a, cfg)}${srp ? ' — Registro de Preços' : ''}` },
    { t: 'note', text: 'MINUTA gerada a partir dos dados do processo. Sujeita à revisão da assessoria jurídica (art. 53).' },
    { t: 'p', text: `O ${cfg.ente}, por intermédio do(a) ${ph(p.demanda.secretaria, 'secretaria')}, torna público que realizará licitação na modalidade **${h.titulo.toLowerCase()}**, forma eletrônica, critério de julgamento **${crit}**, ${({ itens: 'por item', lotes: 'por lote', global: 'global' })[p.objeto.parcelamento]}, modo de disputa ${d.modo === 'aberto_fechado' ? 'aberto e fechado' : d.modo === 'fechado_aberto' ? 'fechado e aberto' : 'aberto'}${srp ? ', para registro de preços' : ''}, regida pela Lei nº 14.133/2021, pela Lei Complementar nº 123/2006, pelos ${regTexto(cfg)} e pelas condições deste edital.` },
    { t: 'kv', rows: [['Sessão pública', `${fmtData(d.dataSessao) || '⟦data⟧'} às ⟦hora⟧ (horário de Brasília)`], ['Plataforma', ph(cfg.plataforma, 'plataforma eletrônica')], ['Valor estimado', fmtBRL(a.est)], ['Prazo mínimo de publicação', a.prazoEdital || '⟦prazo⟧']] },
    { t: 'h', text: '1. DO OBJETO' },
    { t: 'p', text: `1.1. ${ph(p.objeto.resumo, 'objeto')}, conforme especificações do Termo de Referência (Anexo I).` },
    ...(textoJulgamento(p) ? [{ t: 'p', text: '1.2. ' + textoJulgamento(p) }] : []),
    itensTabela(p, false),
    { t: 'h', text: '2. DA PARTICIPAÇÃO' },
    { t: 'p', text: `2.1. Podem participar os interessados cujo ramo de atividade seja compatível com o objeto e que estejam credenciados na plataforma ${ph(cfg.plataforma, 'plataforma')}.` },
    { t: 'p', text: '2.2. Não podem participar as pessoas físicas e jurídicas enquadradas no art. 14 da Lei nº 14.133/2021, nem as declaradas inidôneas ou impedidas de licitar com o Município.' },
    { t: 'p', text: `2.3. ${exclTxt}` },
    { t: 'p', text: `2.4. ${d.consorcio ? 'É admitida a participação de consórcios, nos termos do art. 15.' : 'Não é admitida a participação de consórcios, dada a natureza e a dimensão do objeto. ⟦justificar⟧'}` },
    { t: 'h', text: '3. DA PROPOSTA' },
    { t: 'p', text: '3.1. Os licitantes encaminharão, exclusivamente pela plataforma, proposta com descrição do objeto, preço unitário e total, até a data e o horário de abertura da sessão.' },
    { t: 'p', text: '3.2. A proposta terá validade mínima de 60 (sessenta) dias e incluirá todos os custos diretos e indiretos, tributos, encargos trabalhistas, previdenciários e comerciais (art. 63, §1º).' },
    { t: 'p', text: '3.3. O licitante declarará, na plataforma, que cumpre os requisitos de habilitação, as cotas de pessoas com deficiência e de reabilitados (art. 63, IV) e o art. 7º, XXXIII, da Constituição, e que sua proposta observa os direitos trabalhistas.' },
    { t: 'h', text: '4. DA ABERTURA E DA DISPUTA' },
    { t: 'p', text: `4.1. Na data e no horário marcados, será aberta a sessão pública, com disputa no modo ${d.modo === 'aberto_fechado' ? 'aberto e fechado' : d.modo === 'fechado_aberto' ? 'fechado e aberto' : 'aberto'} (art. 56).${has(d.intervalo) ? ' Intervalo mínimo de diferença entre lances: ' + d.intervalo + '.' : ''}` },
    { t: 'p', text: '4.2. Em caso de empate, aplicam-se os arts. 44 e 45 da LC nº 123/2006 e, depois, os critérios do art. 60 da Lei nº 14.133/2021.' },
    { t: 'h', text: '5. DO JULGAMENTO' },
    { t: 'p', text: '5.1. Encerrada a disputa, o agente verificará a aceitabilidade da proposta mais bem classificada e poderá negociar condições mais vantajosas (art. 61).' },
    { t: 'p', text: '5.2. Será desclassificada a proposta com preço inexequível ou acima do orçamento estimado, depois de oportunizada a demonstração da exequibilidade (art. 59).' },
    { t: 'h', text: '6. DA HABILITAÇÃO' },
    { t: 'p', text: '6.1. Será exigida, apenas do licitante vencedor (art. 63, II), a documentação de habilitação jurídica (art. 66) e de regularidade fiscal, social e trabalhista (art. 68).' },
    { t: 'p', text: `6.2. Qualificação técnica (art. 67): ${has(d.habTecnica) ? d.habTecnica : 'não exigida, por se tratar de objeto de baixa complexidade. ⟦confirmar⟧'}` },
    { t: 'p', text: `6.3. Qualificação econômico-financeira (art. 69): ${has(d.habEconomica) ? d.habEconomica : 'não exigida. ⟦confirmar⟧'}` },
    ...((d.vistoria || 'nao') !== 'nao' ? [{ t: 'p', text: d.vistoria === 'obrigatoria' ? '6.4. A vistoria prévia é obrigatória, conforme o Termo de Referência (art. 63, §2º).' : '6.4. A vistoria prévia é facultativa e pode ser substituída por declaração de pleno conhecimento das condições do local (art. 63, §§ 2º e 3º).' }] : []),
    { t: 'h', text: '7. DA IMPUGNAÇÃO E DOS ESCLARECIMENTOS' },
    { t: 'p', text: '7.1. Qualquer pessoa pode impugnar este edital ou pedir esclarecimentos até 3 (três) dias úteis antes da abertura da sessão. A resposta será divulgada em até 3 (três) dias úteis, limitada ao último dia útil anterior à abertura (art. 164).' },
    { t: 'h', text: '8. DOS RECURSOS' },
    { t: 'p', text: '8.1. A intenção de recorrer deverá ser manifestada imediatamente após a decisão, sob pena de preclusão, com prazo de 3 (três) dias úteis para as razões e igual prazo para as contrarrazões (art. 165).' },
    { t: 'h', text: '9. DA ADJUDICAÇÃO E DA HOMOLOGAÇÃO' },
    { t: 'p', text: '9.1. Encerradas as fases de julgamento e habilitação e decididos os recursos, o processo seguirá à autoridade superior para adjudicação e homologação (art. 71).' },
    { t: 'h', text: srp ? '10. DA ATA DE REGISTRO DE PREÇOS' : '10. DA CONTRATAÇÃO' },
    { t: 'p', text: srp
      ? `10.1. O vencedor será convocado para assinar a ata em até ⟦5⟧ dias úteis. A ata terá vigência de 1 (um) ano, prorrogável por igual período se comprovada a vantajosidade (art. 84). ${p.disputa.adesao ? 'Admite-se a adesão por órgãos não participantes, nos limites do art. 86.' : 'Não se admite adesão por órgãos não participantes.'}`
      : `10.1. O vencedor será convocado para assinar o ${a.instrumento.tipo === 'contrato' ? 'termo de contrato' : 'instrumento equivalente'} em até ⟦5⟧ dias úteis, prorrogável uma vez por igual período (art. 90).${num(p.execucao.garantiaContratual) ? ` Será exigida garantia de ${p.execucao.garantiaContratual}% do valor do contrato (art. 96).` : ''}` },
    { t: 'h', text: '11. DAS SANÇÕES' },
    { t: 'p', text: '11.1. As infrações previstas no art. 155 sujeitam o responsável às sanções do art. 156 (advertência, multa, impedimento de licitar e contratar e declaração de inidoneidade), observados os arts. 157 a 163.' },
    { t: 'h', text: '12. DISPOSIÇÕES GERAIS' },
    { t: 'p', text: `12.1. O edital e seus anexos estão disponíveis em ${ph(cfg.site, 'sítio eletrônico oficial')}, no Portal Nacional de Contratações Públicas e na plataforma ${ph(cfg.plataforma, 'plataforma')}.` },
    { t: 'p', text: `12.2. Fica eleito o foro da Comarca de ${ph(cfg.comarca, 'comarca')} (art. 92, §1º).` },
    { t: 'p', text: 'Anexos: I — Termo de Referência; II — Modelo de proposta; III — ' + (srp ? 'Minuta da ata de registro de preços' : 'Minuta de contrato') + '; IV — Modelos de declarações.' },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.autoridade.nome, 'nome da autoridade competente'), cargo: cfg.autoridade.cargo }
  ];
  return { id: 'edital', titulo: 'Minuta de Edital', sigla: 'ED', fund: 'art. 25', blocks: B };
}

function docContrato(p, cfg, a) {
  const e = p.execucao, f = p.fornecedor, o = p.objeto;
  const cl = (n, t, txt) => [{ t: 'h', text: `CLÁUSULA ${n} — ${t}` }, ...(Array.isArray(txt) ? txt : [txt]).map(x => ({ t: 'p', text: x }))];
  const vig = o.continuo
    ? `O contrato vigerá por ${ph(e.vigenciaTexto || (o.vigenciaMeses ? o.vigenciaMeses + ' meses' : ''), 'vigência')} a partir da assinatura, prorrogável até 10 anos nos termos dos arts. 106 e 107.`
    : `O contrato vigerá por ${ph(e.vigenciaTexto, 'prazo de vigência')} a partir da assinatura. Prazo de execução: ${ph(e.prazo, 'prazo de execução')}.`;
  return { id: 'contrato', titulo: 'Minuta de Contrato', sigla: 'CT', fund: 'art. 92', blocks: [
    { t: 'title', text: 'MINUTA DE CONTRATO Nº ⟦nº/ano⟧', sub: `Processo Administrativo nº ${numProc(p, a, cfg)}` },
    { t: 'note', text: 'MINUTA sujeita à revisão da assessoria jurídica (art. 53).' },
    { t: 'p', text: `O **${cfg.ente.toUpperCase()}**, CNPJ ${ph(cfg.cnpj, 'CNPJ do Município')}, com sede em ${ph(cfg.endereco, 'endereço')}, neste ato representado por ${ph(cfg.autoridade.nome, 'autoridade')}, ${cfg.autoridade.cargo}, doravante CONTRATANTE, e **${ph(f.razao, 'razão social do contratado')}**, CNPJ ${ph(f.cnpj, 'CNPJ')}, com sede em ${ph(f.endereco, 'endereço do contratado')}, representada por ${ph(f.representante, 'representante legal')}, doravante CONTRATADA, ajustam o presente contrato, decorrente de ${a.direta ? (a.escolhida.grupo.toLowerCase() + ' de licitação, ' + a.escolhida.base) : ('licitação na modalidade ' + a.escolhida.titulo.toLowerCase())} da Lei nº 14.133/2021, mediante as cláusulas seguintes.` },
    ...cl('PRIMEIRA', 'DO OBJETO', [`${ph(o.resumo, 'objeto')}, conforme termo de referência e proposta da CONTRATADA, que integram este contrato independentemente de transcrição (art. 92, II).`,
      ...(o.parcelamento !== 'global' && p.itens.length > 1 ? [`Este contrato abrange somente os ${o.parcelamento === 'lotes' ? 'lotes' : 'itens'} adjudicados à CONTRATADA. Havendo vencedores distintos, celebra-se um contrato com cada um. ⟦manter na tabela apenas os ${o.parcelamento === 'lotes' ? 'lotes' : 'itens'} desta contratada⟧`] : [])]),
    itensTabela(p, true),
    ...cl('SEGUNDA', 'DA VIGÊNCIA', vig),
    ...cl('TERCEIRA', 'DO PREÇO', `O valor total do contrato é de ${fmtBRL(a.est)}, já incluídas todas as despesas diretas e indiretas. ⟦ajustar ao valor da proposta vencedora⟧`),
    ...cl('QUARTA', 'DO PAGAMENTO', `O pagamento será efetuado em até ${num(e.pagamentoDias) || 30} dias do recebimento definitivo e do atesto da nota fiscal, condicionado à regularidade fiscal da CONTRATADA.`),
    ...cl('QUINTA', 'DO REAJUSTE', `Os preços serão reajustados após 12 meses da data do orçamento estimado (${fmtData(p.demanda.data) || '⟦data-base⟧'}), pelo índice ${ph(e.reajuste, 'índice')} (art. 92, V, e §3º).`),
    ...cl('SEXTA', 'DA DOTAÇÃO ORÇAMENTÁRIA', `As despesas correrão à conta de: ${dotacaoTexto(p.orcamento)}.`),
    ...cl('SÉTIMA', 'DA EXECUÇÃO E DO RECEBIMENTO', [`Local: ${ph(e.local, 'local')}. Prazo: ${ph(e.prazo, 'prazo')}.`, `Recebimento (art. 140): ${ph(e.recebimento, 'regras de recebimento')}`]),
    ...cl('OITAVA', 'DA GARANTIA', num(e.garantiaContratual) ? `A CONTRATADA prestará garantia de ${e.garantiaContratual}% do valor do contrato, em uma das modalidades do art. 96, §1º.` : 'Não será exigida garantia contratual.'),
    ...cl('NONA', 'DAS OBRIGAÇÕES DA CONTRATANTE', has(e.obrigContratante) ? e.obrigContratante : 'Prestar as informações necessárias; acompanhar e fiscalizar a execução; efetuar o pagamento no prazo; notificar a CONTRATADA de falhas encontradas.'),
    ...cl('DÉCIMA', 'DAS OBRIGAÇÕES DA CONTRATADA', has(e.obrigContratada) ? e.obrigContratada : 'Executar o objeto conforme o termo de referência; reparar ou substituir, às suas expensas, o que for recusado; manter todas as condições de habilitação durante a execução (art. 92, XVI); responder pelos encargos trabalhistas, previdenciários, fiscais e comerciais.'),
    ...cl('DÉCIMA PRIMEIRA', 'DA GESTÃO E DA FISCALIZAÇÃO', `A execução será acompanhada pelo gestor ${ph(e.gestor, 'gestor')}, pelo fiscal técnico ${ph(e.fiscal, 'fiscal')}${has(e.fiscalAdm) ? ' e pelo fiscal administrativo ' + e.fiscalAdm : ''}, nos termos do art. 117${decretoGestao(cfg) ? ' e do ' + decretoGestao(cfg) : ''}.`),
    ...cl('DÉCIMA SEGUNDA', 'DAS INFRAÇÕES E SANÇÕES', `Aplicam-se os arts. 155 a 163 da Lei nº 14.133/2021, com multa de até ${num(e.multa) || 10}% do valor do contrato, assegurados o contraditório e a ampla defesa.`),
    ...cl('DÉCIMA TERCEIRA', 'DA EXTINÇÃO', 'O contrato poderá ser extinto nas hipóteses dos arts. 137 a 139, com as consequências do art. 139.'),
    ...cl('DÉCIMA QUARTA', 'DAS ALTERAÇÕES', 'O contrato poderá ser alterado nos casos do art. 124, observados os limites do art. 125.'),
    ...cl('DÉCIMA QUINTA', 'DA PROTEÇÃO DE DADOS', 'As partes tratarão os dados pessoais acessados em razão deste contrato conforme a Lei nº 13.709/2018, apenas para as finalidades nele previstas.'),
    ...cl('DÉCIMA SEXTA', 'DA PUBLICAÇÃO', 'A CONTRATANTE divulgará este contrato no Portal Nacional de Contratações Públicas, como condição de eficácia (art. 94), e em sítio eletrônico oficial.'),
    ...cl('DÉCIMA SÉTIMA', 'DO FORO', `Fica eleito o foro da Comarca de ${ph(cfg.comarca, 'comarca')}, sede da Administração (art. 92, §1º).`),
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.autoridade.nome, 'autoridade competente'), cargo: `${cfg.autoridade.cargo} — CONTRATANTE` },
    { t: 'sig', nome: ph(f.representante, 'representante legal'), cargo: `${ph(f.razao, 'razão social')} — CONTRATADA` },
    { t: 'p', text: 'Testemunhas: 1) ______________________  2) ______________________' }
  ] };
}

function docAta(p, cfg, a) {
  const f = p.fornecedor;
  return { id: 'ata', titulo: 'Minuta de Ata de Registro de Preços', sigla: 'ARP', fund: 'arts. 82 a 86', blocks: [
    { t: 'title', text: 'MINUTA DE ATA DE REGISTRO DE PREÇOS Nº ⟦nº/ano⟧', sub: `Processo Administrativo nº ${numProc(p, a, cfg)}` },
    { t: 'note', text: 'MINUTA sujeita à revisão da assessoria jurídica (art. 53).' },
    { t: 'p', text: `O ${cfg.ente}, CNPJ ${ph(cfg.cnpj, 'CNPJ do Município')}, órgão gerenciador, registra os preços de ${ph(f.razao || '', 'fornecedor registrado')}, CNPJ ${ph(f.cnpj, 'CNPJ')}, para ${ph(p.objeto.resumo, 'objeto')}, conforme as condições abaixo e o edital ⟦nº⟧.` },
    { t: 'h', text: '1. Preços registrados' },
    ...(p.objeto.parcelamento !== 'global' && p.itens.length > 1 ? [{ t: 'p', text: `Esta ata registra somente os ${p.objeto.parcelamento === 'lotes' ? 'lotes' : 'itens'} adjudicados a este fornecedor; havendo vencedores distintos, lavra-se uma ata para cada um. ⟦manter na tabela apenas os ${p.objeto.parcelamento === 'lotes' ? 'lotes' : 'itens'} deste fornecedor⟧` }] : []),
    itensTabela(p, true),
    { t: 'h', text: '2. Vigência' }, { t: 'p', text: 'A ata terá vigência de 1 (um) ano, contado da divulgação no PNCP, prorrogável por igual período, desde que comprovado que o preço é vantajoso (art. 84).' },
    { t: 'h', text: '3. Ausência de obrigação de contratar' }, { t: 'p', text: 'A existência de preços registrados não obriga a Administração a contratar, podendo realizar contratação específica, assegurada preferência ao fornecedor registrado em igualdade de condições (art. 83).' },
    { t: 'h', text: '4. Contratações decorrentes' }, { t: 'p', text: 'As contratações serão formalizadas por termo de contrato ou instrumento substitutivo (art. 95), conforme as necessidades da Administração.' },
    { t: 'h', text: '5. Adesão' }, { t: 'p', text: p.disputa.adesao ? 'Admite-se adesão por órgãos e entidades não participantes, nos limites e condições do art. 86, §§ 2º a 5º.' : 'Não se admite adesão por órgãos e entidades não participantes.' },
    { t: 'h', text: '6. Cancelamento' }, { t: 'p', text: `O registro poderá ser cancelado quando o fornecedor descumprir as condições da ata, não assinar o contrato no prazo, ou sofrer sanção que o impeça de contratar, observado o ${cfg.regulamento === 'federal' ? 'Decreto federal nº 11.462/2023' : 'regulamento municipal'}.` },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'sig', nome: ph(cfg.autoridade.nome, 'autoridade competente'), cargo: cfg.autoridade.cargo },
    { t: 'sig', nome: ph(f.representante, 'representante legal'), cargo: `${ph(f.razao, 'razão social')} — fornecedor registrado` }
  ] };
}

function docTCN(p, cfg, a) {
  const f = p.fornecedor;
  return { id: 'tcn', titulo: 'Termo de Ciência e de Notificação (TCESP)', sigla: 'TCN', fund: 'Instruções do TCESP', blocks: [
    { t: 'title', text: 'TERMO DE CIÊNCIA E DE NOTIFICAÇÃO', sub: 'Tribunal de Contas do Estado de São Paulo — contratos' },
    { t: 'note', text: 'Estrutura de referência. Antes de assinar, confira com o modelo das Instruções vigentes do TCESP.' },
    { t: 'kv', rows: [['Contratante', cfg.nome], ['Contratada', ph(f.razao, 'razão social')], ['Contrato nº', '⟦nº/ano⟧'], ['Objeto', ph(p.objeto.resumo, 'objeto')], ['Advogado(s) / OAB', '⟦se houver⟧']] },
    { t: 'p', text: 'Pelo presente termo, nós, abaixo identificados:' },
    { t: 'h', text: '1. Estamos CIENTES de que:' },
    { t: 'li', text: 'a) o ajuste, seus aditamentos e o acompanhamento de sua execução estarão sujeitos a análise e julgamento pelo Tribunal de Contas do Estado de São Paulo, com tramitação pelo sistema eletrônico;' },
    { t: 'li', text: 'b) poderemos ter acesso ao processo, com vista e extração de cópias, na forma do Regimento Interno;' },
    { t: 'li', text: 'c) os despachos e decisões serão publicados no Diário Oficial do Estado, caderno do Tribunal de Contas, conforme a Lei Complementar estadual nº 709/1993, iniciando-se a partir de então a contagem dos prazos processuais;' },
    { t: 'li', text: 'd) é de exclusiva responsabilidade de cada signatário manter seus dados atualizados no cadastro do Tribunal.' },
    { t: 'h', text: '2. Damo-nos por NOTIFICADOS para:' },
    { t: 'li', text: 'a) acompanhar todos os atos do processo até o julgamento final e a respectiva publicação;' },
    { t: 'li', text: 'b) se for o caso e de nosso interesse, exercer o direito de defesa, interpor recursos e o que mais couber, nos prazos legais e regimentais.' },
    { t: 'p', text: `${cfg.cidade}, ____ de ______________ de ${cfg.valores.ano}.`, align: 'right' },
    { t: 'table', cols: [{ h: 'Responsável', w: 4 }, { h: 'Nome / cargo / CPF', w: 6 }, { h: 'Assinatura', w: 3 }], rows: [
      ['Autoridade que ' + (a.direta ? 'ratificou' : 'homologou'), `${ph(cfg.autoridade.nome, 'nome')} — ${cfg.autoridade.cargo} — CPF ⟦CPF⟧`, ''],
      ['Signatário pelo contratante', `${ph(cfg.autoridade.nome, 'nome')} — CPF ⟦CPF⟧`, ''],
      ['Ordenador de despesa', '⟦nome, cargo e CPF⟧', ''],
      ['Signatário pela contratada', `${ph(f.representante, 'representante')} — CPF ⟦CPF⟧`, '']
    ] }
  ] };
}

function docPedido(p, cfg, a) {
  const ped = p.pedido || {}, lista = (ped.fornecedores || []).length ? ped.fornecedores : [{ nome: '' }];
  const blocks = [];
  lista.forEach((f, i) => {
    if (i) blocks.push({ t: 'pb' });
    blocks.push(
      { t: 'title', text: 'SOLICITAÇÃO DE ORÇAMENTO', sub: 'Pesquisa de preços — Lei nº 14.133/2021, art. 23, §1º, IV' },
      { t: 'kv', rows: [['À empresa', has(f.nome) ? f.nome.trim() : '______________________________________'], ...(has(f.contato) ? [['Contato', f.contato.trim()]] : []), ['Objeto', ph(p.objeto.resumo, 'objeto')]] },
      { t: 'p', text: `O(A) ${ph(p.demanda.secretaria, 'secretaria')} da ${cfg.nome} solicita orçamento para ${ph(p.objeto.resumo, 'objeto')}, conforme a relação abaixo. O pedido destina-se à estimativa de preços e não gera compromisso de contratação.` },
      itensTabela(p, true, true),
      ...(p.objeto.parcelamento === 'lotes' ? [{ t: 'p', text: 'Os itens estão agrupados em lotes. Pode ser cotado um ou mais lotes, desde que o orçamento inclua todos os itens de cada lote cotado.' }] : []),
      { t: 'p', text: 'O orçamento deverá informar: razão social, CNPJ, endereço, telefone e e-mail; preço unitário e total de cada item, já incluídos tributos, frete e demais custos; prazo de validade da proposta, de no mínimo 60 (sessenta) dias; prazo de entrega ou execução; data e assinatura do responsável.' },
      { t: 'p', text: `Local de entrega ou execução: ${ph(p.execucao.local, 'local de entrega ou execução')}. Prazo desejado: ${ph(p.execucao.prazo, 'prazo de entrega ou execução')}.` },
      { t: 'p', text: `Pede-se o envio do orçamento ${ped.prazoResposta ? 'até ' + fmtData(ped.prazoResposta) : 'no prazo de 5 (cinco) dias úteis do recebimento desta solicitação'}, para ${has(ped.contato) ? ped.contato.trim() : (has(cfg.email) ? cfg.email : '⟦e-mail para resposta⟧')}.` },
      { t: 'p', text: `${cfg.cidade}, ${dataExtenso(p.demanda.data)}.`, align: 'right' },
      { t: 'sig', nome: ph(p.demanda.responsavel, 'nome do responsável'), cargo: `${ph(p.demanda.cargo, 'cargo')} — ${ph(p.demanda.secretaria, 'secretaria')}` }
    );
  });
  return { id: 'pedido', titulo: 'Pedido de Orçamento', sigla: 'PO', fund: 'art. 23, §1º, IV', blocks };
}

/* ---------- Lista de peças por cenário ---------- */
function montarPecas(p0, cfg, opts = {}) {
  syncOrcs(p0);
  const p = REV.procCorrigido ? REV.procCorrigido(p0) : p0;
  const a = analisar(p, cfg);
  if (opts.simples) {
    a.simples = true;
    const L = [docETP(p, cfg, a), docTR(p, cfg, a), docPrecos(p, cfg, a), docPedido(p, cfg, a), docDesignacao(p, cfg, a)];
    L.forEach(d => { d.pendencias = contarPend(d.blocks); });
    return { a, pecas: L };
  }
  const L = [docDFD(p, cfg, a), docETP(p, cfg, a), docRiscos(p, cfg, a), docTR(p, cfg, a), docPrecos(p, cfg, a), docOrcamento(p, cfg, a)];
  if (a.escolhida) {
    if (a.direta) {
      L.push(docJustDireta(p, cfg, a));
      if (['75-I', '75-II'].includes(a.escolhida.id)) L.push(docAviso(p, cfg, a));
    } else L.push(docEdital(p, cfg, a));
    if (a.instrumento.tipo === 'ata') L.push(docAta(p, cfg, a));
    else if (a.instrumento.tipo === 'contrato') L.push(docContrato(p, cfg, a));
    L.push(docDesignacao(p, cfg, a));
    if ((cfg.uf || '').toUpperCase() === 'SP' && a.instrumento.tipo !== 'substitutivo') L.push(docTCN(p, cfg, a));
    L.push(docAutorizacao(p, cfg, a));
  }
  L.splice(L.findIndex(x => x.id === 'autorizacao') >= 0 ? L.findIndex(x => x.id === 'autorizacao') : L.length, 0, docJuridico(p, cfg, a, L));
  L.forEach(d => { d.pendencias = contarPend(d.blocks); });
  return { a, pecas: L };
}

function contarPend(blocks) {
  let n = 0;
  const conta = s => { const m = String(s || '').match(/⟦/g); n += m ? m.length : 0; };
  blocks.forEach(b => {
    ['text', 'sub', 'nome', 'cargo'].forEach(k => conta(b[k]));
    (b.rows || []).forEach(r => r.forEach(conta));
  });
  return n;
}

function textoParaSegmentos(s) {
  const out = [];
  String(s == null ? '' : s).split(/(\*\*[^*]+\*\*|⟦[^⟧]*⟧)/g).forEach(seg => {
    if (!seg) return;
    if (seg.startsWith('**') && seg.endsWith('**')) out.push({ t: seg.slice(2, -2), b: true });
    else if (seg.startsWith('⟦')) out.push({ t: '[' + seg.slice(1, -1).toUpperCase() + ']', ph: true });
    else out.push({ t: seg });
  });
  return out;
}

/* ---------- Conversão para .docx (requer a biblioteca docx) ---------- */
function b64ToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = (typeof atob === 'function') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}

function paraDocx(D, pecas, p, cfg, opts = {}) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, Header, Footer, PageNumber, ImageRun, PageOrientation, VerticalAlign, PageBreak,
    UnderlineType, HorizontalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionRelativeFrom, VerticalPositionAlign, TextWrappingType } = D;
  const FONT = 'Arial';
  const runs = (s, o = {}) => textoParaSegmentos(s).map(g => new TextRun({ text: g.t, bold: !!(g.b || o.bold), italics: !!o.italics, size: o.size || 24, font: FONT, highlight: g.ph ? 'yellow' : undefined, allCaps: !!o.caps, underline: o.under ? {} : undefined }));
  const P = (s, o = {}) => new Paragraph({ children: [...(o.pre || []), ...runs(s, o)], alignment: o.align === 'right' ? AlignmentType.RIGHT : o.align === 'center' ? AlignmentType.CENTER : o.align === 'left' ? AlignmentType.LEFT : AlignmentType.JUSTIFIED, spacing: { before: o.before || 0, after: o.after == null ? 120 : o.after, line: 276 }, indent: o.indent ? { left: o.indent, hanging: o.hanging || 0 } : undefined, keepNext: !!o.keepNext, shading: o.shade ? { fill: o.shade, type: ShadingType.CLEAR, color: 'auto' } : undefined, border: o.box ? { top: o.box, bottom: o.box, left: o.box, right: o.box } : undefined });
  const border = { style: BorderStyle.SINGLE, size: 4, color: '8A9AA0' };
  const borders = { top: border, bottom: border, left: border, right: border };

  function tabela(cols, rows, foot, small, larg, semCab) {
    const tot = cols.reduce((x, c) => x + c.w, 0);
    const ws = cols.map(c => Math.floor(larg * c.w / tot));
    ws[ws.length - 1] += larg - ws.reduce((x, y) => x + y, 0);
    const sz = small ? 16 : 20;
    const cel = (txt, i, o = {}) => new TableCell({ width: { size: ws[i], type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, shading: o.head ? { fill: 'E4ECEE', type: ShadingType.CLEAR, color: 'auto' } : undefined, margins: { top: 50, bottom: 50, left: 90, right: 90 }, children: [P(txt, { size: sz, bold: o.head, align: 'left', after: 0 })] });
    const trs = semCab ? [] : [new TableRow({ tableHeader: true, children: cols.map((c, i) => cel(c.h, i, { head: true })) })];
    rows.forEach(r => trs.push(new TableRow({ cantSplit: true, children: r.map((x, i) => cel(x, i, { head: semCab && i === 0 })) })));
    if (foot) trs.push(new TableRow({ children: foot.map((x, i) => cel(x, i)) }));
    return new Table({ width: { size: larg, type: WidthType.DXA }, columnWidths: ws, rows: trs });
  }

  function corpo(doc) {
    const larg = doc.landscape ? 16838 - 1134 * 2 : 11906 - 1588 - 1134;
    const caixa = { style: BorderStyle.SINGLE, size: 6, color: '404040', space: 2 };
    const out = [];
    doc.blocks.forEach(b => {
      switch (b.t) {
        case 'title':
          out.push(P(b.text, { bold: true, align: 'center', size: 24, under: b.under, after: b.sub ? 40 : 240 }));
          if (b.sub) out.push(P(b.sub, { align: 'center', size: 18, italics: true, after: 240 }));
          break;
        case 'sec': out.push(P(b.text, { bold: true, align: 'left', size: 22, before: 160, after: 140, keepNext: true, shade: 'D9D9D9', box: caixa })); break;
        case 'sub': out.push(P(b.text, { bold: true, align: 'left', before: 80, after: 80, keepNext: true })); break;
        case 'cl': out.push(P(b.text, { pre: [new TextRun({ text: b.num + ' ', font: FONT, size: 24, bold: false })], indent: b.nivel === 2 ? 567 : undefined })); break;
        case 'bul': out.push(P(b.text, { pre: [new TextRun({ text: '●\t', font: FONT, size: 18 })], indent: b.nivel === 2 ? 1134 : 709, hanging: 283, after: 60 })); break;
        case 'h': out.push(P(b.text, { bold: true, before: 200, after: 100, keepNext: true })); break;
        case 'p': out.push(P(b.text, { align: b.align })); break;
        case 'li': out.push(P(b.text, { indent: 567, hanging: 0 })); break;
        case 'note': out.push(P(b.text, { italics: true, size: 18, align: 'left' })); break;
        case 'kv': out.push(tabela([{ h: 'Campo', w: 3 }, { h: 'Informação', w: 9 }], b.rows, null, false, larg, true)); out.push(P('', { after: 120 })); break;
        case 'table': out.push(tabela(b.cols, b.rows, b.foot, b.small, larg)); out.push(P('', { after: 120 })); break;
        case 'pb': out.push(new Paragraph({ children: [new PageBreak()] })); break;
        case 'sig':
          out.push(P('', { after: 360 }));
          out.push(P('______________________________________', { align: 'center', after: 0 }));
          out.push(P(b.nome, { align: 'center', bold: true, caps: !!b.caps, after: b.cargo ? 0 : 200 }));
          if (b.cargo) out.push(P(b.cargo, { align: 'center', size: 22, after: 200 }));
          break;
      }
    });
    return out;
  }

  const AZUL = '1F3864';
  const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bordasNenhuma = { top: semBorda, bottom: semBorda, left: semBorda, right: semBorda, insideHorizontal: semBorda, insideVertical: semBorda };
  const tipoImg = uri => /^data:image\/png/.test(uri) ? 'png' : 'jpg';
  const brasao = brasaoURI(cfg), prop = brasaoProp(cfg);
  const marca = cfg.marcaDagua === false ? '' : (opts.marca || (cfg.brasao === 'iacanga' ? IMG.marcaIacanga : ''));

  const cabecalho = larg => {
    const H = linhasCabecalho(cfg);
    const textos = [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: H.titulo, bold: true, size: 34, font: FONT, color: AZUL, underline: { type: UnderlineType.SINGLE, color: AZUL } })] }),
      ...H.linhas.map(l => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0, line: 228 }, children: [new TextRun({ text: l.t, bold: !!l.b, size: 17, font: FONT })] }))
    ];
    const ch = [];
    if (/^data:image\/(png|jpe?g)/.test(brasao)) {
      // brasão e texto formam um bloco centralizado na página
      const hpx = 90, wpx = Math.round(hpx * prop), wImg = 1450, wTxt = Math.min(6900, larg - wImg);
      const cel = (w, children) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: bordasNenhuma, verticalAlign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children });
      ch.push(new Table({ alignment: AlignmentType.CENTER, width: { size: wImg + wTxt, type: WidthType.DXA }, columnWidths: [wImg, wTxt], borders: bordasNenhuma, rows: [new TableRow({ children: [
        cel(wImg, [new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: tipoImg(brasao), data: b64ToBytes(brasao), transformation: { width: wpx, height: hpx } })] })]),
        cel(wTxt, textos)
      ] })] }));
    } else ch.push(...textos);
    if (marca) {
      const wm = 200, hm = Math.round(wm / prop);
      ch.push(new Paragraph({ children: [new ImageRun({ type: tipoImg(marca), data: b64ToBytes(marca), transformation: { width: wm, height: hm },
        floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
          behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } })] }));
    }
    ch.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    return new Header({ children: ch });
  };
  const rodape = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Processo nº ${p.numero || '____'} — fls. `, size: 16, font: FONT }), new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT })] })] });

  const sections = pecas.map(doc => ({
    properties: { page: doc.landscape
      ? { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134, header: 567, footer: 567 } }
      : { size: { width: 11906, height: 16838 }, margin: { top: 2126, right: 1134, bottom: 1418, left: 1588, header: 567, footer: 567 } } },
    headers: { default: cabecalho(doc.landscape ? 16838 - 1134 * 2 : 11906 - 1588 - 1134) }, footers: { default: rodape() },
    children: corpo(doc)
  }));
  return new Document({ creator: 'Licita IAC', title: pecas.length === 1 ? pecas[0].titulo : 'Processo ' + (p.numero || ''), styles: { default: { document: { run: { font: FONT, size: 24 } } } }, sections });
}

if (typeof module !== 'undefined') module.exports = { ELEMENTOS, elementoPadrao, dotacoesValidas, extenso, reaisExtenso, mascaraCPF, paragrafos, Peca, numProc, setorLic, grupoLotes, textoJulgamento, exclusivosME, cfgPadrao, normalizarCfg, linhasCabecalho, brasaoURI, procExemplo, procVazio, normalizarProc, syncOrcs, setValorOrc, valorOrc, analisar, montarPecas, paraDocx, estat, estimativa, NAT, precoUnit, totalItem };

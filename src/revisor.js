/* ===================== LICITA IAC — REVISOR DE TEXTO =====================
   Funciona sem internet: correções ortográficas seguras e avisos de texto
   genérico, com recomendação de como escrever. A revisão por IA (só no
   claude.ai) fica na interface. Funções puras, testáveis em Node.          */

/* Erros frequentes → forma correta (comparação sem diferenciar maiúsculas) */
const ERROS_COMUNS = {
  'nescessário': 'necessário', 'nescessária': 'necessária', 'nescessários': 'necessários', 'nescessárias': 'necessárias',
  'nescessario': 'necessário', 'nescessaria': 'necessária', 'nescessidade': 'necessidade', 'nescessidades': 'necessidades',
  'necesário': 'necessário', 'necesária': 'necessária', 'nessessário': 'necessário', 'nessessária': 'necessária',
  'nessecidade': 'necessidade', 'nessecidades': 'necessidades', 'necessecidade': 'necessidade',
  'concerteza': 'com certeza', 'derrepente': 'de repente', 'porisso': 'por isso', 'apartir': 'a partir', 'encima': 'em cima',
  'excessão': 'exceção', 'exeção': 'exceção', 'excessões': 'exceções', 'previlégio': 'privilégio', 'previlegio': 'privilégio',
  'beneficiente': 'beneficente', 'impecilho': 'empecilho', 'advinhar': 'adivinhar', 'metereologia': 'meteorologia',
  'reinvindicação': 'reivindicação', 'frustado': 'frustrado', 'frustada': 'frustrada', 'seje': 'seja', 'esteje': 'esteja',
  'menas': 'menos', 'atravez': 'através', 'atraves': 'através', 'poblema': 'problema', 'pobrema': 'problema',
  'mortandela': 'mortadela', 'salchicha': 'salsicha', 'bandeija': 'bandeja', 'xuxu': 'chuchu', 'cabelereiro': 'cabeleireiro',
  'asterístico': 'asterisco', 'mendingo': 'mendigo', 'iorgute': 'iogurte', 'iorgurte': 'iogurte',
  'requesito': 'requisito', 'requesitos': 'requisitos', 'disperdício': 'desperdício', 'disperdicio': 'desperdício',
  'descriminação': 'discriminação', 'auto-falante': 'alto-falante', 'autofalante': 'alto-falante',
  'licenssa': 'licença', 'licensa': 'licença', 'previnir': 'prevenir', 'imprescindivel': 'imprescindível',
  // acentos que faltam (palavras sem outra leitura possível)
  'nao': 'não', 'sao': 'são', 'entao': 'então', 'alem': 'além', 'ja': 'já', 'ate': 'até', 'voce': 'você', 'tambem': 'também',
  'agua': 'água', 'aguas': 'águas', 'orgao': 'órgão', 'orgaos': 'órgãos', 'servico': 'serviço', 'servicos': 'serviços',
  'possivel': 'possível', 'possiveis': 'possíveis', 'necessario': 'necessário', 'necessaria': 'necessária', 'necessarios': 'necessários', 'necessarias': 'necessárias',
  'tecnico': 'técnico', 'tecnica': 'técnica', 'tecnicos': 'técnicos', 'tecnicas': 'técnicas', 'periodo': 'período', 'periodos': 'períodos',
  'veiculo': 'veículo', 'veiculos': 'veículos', 'unico': 'único', 'unica': 'única', 'agricola': 'agrícola', 'agricolas': 'agrícolas',
  'municipio': 'município', 'municipios': 'municípios', 'saude': 'saúde', 'familia': 'família', 'familias': 'famílias',
  'area': 'área', 'areas': 'áreas', 'minimo': 'mínimo', 'minima': 'mínima', 'maximo': 'máximo', 'maxima': 'máxima',
  'numero': 'número', 'numeros': 'números', 'historico': 'histórico', 'economico': 'econômico', 'economica': 'econômica',
  'eletrico': 'elétrico', 'eletrica': 'elétrica', 'eletricos': 'elétricos', 'hidraulico': 'hidráulico', 'hidraulica': 'hidráulica',
  'residuo': 'resíduo', 'residuos': 'resíduos', 'arvore': 'árvore', 'arvores': 'árvores', 'especie': 'espécie', 'especies': 'espécies',
  'proximo': 'próximo', 'proxima': 'próxima', 'publico': 'público', 'publicos': 'públicos', 'mes': 'mês',
  'escritorio': 'escritório', 'laboratorio': 'laboratório', 'combustivel': 'combustível',
  'balcao': 'balcão', 'balcoes': 'balcões', 'facao': 'facão', 'facoes': 'facões', 'falcao': 'falcão', 'macacao': 'macacão',
  'oleo': 'óleo', 'politica': 'política', 'basico': 'básico', 'basica': 'básica'
};
/* Expressões a trocar (sem diferenciar maiúsculas) */
const EXPRESSOES = [
  [/\bafim de\b/gi, 'a fim de'], [/\bà partir\b/gi, 'a partir'], [/\ba nível de\b/gi, 'em nível de'],
  [/\bem anexo\b/gi, 'anexo'], [/\bhaja visto\b/gi, 'haja vista'], [/\bvimos por meio deste\b/gi, 'informamos']
];
/* -cao/-coes em minúsculas → -ção/-ções (nomes próprios ficam como estão) */
const FIM_CAO_EXCETO = new Set(['cao', 'macacao']);

function casarCaixa(orig, nova) {
  if (orig === orig.toUpperCase() && orig.length > 1) return nova.toUpperCase();
  if (orig[0] === orig[0].toUpperCase()) return nova[0].toUpperCase() + nova.slice(1);
  return nova;
}

/* Correções mecânicas e ortográficas que não mudam o sentido */
function corrigirTexto(texto, o = {}) {
  if (!texto || !String(texto).trim()) return { texto: texto || '', correcoes: [] };
  const correcoes = [];
  let t = String(texto).replace(/\r/g, '');
  t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  t = t.replace(/ +([,.;:!?])/g, '$1');
  t = t.replace(/([,;:])(?=[A-Za-zÀ-ú])/g, '$1 ');
  t = t.replace(/([a-zà-ú]{2})\.(?=[A-ZÀ-Ú][a-zà-ú])/g, '$1. ');
  t = t.replace(/[A-Za-zÀ-úçÇ]+/g, w => {
    const k = w.toLowerCase();
    if (ERROS_COMUNS[k] && ERROS_COMUNS[k] !== k) { const n = casarCaixa(w, ERROS_COMUNS[k]); correcoes.push({ de: w, para: n }); return n; }
    if (w === k && k.length >= 5 && !FIM_CAO_EXCETO.has(k)) {
      if (/cao$/.test(k)) { const n = k.replace(/cao$/, 'ção'); correcoes.push({ de: w, para: n }); return n; }
      if (/coes$/.test(k)) { const n = k.replace(/coes$/, 'ções'); correcoes.push({ de: w, para: n }); return n; }
    }
    return w;
  });
  EXPRESSOES.forEach(([re, n]) => { t = t.replace(re, m => { correcoes.push({ de: m, para: n }); return casarCaixa(m, n); }); });
  if (/^[a-zà-ú]/.test(t) && !o.semMaiuscula) t = t[0].toUpperCase() + t.slice(1);
  if (o.ponto && /[A-Za-zÀ-ú0-9)]$/.test(t)) t += '.';
  return { texto: t, correcoes };
}

/* Orientação por tipo de campo: o que o texto precisa ter */
const ORIENTA = {
  necessidade: { min: 120, numeros: true, ponto: true,
    rec: 'Descreva (1) o problema que existe hoje, (2) quem é afetado e quantos, (3) desde quando ou com que frequência e (4) o risco se nada for feito.',
    ex: 'As 6 escolas municipais, com 1.250 alunos, estão sem material de limpeza desde agosto; a Vigilância Sanitária exige higienização diária de cozinhas e banheiros.' },
  consequencias: { min: 50, ponto: true, rec: 'Diga o que deixa de funcionar ou que prejuízo concreto ocorre sem a contratação.', ex: 'Sem o material, a limpeza diária fica comprometida e as escolas podem ser autuadas.' },
  memoria: { min: 40, numeros: true, conta: true, ponto: true,
    rec: 'Mostre a conta que gerou cada quantidade: base (consumo, locais, área) × período ou frequência.',
    ex: '6 escolas × 20 frascos por mês × 12 meses = 1.440 frascos.' },
  item: { min: 25, item: true,
    rec: 'Descreva o que permite comparar propostas: material, medida, capacidade, embalagem, norma técnica.',
    ex: 'Detergente líquido neutro, biodegradável, frasco de 500 ml.' },
  resumo: { min: 15, resumo: true,
    rec: 'Comece por "Aquisição de…" (compra) ou "Contratação de…" (serviço) e diga para quê ou para quem.',
    ex: 'Aquisição de material de limpeza para as escolas municipais.' },
  justificativa: { min: 60, ponto: true,
    rec: 'Apresente a razão técnica ou econômica concreta (economia de escala, sistema único e integrado, logística).',
    ex: 'Os itens do lote são entregues no mesmo local, pelo mesmo tipo de fornecedor; separá-los multiplicaria o custo de frete.' },
  conclusao: { min: 40, ponto: true, rec: 'Afirme que a contratação é viável e adequada à necessidade descrita.', ex: 'A contratação é necessária, viável e adequada para resolver a necessidade descrita.' },
  texto: { min: 0, ponto: true }
};

const GENERICOS = [
  [/atender (a|à|às|as) (s )?(demandas?|necessidades?)/i, '"atender às necessidades" não diz qual é a necessidade'],
  [/suprir (a |as )?(demandas?|necessidades?)/i, '"suprir a demanda" não diz qual é a demanda'],
  [/(manuten[cç][aã]o|continuidade) d[ao]s? (atividades|servi[cç]os)/i, '"manutenção das atividades" é genérico: diga qual atividade e o que acontece sem a compra'],
  [/(bom|melhor|pleno) (andamento|funcionamento)/i, '"bom andamento" não descreve um problema concreto'],
  [/se faz necess[aá]ri[oa]/i, '"se faz necessário" afirma a necessidade sem explicá-la'],
  [/conforme (a )?(necessidade|demanda)/i, '"conforme a necessidade" deixa a quantidade indefinida'],
  [/uso (geral|di[aá]rio|da secretaria|do departamento|do setor)/i, '"para uso da secretaria" não diz para que serve'],
  [/visando (a |à )?(melhoria|otimiza[cç][aã]o|efici[eê]ncia)/i, '"visando a melhoria" é vago: diga o que melhora e quanto'],
  [/\bdivers[oa]s\b|\bvariad[oa]s\b|\betc\.?(?=\s|$)/i, '"diversos", "variados" ou "etc." deixam o objeto indefinido']
];

function revisarTexto(tipo, texto) {
  const O = ORIENTA[tipo] || ORIENTA.texto, t = String(texto || '').trim(), avisos = [];
  if (!t) return { avisos, corrigido: '', correcoes: [], mudou: false };
  const { texto: corrigido, correcoes } = corrigirTexto(t, { ponto: O.ponto, semMaiuscula: false });
  if (correcoes.length) avisos.push({ nivel: 'erro', msg: 'Correções de português: ' + correcoes.map(c => `${c.de} → ${c.para}`).join('; ') + '.' });
  const letras = t.replace(/[^A-Za-zÀ-ú]/g, '');
  if (letras.length > 15 && letras.replace(/[^A-ZÀ-Ú]/g, '').length / letras.length > 0.7) avisos.push({ nivel: 'forma', msg: 'Texto todo em maiúsculas. No documento oficial, use maiúsculas só no início das frases, em nomes próprios e em siglas.' });
  let generico = false;
  GENERICOS.forEach(([re, msg]) => { if (re.test(t)) { generico = true; avisos.push({ nivel: 'generico', msg: 'Sua descrição está genérica: ' + msg + '.' }); } });
  if (O.min && t.length < O.min) { generico = true; avisos.push({ nivel: 'generico', msg: `Texto curto demais para este campo (${t.length} caracteres).` }); }
  if (O.numeros && !/\d/.test(t)) { generico = true; avisos.push({ nivel: 'generico', msg: 'Não há nenhum número. Quantidades, prazos e quantas pessoas ou locais são atendidos tornam a justificativa verificável.' }); }
  if (O.conta && /\d/.test(t) && !/[×x*=]|\bvezes\b|\bpor (m[eê]s|ano|dia|semana)\b/i.test(t)) avisos.push({ nivel: 'generico', msg: 'Há números, mas não a conta. Mostre a multiplicação que leva à quantidade.' });
  if (O.item && /\bmarca\b/i.test(t) && !/equivalente|similar|refer[eê]ncia/i.test(t)) avisos.push({ nivel: 'generico', msg: 'Indicar marca restringe a concorrência. Descreva as características ou use a marca só como referência, com "ou equivalente" (art. 41, I).' });
  if (O.resumo && !/^(aquisi[cç][aã]o|contrata[cç][aã]o|loca[cç][aã]o|presta[cç][aã]o|execu[cç][aã]o|registro de pre[cç]os|fornecimento)/i.test(t)) avisos.push({ nivel: 'forma', msg: 'Comece por "Aquisição de…" ou "Contratação de…", como é o padrão dos processos.' });
  if (generico && O.rec) avisos.push({ nivel: 'recomenda', msg: 'Recomendo, no arquivo final: ' + O.rec, ex: O.ex });
  return { avisos, corrigido, correcoes, mudou: corrigido !== t, generico };
}

/* Campos de texto livre que passam pelo revisor (caminho → tipo) */
function camposRevisados(p) {
  const L = [
    ['demanda.necessidade', 'necessidade'], ['demanda.consequencias', 'consequencias'], ['objeto.resumo', 'resumo'],
    ['objeto.memoriaQtd', 'memoria'], ['objeto.alternativas', 'texto'], ['objeto.conclusao', 'conclusao'],
    ['objeto.requisitos', 'texto'], ['objeto.solucao', 'texto'], ['objeto.resultados', 'texto'], ['objeto.impactos', 'texto'],
    ['objeto.providencias', 'texto'], ['execucao.recebimento', 'texto'], ['execucao.garantia', 'texto']
  ];
  if (p.objeto.parcelamento !== 'itens') L.push(['objeto.justParcelamento', 'justificativa']);
  (p.itens || []).forEach((_, i) => L.push([`itens.${i}.desc`, 'item']));
  return L;
}

/* Cópia do processo com as correções seguras aplicadas, para gerar as peças */
function procCorrigido(p) {
  const c = JSON.parse(JSON.stringify(p));
  camposRevisados(c).forEach(([path, tipo]) => {
    const ks = path.split('.'); let o = c;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    const k = ks[ks.length - 1];
    if (typeof o[k] === 'string' && o[k].trim()) o[k] = corrigirTexto(o[k], { ponto: (ORIENTA[tipo] || {}).ponto }).texto;
  });
  return c;
}

if (typeof module !== 'undefined') module.exports = { corrigirTexto, revisarTexto, camposRevisados, procCorrigido, ORIENTA };

/* ===================== LICITA IAC — REVISOR NA TELA =====================
   Mostra correções e avisos de texto genérico abaixo dos campos e, quando o
   app roda dentro do claude.ai, oferece revisão da redação por IA.           */
let SAMPLE = null;          // revisão por IA: só existe dentro do claude.ai
const IA = {};              // resultado da IA por campo

function revHTML(tipo, valor, path) {
  const r = revisarTexto(tipo, valor);
  const botaoIA = SAMPLE && String(valor || '').trim().length > 10 && !IA[path]
    ? `<button class="btn small" data-act="rev-ia" data-path="${path}" data-tipo="${tipo}">Revisar redação com IA</button>` : '';
  if (!r.avisos.length) return botaoIA ? `<div class="rev-box ok"><span>Sem observações.</span>${botaoIA}</div>` : '';
  const ic = { erro: 'Aa', forma: '¶', generico: '!', recomenda: '→' };
  return `<div class="rev-box">${r.avisos.map(a => `<p class="rv ${a.nivel}"><span class="rv-ic" aria-hidden="true">${ic[a.nivel] || '•'}</span><span>${esc(a.msg)}${a.ex ? `<br><em>Exemplo: ${esc(a.ex)}</em>` : ''}</span></p>`).join('')}
    <div class="btns">${r.mudou ? `<button class="btn small" data-act="rev-aplicar" data-path="${path}" data-tipo="${tipo}">Aplicar correções aqui</button>` : ''}${botaoIA}</div>
    ${r.mudou ? '<p class="hint">As correções de português entram automaticamente nos documentos, mesmo sem clicar.</p>' : ''}</div>`;
}

function iaHTML(path) {
  const x = IA[path]; if (!x) return '';
  if (x.estado === 'pensando') return `<div class="rev-box ia"><p>Revisando o texto…</p><button class="btn small" data-act="rev-ia-parar" data-path="${path}">Parar</button></div>`;
  if (x.estado === 'erro') return `<div class="rev-box ia"><p>${esc(x.msg)}</p><button class="btn small" data-act="rev-ia-fechar" data-path="${path}">Fechar</button></div>`;
  return `<div class="rev-box ia"><p class="rv-t">Sugestão de redação</p><blockquote>${esc(x.texto)}</blockquote>
    ${x.faltando.length ? `<p class="rv generico"><span class="rv-ic" aria-hidden="true">!</span><span>Faltam informações que só você tem: ${esc(x.faltando.join('; '))}.</span></p>` : ''}
    ${x.alteracoes.length ? `<p class="hint">O que mudou: ${esc(x.alteracoes.join('; '))}.</p>` : ''}
    <div class="btns"><button class="btn small pri" data-act="rev-ia-usar" data-path="${path}">Usar este texto</button><button class="btn small" data-act="rev-ia-fechar" data-path="${path}">Manter o meu</button></div>
    <p class="hint">Confira antes de usar: a IA só conhece o que você escreveu.</p></div>`;
}

const qs = sel => document.querySelector(sel);
function atualizarRev(path) {
  const box = qs(`.rev[data-rev="${path}"]`); if (box) box.innerHTML = revHTML(box.dataset.tipo, getPath(path), path);
  const ia = qs(`.rev-ia[data-ia="${path}"]`); if (ia) ia.innerHTML = iaHTML(path);
}
function atualizarTodosRev() { document.querySelectorAll('.rev').forEach(b => { b.innerHTML = revHTML(b.dataset.tipo, getPath(b.dataset.rev), b.dataset.rev); }); }
const revT = {};
function agendarRev(path) { clearTimeout(revT[path]); revT[path] = setTimeout(() => atualizarRev(path), 450); }

const DESCRICAO_TIPO = {
  necessidade: 'justificativa da necessidade da contratação: problema atual, quem é afetado e quantos, desde quando, risco se nada for feito',
  consequencias: 'consequências da não contratação',
  memoria: 'memória de cálculo das quantidades (a conta que leva a cada quantidade)',
  item: 'especificação técnica de um item a ser comprado ou contratado, sem indicar marca',
  resumo: 'objeto da contratação em uma frase, começando por "Aquisição de" ou "Contratação de"',
  justificativa: 'justificativa técnica ou econômica para agrupar itens em lotes ou contratar tudo de um só fornecedor',
  conclusao: 'conclusão do estudo técnico preliminar',
  texto: 'trecho de documento de contratação pública'
};

async function revisarComIA(path, tipo) {
  if (!SAMPLE) return;
  const texto = String(getPath(path) || '').trim(); if (!texto) return;
  const ctl = new AbortController();
  IA[path] = { estado: 'pensando', ctl }; atualizarRev(path);
  const prompt = [
    'Você revisa textos de processos de contratação de uma prefeitura brasileira (Lei nº 14.133/2021).',
    'Campo: ' + (DESCRICAO_TIPO[tipo] || DESCRICAO_TIPO.texto) + '.',
    'Objeto do processo: ' + String(R.proc.objeto.resumo || 'não informado').slice(0, 300),
    '',
    'Reescreva o texto abaixo em português formal, claro e objetivo, no registro de documento oficial. Corrija ortografia, acentuação, concordância e pontuação. Mantenha todos os fatos, números, nomes e datas exatamente como estão. NÃO invente informação que não está no texto. Se faltar algo essencial para este tipo de campo, não preencha: liste o que falta em "faltando".',
    '',
    'Responda somente com JSON neste formato:',
    '{"texto": "texto revisado", "alteracoes": ["mudança 1"], "faltando": ["informação ausente 1"]}',
    '',
    'Texto entre <texto> e </texto>:',
    '<texto>', texto.slice(0, 4000), '</texto>'
  ].join('\n');
  try {
    const r = await SAMPLE.json(prompt, { modelTier: 'quick', signal: ctl.signal });
    if (!r || typeof r.texto !== 'string' || !r.texto.trim()) throw { code: 'invalid_json' };
    const lista = v => Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 6) : [];
    IA[path] = { estado: 'ok', texto: r.texto.trim(), alteracoes: lista(r.alteracoes), faltando: lista(r.faltando) };
  } catch (e) {
    const c = e && e.code;
    if (c === 'cancelled') delete IA[path];
    else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(c)) {
      SAMPLE = null; delete IA[path]; toast('Revisão por IA indisponível nesta conta.'); atualizarTodosRev();
    } else IA[path] = { estado: 'erro', msg: c === 'rate_limited' ? 'Muitos pedidos seguidos. Tente de novo em alguns minutos.' : 'Não foi possível revisar agora. Tente de novo.' };
  }
  atualizarRev(path);
}

function trocarTexto(path, novo) {
  setPath(path, novo); salvarTudo(path);
  const el = qs(`[data-path="${path}"]`); if (el) el.value = novo;
  atualizarRev(path);
}

/* Avisos de redação por etapa do modo Secretaria (para a conferência final) */
const ETAPA_CAMPO = { 'demanda.necessidade': 's_porque', 'demanda.consequencias': 's_porque', 'demanda.pcaJust': 's_porque', 'objeto.resumo': 's_oque',
  'objeto.requisitos': 's_detalhe', 'objeto.especificacoes': 's_detalhe', 'execucao.metodologia': 's_entrega',
  'objeto.justParcelamento': 's_oque', 'objeto.memoriaQtd': 's_quanto', 'objeto.alternativas': 's_quanto', 'objeto.conclusao': 's_quanto',
  'objeto.vantagens': 's_quanto', 'objeto.desvantagens': 's_quanto', 'objeto.justEscolha': 's_quanto',
  'execucao.recebimento': 's_entrega', 'execucao.medicao': 's_entrega', 'execucao.garantia': 's_exig' };
function avisosRedacao(p) {
  return camposRevisados(p).map(([path, tipo]) => {
    const ks = path.split('.'); let v = p; ks.forEach(k => { v = v == null ? v : v[k]; });
    return { path, etapa: path.startsWith('itens.') ? 's_oque' : (ETAPA_CAMPO[path] || null), r: revisarTexto(tipo, v) };
  }).filter(x => x.etapa && x.r.generico);
}

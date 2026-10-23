/* ===================== LICITA IAC — INTERFACE ===================== */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);

let CFGS = {}, PROCS = {}, ATIVO = { cfg: null, proc: null }, PASSO = 'demanda', CONFIRMA = null, ULT = null;
const R = { get cfg() { return CFGS[ATIVO.cfg]; }, get proc() { return PROCS[ATIVO.proc]; } };

/* ---------- armazenamento: nuvem (db da página) ou navegador ---------- */
const LS = 'licita-iac.v1';
const Store = {
  modo: 'local', db: null, uid: null, timers: {},
  lerLocal() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } },
  gravarLocal() { try { localStorage.setItem(LS, JSON.stringify({ cfgs: CFGS, procs: PROCS, ativo: ATIVO })); } catch (e) { } },
  col() { return this.db.collection('data/users/' + this.uid); },
  async conectar() {
    try {
      if (!window.claude || !window.claude.use) return false;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return false;
      const id = await user.id();
      if (!id) return false;
      this.db = db; this.uid = id;
      const snap = await this.col().get();
      const c = {}, p = {}; let at = null;
      snap.docs.forEach(d => { const x = d.data(); if (!x) return; try { const o = JSON.parse(x.json); if (x.kind === 'cfg') c[o.id] = o; else if (x.kind === 'proc') p[o.id] = o; else if (x.kind === 'ativo') at = o; } catch (e) { } });
      this.modo = 'nuvem';
      if (Object.keys(c).length) { CFGS = c; PROCS = p; ATIVO = at && c[at.cfg] ? at : { cfg: Object.keys(c)[0], proc: Object.keys(p)[0] || null }; }
      else { // primeira vez na nuvem: leva o que está no navegador
        for (const o of Object.values(CFGS)) await this.put('cfg', o);
        for (const o of Object.values(PROCS)) await this.put('proc', o);
        await this.put('ativo', Object.assign({ id: 'ativo' }, ATIVO));
      }
      return true;
    } catch (e) { this.modo = 'local'; return false; }
  },
  async put(kind, o) {
    if (this.modo !== 'nuvem') return;
    try { await this.col().doc(kind + '_' + o.id).set({ kind, json: JSON.stringify(o), upd: Date.now() }); }
    catch (e) { if (e && e.code === 'quota_exceeded') toast('Espaço de armazenamento cheio. Exporte e exclua processos antigos.'); }
  },
  async del(kind, id) { if (this.modo === 'nuvem') { try { await this.col().doc(kind + '_' + id).delete(); } catch (e) { } } },
  salvar(kind, o) {
    this.gravarLocal();
    if (this.modo !== 'nuvem' || !o) return;
    const k = kind + o.id; clearTimeout(this.timers[k]);
    this.timers[k] = setTimeout(() => this.put(kind, o), 1200);
  }
};
function salvarTudo(path) {
  if (R.proc && (!path || path.startsWith('proc'))) { R.proc.atualizado = Date.now(); Store.salvar('proc', R.proc); }
  if (!path || path.startsWith('cfg')) Store.salvar('cfg', R.cfg);
  if (!path) Store.salvar('ativo', Object.assign({ id: 'ativo' }, ATIVO));
}

/* ---------- caminhos ---------- */
function raiz() { return { cfg: R.cfg, proc: R.proc }; }
function getPath(path) { return path.split('.').reduce((o, k) => o == null ? undefined : o[k], raiz()); }
function setPath(path, v) {
  const ks = path.split('.'); let o = raiz();
  for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null) o[ks[i]] = {}; o = o[ks[i]]; }
  o[ks[ks.length - 1]] = v;
}

/* ---------- campos ---------- */
function campo(lbl, path, o = {}) {
  const v = getPath(path), id = 'f_' + path.replace(/[^\w]/g, '_');
  const art = o.art ? ` <span class="art">${esc(o.art)}</span>` : '';
  const req = o.req ? '<span class="req" title="Obrigatório">*</span>' : '';
  const rr = o.rr ? ' data-rr="1"' : '';
  const hint = o.hint ? `<p class="hint">${o.hint}</p>` : '';
  if (o.type === 'check') return `<label class="chk"><input type="checkbox" id="${id}" data-path="${path}" data-type="bool"${v ? ' checked' : ''}${rr}><span>${lbl}${art}${o.hint ? `<br><small class="hint">${o.hint}</small>` : ''}</span></label>`;
  let ctl;
  if (o.type === 'textarea') ctl = `<textarea id="${id}" data-path="${path}" rows="${o.rows || 3}" placeholder="${esc(o.ph || '')}"${rr}>${esc(v)}</textarea>`;
  else if (o.type === 'select') ctl = `<select id="${id}" data-path="${path}"${rr}>${o.options.map(([val, l]) => `<option value="${esc(val)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  else ctl = `<input id="${id}" type="${o.type || 'text'}" data-path="${path}"${o.type === 'number' ? ' data-type="num" step="any" inputmode="decimal"' : ''} value="${esc(v)}" placeholder="${esc(o.ph || '')}"${rr}>`;
  return `<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${lbl}${req}${art}</label>${ctl}${hint}</div>`;
}
const bloco = (titulo, corpo, extra = '') => `<section class="bloco">${titulo ? `<h2>${titulo}${extra}</h2>` : ''}${corpo}</section>`;

/* ---------- passos ---------- */
const PASSOS = [
  { id: 'municipio', t: 'Município', d: 'Dados do órgão, autoridades e valores-limite. Ficam salvos como perfil e valem para todos os processos.' },
  { id: 'demanda', t: 'Demanda', d: 'Quem precisa, de quê e por quê. Daqui sai o DFD e a abertura do ETP.' },
  { id: 'objeto', t: 'Objeto e itens', d: 'Natureza do objeto, itens e os elementos do estudo técnico preliminar.' },
  { id: 'precos', t: 'Pesquisa de preços', d: 'Preços coletados por item. O valor estimado sai daqui e decide o enquadramento.' },
  { id: 'situacao', t: 'Situação de fato', d: 'Fatos que abrem hipóteses de contratação direta ou mudam o procedimento.' },
  { id: 'enquadramento', t: 'Enquadramento', d: 'O motor cruza objeto, valor e fatos com a lei. Você confirma ou justifica a divergência.' },
  { id: 'selecao', t: 'Fornecedor ou disputa', d: 'Dados do contratado, na contratação direta, ou regras da disputa, na licitação.' },
  { id: 'execucao', t: 'Execução e gestão', d: 'Prazos, recebimento, pagamento, instrumento contratual, gestor e fiscal.' },
  { id: 'riscos', t: 'Riscos', d: 'Mapa de riscos por fase. Ajuste probabilidade, impacto e ações.' },
  { id: 'orcamento', t: 'Orçamento', d: 'Dotação que vai à declaração de disponibilidade e às minutas.' },
  { id: 'documentos', t: 'Documentos', d: 'Peças do processo em .docx, com pendências marcadas em amarelo.' }
];

const modo = () => ATIVO.modo === 'completo' ? 'completo' : 'simples';
const pecasAtuais = () => montarPecas(R.proc, R.cfg, { simples: modo() === 'simples' });
function render() {
  document.body.classList.toggle('simples', modo() === 'simples');
  renderAutos();
  if (modo() === 'simples') { renderSimples(); return; }
  renderPassos(); renderMain(); renderRail();
}
function rerender() { const y = window.scrollY; if (modo() === 'simples') renderSimples(); else { renderMain(); renderRail(); renderPassos(); } window.scrollTo(0, y); }

function renderAutos() {
  const cfgs = Object.values(CFGS), procs = Object.values(PROCS).sort((a, b) => (b.atualizado || 0) - (a.atualizado || 0));
  const nomeProc = p => (p.numero ? 'Proc. ' + p.numero + ' — ' : '') + (p.objeto.resumo || 'Processo sem objeto').slice(0, 60) + (p.exemplo ? ' (exemplo)' : '');
  const simples = modo() === 'simples';
  $('#autos').innerHTML = `
    <div class="modo" role="group" aria-label="Modo de uso"><button data-act="modo" data-m="simples" aria-pressed="${simples}">Secretaria</button><button data-act="modo" data-m="completo" aria-pressed="${!simples}">Licitações</button></div>
    ${simples ? '' : `<label for="selCfg">Órgão</label>
    <select id="selCfg">${cfgs.map(c => `<option value="${c.id}"${c.id === ATIVO.cfg ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>`}
    <label for="selProc">${simples ? 'Pedido' : 'Processo'}</label>
    <select id="selProc">${procs.map(p => `<option value="${p.id}"${p.id === ATIVO.proc ? ' selected' : ''}>${esc(nomeProc(p))}</option>`).join('')}</select>
    <button class="btn small pri" data-act="novo-proc">${simples ? 'Novo pedido' : 'Novo processo'}</button>
    <span class="sync${Store.modo === 'nuvem' ? ' on' : ''}" title="${Store.modo === 'nuvem' ? 'Salvo na sua conta, disponível em outros dispositivos' : 'Salvo só neste navegador. Use Exportar para guardar uma cópia.'}">${Store.modo === 'nuvem' ? 'salvo na conta' : 'salvo no navegador'}</span>`;
}

function statusPasso(id, a) {
  const p = R.proc;
  if (id === 'precos') return a.alertas.some(x => x.n === 'bloq') ? 'bloq' : a.alertas.some(x => x.n === 'alerta' && /preço|orçamentos|Pesquisa/.test(x.t)) ? 'alerta' : 'ok';
  if (id === 'enquadramento') return a.escolhida ? a.escolhida.status : 'bloq';
  if (id === 'demanda') return has(p.demanda.necessidade) && has(p.demanda.responsavel) ? 'ok' : 'alerta';
  if (id === 'municipio') return has(R.cfg.autoridade.nome) && has(R.cfg.cnpj) ? 'ok' : 'alerta';
  return '';
}
function renderPassos() {
  const a = analisar(R.proc, R.cfg);
  $('#passos').innerHTML = PASSOS.map((s, i) => `<button data-passo="${s.id}"${s.id === PASSO ? ' aria-current="step"' : ''}><span class="n">${String(i).padStart(2, '0')}</span><span>${s.t}</span><span class="dot ${statusPasso(s.id, a)}"></span></button>`).join('');
}

function renderMain() {
  const s = PASSOS.find(x => x.id === PASSO), i = PASSOS.indexOf(s);
  const p = R.proc;
  const banner = p.exemplo ? `<div class="banner"><span><b>Processo de exemplo.</b> Os dados são fictícios e servem para mostrar o funcionamento. Edite à vontade ou comece um novo.</span><button class="btn small" data-act="novo-proc">Começar processo em branco</button></div>` : '';
  const prev = i > 0 ? `<button class="btn" data-passo="${PASSOS[i - 1].id}">← ${PASSOS[i - 1].t}</button>` : '<span></span>';
  const next = i < PASSOS.length - 1 ? `<button class="btn pri" data-passo="${PASSOS[i + 1].id}">${PASSOS[i + 1].t} →</button>` : '';
  $('#main').innerHTML = `${banner}<div class="head-passo"><span class="eyebrow">Etapa ${String(i).padStart(2, '0')} de ${PASSOS.length - 1}</span><h1>${s.t}</h1><p>${s.d}</p></div>${VIEWS[PASSO]()}<div class="nav-passo">${prev}${next}</div>`;
}

/* ---------- telas ---------- */
const VIEWS = {
  municipio() {
    const c = R.cfg, V = c.valores;
    return bloco('Perfil do órgão', `<div class="grid2">
      ${campo('Nome do órgão', 'cfg.nome', { req: true })}${campo('Ente', 'cfg.ente', { hint: 'Como aparece no preâmbulo: "Município de …"' })}
      ${campo('CNPJ', 'cfg.cnpj', { req: true })}${campo('Endereço completo', 'cfg.endereco', { hint: 'Como aparece no cabeçalho: rua, número, bairro, CEP, cidade, UF.' })}
      ${campo('Telefone', 'cfg.fone')}${campo('E-mail', 'cfg.email')}
      ${campo('Cidade', 'cfg.cidade')}${campo('UF', 'cfg.uf', { rr: 1, hint: 'Em SP, o app inclui o Termo de Ciência e de Notificação do TCESP.' })}
      ${campo('Comarca (foro do contrato)', 'cfg.comarca', { art: 'art. 92, §1º' })}${campo('Sítio eletrônico oficial', 'cfg.site')}
      ${campo('Plataforma de licitação eletrônica', 'cfg.plataforma', { ph: 'BEC/SP, BLL, Licitanet…' })}${campo('Diário oficial', 'cfg.diario')}
      </div>
      ${campo('Município com até 20 mil habitantes', 'cfg.ate20mil', { type: 'check', art: 'art. 176', hint: 'Prazo de transição até 01/04/2027 para licitação eletrônica obrigatória, agentes e divulgação em sítio oficial.' })}
      ${campo('Consórcio público, autarquia ou fundação qualificada como agência executiva', 'cfg.dobro', { type: 'check', art: 'art. 75, §2º', rr: 1, hint: 'Dobra os limites de dispensa por valor.' })}
      <div class="btns"><button class="btn" data-act="brasao">${c.brasao ? 'Trocar brasão' : 'Enviar brasão (PNG ou JPG)'}</button>${c.brasao ? `<img src="${brasaoURI(c)}" alt="Brasão" style="height:48px">` : ''}${c.brasao ? '<button class="btn ghost small" data-act="tira-brasao">Remover</button>' : ''}</div>
      ${campo('Brasão esmaecido ao fundo das páginas', 'cfg.marcaDagua', { type: 'check', hint: 'Marca d\'água com 10% de opacidade, centralizada em todas as páginas dos documentos.' })}
      <div class="field"><span class="lbl-prev">Prévia do cabeçalho dos documentos</span><div class="cab-prev">${cabHTML(c)}</div></div>`,
      `<span class="btns" style="margin-left:auto"><button class="btn small" data-act="novo-cfg">Novo órgão</button><button class="btn small" data-act="exp-cfg">Exportar perfil</button><button class="btn small" data-act="imp">Importar</button></span>`)
    + bloco('Autoridades e agentes', `<div class="grid2">
      ${campo('Autoridade competente', 'cfg.autoridade.nome', { req: true })}${campo('Cargo', 'cfg.autoridade.cargo')}
      ${campo('Agente de contratação', 'cfg.agente.nome', { art: 'art. 8º' })}${campo('Cargo', 'cfg.agente.cargo')}
      ${campo('Pregoeiro(a)', 'cfg.pregoeiro.nome')}${campo('Cargo', 'cfg.pregoeiro.cargo')}
      ${campo('Assessoria jurídica', 'cfg.juridico.nome', { art: 'art. 53' })}${campo('Cargo', 'cfg.juridico.cargo')}
      ${campo('Responsável pela contabilidade', 'cfg.contabilidade.nome')}${campo('Cargo', 'cfg.contabilidade.cargo')}</div>`)
    + bloco('Regulamentação', `${campo('Regulamento da Lei nº 14.133/2021 adotado', 'cfg.regulamento', { type: 'select', rr: 1, options: [['federal', 'Regulamentos federais (art. 187)'], ['municipal', 'Decreto municipal próprio']] })}
      ${c.regulamento === 'municipal' ? campo('Identificação do decreto municipal', 'cfg.regulamentoTexto', { ph: 'Decreto Municipal nº …/…' }) : `<p class="hint">Normas federais usadas nas peças: ${REG_FEDERAL.join('; ')}. Convém que o Município tenha ato formal adotando-as.</p>`}`)
    + bloco('Valores-limite', `<div class="grid3">
      ${campo('Ano de referência', 'cfg.valores.ano', { type: 'number' })}${campo('Ato de atualização', 'cfg.valores.norma', { cls: 'span2', art: 'art. 182' })}
      ${campo('Dispensa: obras, eng. e veículos', 'cfg.valores.d75i', { type: 'number', art: 'art. 75, I' })}
      ${campo('Dispensa: compras e serviços', 'cfg.valores.d75ii', { type: 'number', art: 'art. 75, II' })}
      ${campo('Manutenção de veículos sem somatório', 'cfg.valores.d75p7', { type: 'number', art: 'art. 75, §7º' })}
      ${campo('Serviço técnico: técnica obrigatória acima de', 'cfg.valores.tecnico', { type: 'number', art: 'art. 37, §2º' })}
      ${campo('Contrato verbal até', 'cfg.valores.verbal', { type: 'number', art: 'art. 95, §2º' })}
      ${campo('Grande vulto', 'cfg.valores.grandeVulto', { type: 'number', art: 'art. 6º, XXII' })}
      ${campo('Item exclusivo ME/EPP até', 'cfg.valores.meEpp', { type: 'number', art: 'LC 123, art. 48, I' })}
      ${campo('Alerta de desvio na pesquisa (%)', 'cfg.desvioAlerta', { type: 'number' })}</div>
      <p class="hint">Valores de ${V.ano} conforme o Decreto nº 12.807/2025. A partir de 2027 a atualização passa a ser feita por ato do Ministério da Gestão e da Inovação (art. 3º do decreto). Atualize aqui quando sair.</p>`);
  },

  demanda() {
    return bloco('Identificação', `<div class="grid2">
      ${campo('Número do processo administrativo', 'proc.numero', { ph: '123/2026' })}${campo('Data', 'proc.demanda.data', { type: 'date' })}
      ${campo('Secretaria', 'proc.demanda.secretaria')}${campo('Unidade requisitante', 'proc.demanda.unidade', { req: true })}
      ${campo('Responsável pela demanda', 'proc.demanda.responsavel', { req: true })}${campo('Cargo', 'proc.demanda.cargo')}
      ${campo('Prioridade', 'proc.demanda.prioridade', { type: 'select', options: [['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']] })}${campo('Data pretendida para início', 'proc.demanda.dataPretendida', { type: 'date' })}</div>`)
      + bloco('Justificativa', `
      ${campo('Problema a resolver', 'proc.demanda.necessidade', { type: 'textarea', rows: 5, req: true, art: 'art. 18, §1º, I', hint: 'Descreva o problema com fatos e números, sob a ótica do interesse público. "Para atender às necessidades da Secretaria" não é justificativa.' })}
      ${campo('Consequências da não contratação', 'proc.demanda.consequencias', { type: 'textarea', rows: 3 })}
      <div class="grid2">${campo('Plano de Contratações Anual', 'proc.demanda.pca', { type: 'select', rr: 1, art: 'art. 12, VII', options: [['nao_elaborado', 'O Município não elaborou PCA'], ['sim', 'Prevista no PCA'], ['nao', 'Não prevista no PCA']] })}
      ${R.proc.demanda.pca === 'sim' ? campo('Referência no PCA', 'proc.demanda.pcaRef') : ''}</div>`);
  },

  objeto() {
    const p = R.proc;
    const nat = Object.entries(NAT).map(([k, v]) => [k, v.l]);
    const itens = p.itens.map((it, i) => `<div class="item"><div class="item-h"><span class="idx">Item ${i + 1}</span>${p.itens.length > 1 ? `<button class="btn ghost small" data-act="del-item" data-i="${i}" style="margin-left:auto">Remover item</button>` : ''}</div>
      ${campo('Especificação', `proc.itens.${i}.desc`, { type: 'textarea', rows: 2, req: true, hint: 'Sem marca, salvo justificativa técnica. Indique o que permite aferir qualidade.' })}
      <div class="grid3">${campo('Unidade', `proc.itens.${i}.unid`)}${campo('Quantidade', `proc.itens.${i}.qtd`, { type: 'number' })}${campo('CATMAT/CATSER', `proc.itens.${i}.catmat`)}</div></div>`).join('');
    return bloco('Natureza e escopo', `<div class="grid2">
      ${campo('Natureza do objeto', 'proc.objeto.natureza', { type: 'select', rr: 1, options: nat, hint: 'Define modalidade, limite de dispensa e cabimento do pregão.' })}
      ${campo('Objeto em uma frase', 'proc.objeto.resumo', { req: true })}</div>
      ${campo('Compra com entrega imediata e sem obrigações futuras', 'proc.objeto.entregaImediata', { type: 'check', rr: 1, art: 'art. 95, II', hint: 'Entrega em até 30 dias da ordem de fornecimento (art. 6º, X).' })}
      ${campo('Serviço ou fornecimento contínuo', 'proc.objeto.continuo', { type: 'check', rr: 1, art: 'art. 106' })}
      ${p.objeto.continuo ? `<div class="sub">${campo('Vigência em meses', 'proc.objeto.vigenciaMeses', { type: 'number' })}</div>` : ''}`)
      + bloco('Itens', `${itens}<div class="btns"><button class="btn" data-act="add-item">Adicionar item</button></div>
      ${campo('Memória de cálculo das quantidades', 'proc.objeto.memoriaQtd', { type: 'textarea', req: true, art: 'art. 18, §1º, IV', hint: 'Consumo histórico, levantamento de campo, população atendida. Quantidade sem memória de cálculo é apontamento certo.' })}`)
      + bloco('Estudo técnico preliminar', `
      ${campo('Requisitos da contratação', 'proc.objeto.requisitos', { type: 'textarea', art: 'III' })}
      ${campo('Levantamento de mercado e alternativas', 'proc.objeto.alternativas', { type: 'textarea', art: 'V', hint: 'Quais soluções existem e por que esta foi escolhida.' })}
      ${campo('Descrição da solução como um todo', 'proc.objeto.solucao', { type: 'textarea', art: 'VII' })}
      <div class="grid2">${campo('Parcelamento', 'proc.objeto.parcelamento', { type: 'select', options: [['itens', 'Por item'], ['lotes', 'Por lote'], ['global', 'Global (sem parcelamento)']], art: 'VIII' })}<span></span></div>
      ${campo('Justificativa do parcelamento ou não', 'proc.objeto.justParcelamento', { type: 'textarea', req: true, art: 'VIII', hint: 'A regra é parcelar (art. 40, V, "b"). Julgamento global ou por lote exige razão técnica ou econômica.' })}
      ${campo('Resultados pretendidos', 'proc.objeto.resultados', { type: 'textarea', art: 'IX' })}
      ${campo('Providências prévias ao contrato', 'proc.objeto.providencias', { type: 'textarea', art: 'X' })}
      ${campo('Contratações correlatas ou interdependentes', 'proc.objeto.correlatas', { type: 'textarea', art: 'XI' })}
      ${campo('Impactos ambientais e medidas mitigadoras', 'proc.objeto.impactos', { type: 'textarea', art: 'XII' })}
      ${campo('Posicionamento conclusivo', 'proc.objeto.conclusao', { type: 'textarea', req: true, art: 'XIII' })}`);
  },

  precos() {
    const p = R.proc, m = p.pesquisa.metodo, lim = num(R.cfg.desvioAlerta || 30) / 100;
    const opParam = Object.entries(PARAM).map(([k, v]) => `<option value="${k}">${k} — ${esc(v.split(' — ')[0])}</option>`).join('');
    const itens = p.itens.map((it, i) => {
      const s = estat(it);
      const linhas = (it.cot || []).map((c, j) => {
        const dv = desvio(it, c);
        return `<tr class="${c.excluir ? 'excl' : ''}">
        <td><input data-path="proc.itens.${i}.cot.${j}.fonte" value="${esc(c.fonte)}" placeholder="Fonte" aria-label="Fonte"></td>
        <td><select data-path="proc.itens.${i}.cot.${j}.param" aria-label="Parâmetro">${opParam.replace(`value="${c.param}"`, `value="${c.param}" selected`)}</select></td>
        <td><input type="date" data-path="proc.itens.${i}.cot.${j}.data" value="${esc(c.data)}" aria-label="Data"></td>
        <td><input type="number" step="any" inputmode="decimal" data-type="num" data-path="proc.itens.${i}.cot.${j}.valor" value="${esc(c.valor)}" aria-label="Valor unitário" style="width:110px"></td>
        <td class="num"><span class="dev${Math.abs(dv) > lim && !c.excluir ? ' hi' : ''}">${s.n ? (dv >= 0 ? '+' : '') + fmtNum(dv * 100, 0) + '%' : '—'}</span></td>
        <td><label class="chk"><input type="checkbox" data-type="bool" data-rr="1" data-path="proc.itens.${i}.cot.${j}.excluir"${c.excluir ? ' checked' : ''}><span>Excluir</span></label>
          ${c.excluir ? `<input data-path="proc.itens.${i}.cot.${j}.just" value="${esc(c.just)}" placeholder="Justificativa da exclusão" style="margin-top:6px">` : ''}</td>
        <td><button class="btn ghost small" data-act="del-cot" data-i="${i}" data-j="${j}" aria-label="Remover preço">✕</button></td></tr>`;
      }).join('');
      return `<div class="item"><div class="item-h"><span class="idx">Item ${i + 1}</span><span style="min-width:0">${esc((it.desc || 'Item sem descrição').slice(0, 90))}</span></div>
        <div class="tabwrap"><table class="t"><thead><tr><th>Fonte</th><th>Parâmetro</th><th>Data</th><th>Valor unit.</th><th>Desvio</th><th></th><th></th></tr></thead><tbody>${linhas || '<tr><td colspan="7" class="hint">Nenhum preço registrado.</td></tr>'}</tbody></table></div>
        <div class="btns"><button class="btn small" data-act="add-cot" data-i="${i}">Adicionar preço</button></div>
        <div class="stats">${s.n ? `<span>Válidos <b>${s.n}</b></span><span>Menor <b>${fmtBRL(s.menor)}</b></span><span>Média <b>${fmtBRL(s.media)}</b></span><span>Mediana <b>${fmtBRL(s.mediana)}</b></span><span>CV <b>${fmtNum(s.cv * 100, 1)}%</b></span>` : '<span>Sem preços válidos.</span>'}
        <span>Referência <b>${fmtBRL(precoUnit(it, m))}</b> × ${fmtNum(it.qtd, 0)} = <b>${fmtBRL(totalItem(it, m))}</b></span></div>
        ${!s.n ? campo('Preço de referência informado manualmente', `proc.itens.${i}.precoRef`, { type: 'number', hint: 'Só quando não houver preços coletáveis. Exige justificativa.' }) : ''}</div>`;
    }).join('');
    return bloco('Método', `<div class="grid2">${campo('Preço de referência por item', 'proc.pesquisa.metodo', { type: 'select', rr: 1, options: [['mediana', 'Mediana (recomendada)'], ['media', 'Média'], ['menor', 'Menor valor']] })}<span></span></div>
      ${campo('Justificativas complementares', 'proc.pesquisa.just', { type: 'textarea', rows: 2, hint: 'Ex.: por que há menos de 3 preços, ou por que só houve cotação com fornecedores.' })}
      <p class="hint">Desvio = diferença em relação à mediana do item. Valores acima de ${R.cfg.desvioAlerta || 30}% aparecem em vermelho para análise crítica; o app não exclui nada sozinho.</p>`)
      + itens;
  },

  situacao() {
    const s = R.proc.situacao;
    const cat = (NAT[R.proc.objeto.natureza] || {}).cat;
    return bloco('Despesas do exercício', `<div class="grid2">
      ${campo('Já gasto no exercício com objetos do mesmo ramo (R$)', 'proc.situacao.gastoExercicio', { type: 'number', art: 'art. 75, §1º', hint: 'Somatório da unidade gestora com objetos do mesmo ramo de atividade, de 1º de janeiro até hoje.' })}
      ${campo('Quais despesas compõem o valor', 'proc.situacao.gastoDesc')}</div>
      ${campo('Confirmado com a contabilidade', 'proc.situacao.gastoConfirmado', { type: 'check', hint: 'Marque após conferir no sistema contábil, mesmo que o valor seja zero.' })}
      ${!cat ? '<p class="hint">A natureza escolhida não admite dispensa por valor.</p>' : ''}`)
      + bloco('Inviabilidade de competição', `<fieldset><legend>Art. 74 — inexigibilidade</legend>
      ${campo('Só existe um fornecedor ou prestador possível', 'proc.situacao.exclusivo', { type: 'check', rr: 1, art: 'art. 74, I' })}
      ${campo('Contratação de profissional do setor artístico', 'proc.situacao.artista', { type: 'check', rr: 1, art: 'art. 74, II' })}
      ${campo('Serviço técnico especializado com notória especialização', 'proc.situacao.tecnico', { type: 'check', rr: 1, art: 'art. 74, III' })}
      ${s.tecnico ? `<div class="sub">${campo('Alínea', 'proc.situacao.tecnicoAlinea', { type: 'select', rr: 1, options: [['', 'Selecione'], ...Object.entries(ALINEAS_74III).map(([k, v]) => [k, k + ') ' + v.slice(0, 80)])] })}${campo('Comprovação da notória especialização', 'proc.situacao.notoria', { type: 'textarea', hint: 'Desempenho anterior, estudos, experiências, publicações, equipe técnica (art. 74, §3º).' })}</div>` : ''}
      ${campo('Credenciamento (vários fornecedores contratados nas mesmas condições)', 'proc.situacao.credenciamento', { type: 'check', rr: 1, art: 'art. 74, IV' })}
      ${s.credenciamento ? `<div class="sub">${campo('Hipótese do art. 79', 'proc.situacao.credHip', { type: 'select', options: [['I', 'I — contratação paralela e não excludente'], ['II', 'II — seleção a critério de terceiros'], ['III', 'III — mercados fluidos']] })}</div>` : ''}
      ${campo('Imóvel com características que tornam necessária a escolha', 'proc.situacao.imovel', { type: 'check', rr: 1, art: 'art. 74, V' })}</fieldset>`)
      + bloco('Hipóteses específicas de dispensa', `<fieldset><legend>Art. 75</legend>
      ${campo('Licitação anterior deserta ou fracassada', 'proc.situacao.frustrada', { type: 'check', rr: 1, art: 'art. 75, III' })}
      ${s.frustrada ? `<div class="sub"><div class="grid2">${campo('Data do resultado', 'proc.situacao.frustradaData', { type: 'date' })}${campo('Motivo', 'proc.situacao.frustradaMotivo', { type: 'select', options: [['deserta', 'Sem interessados ou sem propostas válidas'], ['fracassada', 'Propostas acima do mercado ou incompatíveis']] })}</div>${campo('Identificação da licitação anterior', 'proc.situacao.frustradaRef', { ph: 'Pregão Eletrônico nº …/…' })}</div>` : ''}
      ${campo('Emergência ou calamidade pública', 'proc.situacao.emergencia', { type: 'check', rr: 1, art: 'art. 75, VIII' })}
      ${s.emergencia ? `<div class="sub">${campo('Data da ocorrência', 'proc.situacao.emergData', { type: 'date' })}${campo('Descrição da situação', 'proc.situacao.emergDesc', { type: 'textarea', hint: 'Fato, risco concreto, documento que comprova (laudo, decreto, boletim da Defesa Civil).' })}</div>` : ''}
      ${campo('Coleta de recicláveis por associação ou cooperativa de catadores', 'proc.situacao.catadores', { type: 'check', rr: 1, art: 'art. 75, IV, "j"' })}
      ${campo('Hortifrutigranjeiros e perecíveis durante licitação em curso', 'proc.situacao.hortifruti', { type: 'check', rr: 1, art: 'art. 75, IV, "e"' })}
      ${campo('Órgão ou entidade da Administração criado para esse fim', 'proc.situacao.entidadeAdm', { type: 'check', rr: 1, art: 'art. 75, IX' })}
      ${campo('Contrato de programa com ente da Federação', 'proc.situacao.contratoPrograma', { type: 'check', rr: 1, art: 'art. 75, XI' })}
      ${campo('Associação de pessoas com deficiência', 'proc.situacao.pcd', { type: 'check', rr: 1, art: 'art. 75, XIV' })}
      ${campo('Instituição de pesquisa, ensino ou desenvolvimento institucional', 'proc.situacao.instPesquisa', { type: 'check', rr: 1, art: 'art. 75, XV' })}
      ${campo('Outra hipótese (informe o dispositivo)', 'proc.situacao.outraHip', { ph: 'art. 75, inciso …', hint: 'Fica marcada como hipótese não automatizada, para conferência manual.' })}</fieldset>`)
      + bloco('Procedimentos e modalidades especiais', `
      ${campo('Registro de preços', 'proc.situacao.srp', { type: 'check', rr: 1, art: 'arts. 82 a 86' })}
      ${s.srp ? `<div class="sub"><fieldset><legend>Cabimento</legend>${Object.entries(SRP_HIP).map(([k, v]) => `<label class="chk"><input type="checkbox" data-act="srp-hip" data-k="${k}"${(s.srpHip || []).includes(k) ? ' checked' : ''}><span>${k} — ${v}</span></label>`).join('')}</fieldset>
        ${campo('Atende mais de um órgão ou entidade', 'proc.situacao.srpOrgaos', { type: 'check', rr: 1, art: 'art. 82, §6º', hint: 'Requisito para registro de preços em contratação direta.' })}</div>` : ''}
      ${campo('Concurso (trabalho técnico, científico ou artístico com prêmio)', 'proc.situacao.concursoPremio', { type: 'check', rr: 1, art: 'art. 30' })}
      ${campo('Diálogo competitivo (inovação, solução não definida)', 'proc.situacao.dialogo', { type: 'check', rr: 1, art: 'art. 32' })}`);
  },

  enquadramento() {
    const a = analisar(R.proc, R.cfg), p = R.proc;
    const grupos = ['Dispensa', 'Inexigibilidade', 'Licitação'];
    const nomeSt = { ok: 'cabível', alerta: 'cabível com ressalvas', bloq: 'incabível' };
    const card = h => `<label class="hip ${h.status}${a.escolhida && a.escolhida.id === h.id ? ' sel' : ''}">
      <input type="radio" name="enq" data-act="escolha" value="${h.id}"${a.escolhida && a.escolhida.id === h.id ? ' checked' : ''}${h.status === 'bloq' ? ' disabled' : ''}>
      <div><div class="tt"><b>${esc(h.titulo)}</b><span class="art">${esc(h.base)}</span><span class="pill ${h.status}">${nomeSt[h.status]}</span>${a.sug && a.sug.id === h.id ? '<span class="pill info">sugerido</span>' : ''}</div>
      ${h.motivos.length ? `<ul>${h.motivos.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}
      ${h.requisitos.length && h.status !== 'bloq' ? `<ul class="req">${h.requisitos.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}</div></label>`;
    const lista = grupos.map(g => { const hs = a.H.filter(h => h.grupo === g); return hs.length ? `<div class="grupo-t">${g}</div>${hs.map(card).join('')}` : ''; }).join('');
    const diverge = a.escolhida && a.sug && a.escolhida.id !== a.sug.id;
    return bloco('', `<p class="hint" style="font-size:14px">Valor estimado de <b>${fmtBRL(a.est)}</b> para ${NAT[p.objeto.natureza].l.toLowerCase()}. Hipóteses incabíveis aparecem bloqueadas com o motivo. A licitação continua disponível mesmo quando a dispensa cabe: dispensa é faculdade, não obrigação.</p>${lista}`)
      + (diverge ? bloco('Justificativa da escolha', campo('Por que não a hipótese sugerida', 'proc.enquadramento.justDivergencia', { type: 'textarea', req: true, hint: `O motor sugeriu "${esc(a.sug.titulo)}". Registre a razão da escolha diferente.` })) : '')
      + bloco('Consequências do enquadramento', `<ul class="alertas">
        <li class="info">Instrumento: ${esc(a.instrumento.t)}</li>
        ${a.prazoEdital ? `<li class="info">Prazo mínimo entre a publicação do edital e a sessão: ${esc(a.prazoEdital)}</li>` : ''}
        ${a.escolhida && a.escolhida.grupo === 'Licitação' ? `<li class="info">${esc(a.eletronica)}</li>` : ''}
        ${a.etpFacultativo ? '<li class="alerta">O ETP é facultativo nesta hipótese pelo regulamento federal. O app o mantém em forma simplificada: o TCESP costuma cobrar planejamento mesmo em dispensa.</li>' : ''}
        ${a.direta ? '<li class="info">Divulgação do ato que autoriza a contratação direta em sítio oficial (art. 72, parágrafo único) e do contrato no PNCP em 10 dias úteis (art. 94, II).</li>' : '<li class="info">Divulgação do edital no PNCP e extrato em diário oficial e jornal de grande circulação (art. 54).</li>'}</ul>`);
  },

  selecao() {
    const a = analisar(R.proc, R.cfg), p = R.proc;
    if (!a.escolhida) return bloco('', '<p>Defina o enquadramento primeiro.</p>');
    if (a.direta) {
      const lim70 = R.cfg.valores.d75ii / 4;
      return bloco('Contratado', `<div class="grid2">
        ${campo('Razão social', 'proc.fornecedor.razao', { req: true })}${campo('CNPJ', 'proc.fornecedor.cnpj', { req: true })}
        ${campo('Endereço', 'proc.fornecedor.endereco')}${campo('Representante legal', 'proc.fornecedor.representante')}</div>
        ${campo('Razão da escolha do contratado', 'proc.fornecedor.razaoEscolha', { type: 'textarea', req: true, art: 'art. 72, VI', hint: ['75-I', '75-II'].includes(a.escolhida.id) ? 'Na dispensa por valor, em regra: menor preço entre as propostas recebidas, inclusive após o aviso do §3º.' : 'Motivo objetivo, ligado à hipótese legal.' })}
        ${campo('Justificativa do preço', 'proc.fornecedor.justPreco', { type: 'textarea', art: 'art. 72, VII', hint: 'Deixe em branco para usar o texto padrão que remete à pesquisa de preços.' })}`)
        + bloco('Habilitação', `<fieldset>${DOCS_HAB.map(d => campo(d.l, `proc.fornecedor.docs.${d.k}`, { type: 'check' })).join('')}</fieldset>
        ${a.est < lim70 ? `<p class="hint">Valor abaixo de 1/4 do limite do art. 75, II (${fmtBRL(lim70)}): a documentação pode ser dispensada total ou parcialmente (art. 70, III), mas a regularidade com a Seguridade Social é sempre exigível (CF, art. 195, §3º).</p>` : ''}`);
    }
    const crit = criterioPadrao(p, a.escolhida, a.est, R.cfg);
    return bloco('Regras da disputa', `<div class="grid2">
      ${campo('Critério de julgamento', 'proc.disputa.criterio', { type: 'select', rr: 1, art: 'art. 33', options: [['', `Automático (${crit})`], ['menor preço', 'Menor preço'], ['maior desconto', 'Maior desconto'], ['técnica e preço', 'Técnica e preço'], ['melhor técnica ou conteúdo artístico', 'Melhor técnica ou conteúdo artístico'], ['maior retorno econômico', 'Maior retorno econômico'], ['maior lance', 'Maior lance (leilão)']] })}
      ${campo('Modo de disputa', 'proc.disputa.modo', { type: 'select', art: 'art. 56', options: [['aberto', 'Aberto'], ['aberto_fechado', 'Aberto e fechado'], ['fechado_aberto', 'Fechado e aberto']] })}
      ${campo('Data da sessão', 'proc.disputa.dataSessao', { type: 'date', hint: a.prazoEdital ? 'Mínimo de ' + a.prazoEdital + ' após a publicação.' : '' })}
      ${campo('Intervalo mínimo entre lances', 'proc.disputa.intervalo', { ph: 'R$ 0,50 ou 0,5%' })}
      ${campo('Participação exclusiva ME/EPP', 'proc.disputa.exclusivaME', { type: 'select', rr: 1, options: [['auto', 'Automática nos itens até o limite'], ['nao', 'Não aplicar (art. 49 da LC 123)']] })}</div>
      ${p.disputa.exclusivaME === 'nao' ? campo('Justificativa para não aplicar', 'proc.disputa.justNaoExclusiva', { type: 'textarea', req: true }) : ''}
      ${campo('Admitir consórcio', 'proc.disputa.consorcio', { type: 'check', art: 'art. 15' })}
      ${campo('Prever vistoria facultativa', 'proc.disputa.visita', { type: 'check', art: 'art. 63, §2º' })}
      ${p.situacao.srp ? campo('Admitir adesão à ata por não participantes', 'proc.disputa.adesao', { type: 'check', art: 'art. 86, §2º' }) : ''}`)
      + bloco('Habilitação específica', `
      ${campo('Qualificação técnica', 'proc.disputa.habTecnica', { type: 'textarea', art: 'art. 67', hint: 'Só o indispensável. Atestados limitados às parcelas de maior relevância (art. 67, §1º).' })}
      ${campo('Qualificação econômico-financeira', 'proc.disputa.habEconomica', { type: 'textarea', art: 'art. 69' })}`);
  },

  execucao() {
    const a = analisar(R.proc, R.cfg), p = R.proc;
    return bloco('Execução', `<div class="grid2">
      ${campo('Prazo de entrega ou execução', 'proc.execucao.prazo', { req: true })}${campo('Local', 'proc.execucao.local', { req: true })}
      ${campo('Vigência do contrato', 'proc.execucao.vigenciaTexto', { ph: '12 meses', hint: p.objeto.continuo ? 'Serviço contínuo: até 5 anos, prorrogável até 10 (arts. 106 e 107).' : '' })}
      ${campo('Prazo de pagamento (dias)', 'proc.execucao.pagamentoDias', { type: 'number' })}</div>
      ${campo('Recebimento provisório e definitivo', 'proc.execucao.recebimento', { type: 'textarea', art: 'art. 140' })}
      <div class="grid2">${campo('Garantia do produto ou serviço', 'proc.execucao.garantia', { type: 'textarea', rows: 2 })}${campo('Assistência técnica', 'proc.execucao.assistencia', { type: 'textarea', rows: 2, hint: 'Se houver, a compra deixa de ser de entrega imediata para o art. 95, II.' })}</div>`)
      + bloco('Instrumento e garantias', `<div class="grid2">
      ${campo('Instrumento contratual', 'proc.execucao.instrumento', { type: 'select', rr: 1, art: 'art. 95', options: [['auto', 'Automático'], ['contrato', 'Termo de contrato'], ['substitutivo', 'Instrumento substitutivo (empenho, ordem)']], hint: esc(a.instrumento.t) })}
      ${campo('Índice de reajuste', 'proc.execucao.reajuste', { art: 'art. 25, §7º' })}
      ${campo('Garantia contratual (% do valor)', 'proc.execucao.garantiaContratual', { type: 'number', art: 'art. 96', hint: 'Até 5%, ou 10% com justificativa de complexidade e risco.' })}
      ${campo('Multa máxima (%)', 'proc.execucao.multa', { type: 'number', art: 'art. 156, §3º' })}</div>
      ${campo('Obrigações do contratado (deixe vazio para o texto padrão)', 'proc.execucao.obrigContratada', { type: 'textarea', rows: 2 })}
      ${campo('Obrigações do contratante (deixe vazio para o texto padrão)', 'proc.execucao.obrigContratante', { type: 'textarea', rows: 2 })}`)
      + bloco('Gestão e fiscalização', `<div class="grid2">
      ${campo('Gestor do contrato', 'proc.execucao.gestor', { req: true, art: 'art. 117' })}${campo('Cargo do gestor', 'proc.execucao.gestorCargo')}
      ${campo('Fiscal do contrato', 'proc.execucao.fiscal', { req: true })}${campo('Cargo do fiscal', 'proc.execucao.fiscalCargo')}</div>
      <p class="hint">Gestor e fiscal devem ser, preferencialmente, servidores efetivos, sem vínculo com o contratado (art. 7º).</p>`);
  },

  riscos() {
    const p = R.proc;
    const op = v => [['B', 'Baixa'], ['M', 'Média'], ['A', 'Alta']].map(([k, l]) => `<option value="${k}"${v === k ? ' selected' : ''}>${l}</option>`).join('');
    const linhas = p.riscos.map((r, i) => `<tr>
      <td><select data-path="proc.riscos.${i}.fase" aria-label="Fase">${['Planejamento', 'Seleção', 'Execução'].map(f => `<option${r.fase === f ? ' selected' : ''}>${f}</option>`).join('')}</select></td>
      <td><textarea data-path="proc.riscos.${i}.risco" rows="2" aria-label="Risco" style="min-width:200px">${esc(r.risco)}</textarea></td>
      <td><select data-path="proc.riscos.${i}.prob" data-rr="1" aria-label="Probabilidade">${op(r.prob)}</select></td>
      <td><select data-path="proc.riscos.${i}.imp" data-rr="1" aria-label="Impacto">${op(r.imp)}</select></td>
      <td><span class="pill ${({ Alto: 'bloq', Médio: 'alerta', Baixo: 'ok' })[nivelRisco(r)]}">${nivelRisco(r)}</span></td>
      <td><textarea data-path="proc.riscos.${i}.prev" rows="2" aria-label="Ação preventiva" style="min-width:200px">${esc(r.prev)}</textarea></td>
      <td><textarea data-path="proc.riscos.${i}.cont" rows="2" aria-label="Contingência" style="min-width:180px">${esc(r.cont)}</textarea></td>
      <td><input data-path="proc.riscos.${i}.resp" value="${esc(r.resp)}" aria-label="Responsável" style="min-width:130px"></td>
      <td><button class="btn ghost small" data-act="del-risco" data-i="${i}" aria-label="Remover risco">✕</button></td></tr>`).join('');
    return bloco('Mapa de riscos', `<div class="tabwrap"><table class="t"><thead><tr><th>Fase</th><th>Risco</th><th>Prob.</th><th>Impacto</th><th>Nível</th><th>Ação preventiva</th><th>Contingência</th><th>Responsável</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>
      <div class="btns"><button class="btn" data-act="add-risco">Adicionar risco</button><button class="btn ghost small" data-act="reset-riscos">Restaurar riscos padrão</button></div>
      <p class="hint">Os riscos padrão são genéricos. Inclua os específicos do objeto: sazonalidade, fornecedor único na região, dependência de licença ambiental, logística.</p>`);
  },

  orcamento() {
    return bloco('Dotação orçamentária', `<div class="grid2">
      ${campo('Órgão', 'proc.orcamento.orgao')}${campo('Unidade orçamentária', 'proc.orcamento.unidade')}
      ${campo('Funcional programática', 'proc.orcamento.funcional')}${campo('Natureza da despesa', 'proc.orcamento.natureza')}
      ${campo('Fonte de recurso', 'proc.orcamento.fonte')}${campo('Ficha', 'proc.orcamento.ficha')}</div>
      <p class="hint">A compatibilidade orçamentária deve estar demonstrada antes da autorização (art. 72, IV, e art. 150). No registro de preços, a dotação é indicada na formalização de cada contratação, conforme o regulamento.</p>`);
  },

  documentos() {
    const { a, pecas } = montarPecas(R.proc, R.cfg);
    const total = pecas.reduce((x, d) => x + d.pendencias, 0);
    const linhas = pecas.map((d, i) => `<div class="doc-row"><span class="sg">${d.sigla}</span>
      <div class="tt"><b>${esc(d.titulo)}</b><span>${esc(d.fund)} · ${d.pendencias ? d.pendencias + ' pendência' + (d.pendencias > 1 ? 's' : '') : 'sem pendências'}</span></div>
      <div class="btns"><button class="btn small" data-act="ver" data-i="${i}">Visualizar</button><button class="btn small pri" data-act="baixar" data-i="${i}">Baixar .docx</button></div></div>`).join('');
    return (a.escolhida ? '' : `<div class="banner"><span><b>Sem enquadramento possível.</b> Corrija a pesquisa de preços ou os dados do objeto.</span></div>`)
      + bloco(`Peças do processo <span class="pill ${total ? 'alerta' : 'ok'}">${total ? total + ' campos a preencher' : 'completo'}</span>`, `${linhas}
      <div class="btns" style="padding-top:8px;border-top:1px solid var(--line)"><button class="btn pri" data-act="baixar-tudo">Baixar processo completo (.docx)</button><button class="btn" data-act="exp-proc">Exportar dados do processo (.json)</button><button class="btn" data-act="imp">Importar</button></div>
      <p class="hint">Campos em amarelo nos documentos são pendências: o app não inventa nome, CNPJ, data ou justificativa. O parecer jurídico (art. 53) não é gerado: é ato da assessoria jurídica.</p>`)
      + bloco('Processo', `<div class="btns"><button class="btn" data-act="dup-proc">Duplicar processo</button>${CONFIRMA === 'proc' ? `<span class="confirma">Excluir este processo de vez? <button class="btn small" data-act="del-proc-sim">Excluir</button><button class="btn small" data-act="cancela">Cancelar</button></span>` : '<button class="btn ghost" data-act="del-proc">Excluir processo</button>'}</div>`);
  }
};

/* ---------- trilha direita ---------- */
function renderRail() {
  const { a, pecas } = montarPecas(R.proc, R.cfg);
  const h = a.escolhida;
  const lim = h && h.limite ? h.limite : null;
  const pct = lim ? Math.min(100, h.soma / lim * 100) : 0;
  const cor = pct > 100 ? 'var(--bad)' : pct > 80 ? 'var(--warn)' : 'var(--ok)';
  const nomeSt = { ok: 'cabível', alerta: 'com ressalvas', bloq: 'incabível' };
  const al = a.alertas.slice(0, 6);
  $('#rail').innerHTML = `
    <section class="card"><h3>Valor estimado</h3><div class="valor">${fmtBRL(a.est)}</div>
      ${lim ? `<div class="barra" title="Somatório do exercício sobre o limite"><i style="width:${pct}%;background:${cor}"></i></div><span class="hint">Somatório do exercício: ${fmtBRL(h.soma)} de ${fmtBRL(lim)}</span>` : ''}</section>
    <section class="card enq"><h3>Enquadramento</h3>
      ${h ? `<b>${esc(h.titulo)}</b><span class="base">${esc(h.base)}</span><span><span class="pill ${h.status}">${nomeSt[h.status]}</span>${a.sug && a.sug.id !== h.id ? ' <span class="pill alerta">difere do sugerido</span>' : ''}</span>` : '<span class="pill bloq">sem hipótese cabível</span>'}
      <button class="btn small" data-passo="enquadramento">Ver todas as hipóteses</button></section>
    ${al.length ? `<section class="card"><h3>Atenção</h3><ul class="alertas">${al.map(x => `<li class="${x.n}">${esc(x.t)}</li>`).join('')}</ul></section>` : ''}
    <section class="card"><h3>Peças · ${pecas.length}</h3><ul class="pecas">${pecas.map(d => `<li><span><span class="sg">${d.sigla}</span>${esc(d.titulo)}</span><span class="pend${d.pendencias ? '' : ' zero'}">${d.pendencias ? d.pendencias + ' pend.' : 'ok'}</span></li>`).join('')}</ul>
      <button class="btn small pri" data-passo="documentos">Gerar documentos</button></section>`;
}

/* ---------- pré-visualização ---------- */
function segHTML(s) { return textoParaSegmentos(s).map(g => g.ph ? `<mark>${esc(g.t)}</mark>` : g.b ? `<strong>${esc(g.t)}</strong>` : esc(g.t)).join(''); }
function cabHTML(c) {
  const H = linhasCabecalho(c), b = brasaoURI(c);
  return `<div class="cab">${b ? `<img src="${b}" alt="Brasão">` : ''}<div class="cab-t"><b>${esc(H.titulo)}</b>${H.linhas.map(l => `<span${l.b ? ' class="n"' : ''}>${esc(l.t)}</span>`).join('')}</div>${b ? '<i></i>' : ''}</div>`;
}
function docHTML(d) {
  const c = R.cfg;
  const cab = cabHTML(c);
  const tab = (cols, rows, foot, sem) => `<div class="tw"><table>${sem ? '' : `<tr>${cols.map(x => `<th>${segHTML(x.h)}</th>`).join('')}</tr>`}${rows.map(r => `<tr>${r.map((x, i) => sem && i === 0 ? `<th>${segHTML(x)}</th>` : `<td>${segHTML(x)}</td>`).join('')}</tr>`).join('')}${foot ? `<tr>${foot.map(x => `<td>${segHTML(x)}</td>`).join('')}</tr>` : ''}</table></div>`;
  return cab + d.blocks.map(b => {
    switch (b.t) {
      case 'title': return `<h4>${segHTML(b.text)}</h4>${b.sub ? `<div class="subt">${segHTML(b.sub)}</div>` : ''}`;
      case 'h': return `<h5>${segHTML(b.text)}</h5>`;
      case 'p': return `<p${b.align === 'right' ? ' class="r"' : ''}>${segHTML(b.text)}</p>`;
      case 'li': return `<p class="li">${segHTML(b.text)}</p>`;
      case 'note': return `<p class="nt">${segHTML(b.text)}</p>`;
      case 'kv': return tab([], b.rows, null, true);
      case 'table': return tab(b.cols, b.rows, b.foot);
      case 'sig': return `<div class="sig"><span></span><b>${segHTML(b.nome)}</b><br>${segHTML(b.cargo)}</div>`;
      default: return '';
    }
  }).join('');
}
function abrirPrevia(i) {
  const { pecas } = pecasAtuais(), d = pecas[i];
  const m = $('#modal');
  m.className = 'modal'; m.hidden = false;
  const marca = R.cfg.marcaDagua !== false && brasaoURI(R.cfg) ? ` style="--marca:url('${brasaoURI(R.cfg)}')"` : '';
  m.innerHTML = `<div class="folha-wrap" role="dialog" aria-modal="true" aria-label="${esc(d.titulo)}"><div class="folha-bar"><b>${esc(d.titulo)}</b><span class="btns"><button class="btn small pri" data-act="baixar" data-i="${i}">Baixar .docx</button><button class="btn small" data-act="fechar">Fechar</button></span></div><div class="folha${marca ? ' com-marca' : ''}"${marca}><div class="folha-in">${docHTML(d)}</div></div></div>`;
  m.querySelector('[data-act="fechar"]').focus();
}
function fecharPrevia() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ---------- arquivos ---------- */
async function oferecer(nome, blob) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename: nome, data: blob }); toast('Arquivo salvo: ' + nome); }
    catch (e) { toast(e && e.code === 'declined' ? 'Download cancelado.' : e && e.code === 'rate_limited' ? 'Já há um download aguardando confirmação.' : 'Não foi possível salvar o arquivo aqui.'); }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const nomeArq = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const cacheMarca = {};
function marcaDe(uri) {
  if (cacheMarca[uri]) return Promise.resolve(cacheMarca[uri]);
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const h = 480, w = Math.round(img.width * h / img.height), cv = document.createElement('canvas');
      cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.globalAlpha = 0.10; g.drawImage(img, 0, 0, w, h);
      ok(cacheMarca[uri] = cv.toDataURL('image/png'));
    };
    img.onerror = () => ok('');
    img.src = uri;
  });
}
async function baixarDocs(lista, nome) {
  if (typeof docx === 'undefined') { toast('A biblioteca de geração de Word não carregou. Verifique a conexão e recarregue a página.'); return; }
  toast('Gerando documento…');
  try {
    const c = R.cfg, marca = c.marcaDagua !== false && c.brasao && c.brasao !== 'iacanga' ? await marcaDe(c.brasao) : '';
    const blob = await docx.Packer.toBlob(paraDocx(docx, lista, R.proc, c, { marca }));
    await oferecer(nome, blob);
  } catch (e) { console.error(e); toast('Falha ao gerar o .docx: ' + (e.message || e)); }
}
function exportar(obj, nome) { oferecer(nome, new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })); }

function importar(txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { toast('Arquivo inválido: não é JSON.'); return; }
  if (!o || o.formato !== 'licita-iac') { toast('Este arquivo não foi exportado pelo Licita IAC.'); return; }
  if (o.cfg && !Object.values(CFGS).some(c => c.nome === o.cfg.nome)) { o.cfg.id = 'm_' + uid(); CFGS[o.cfg.id] = normalizarCfg(o.cfg); ATIVO.cfg = o.cfg.id; Store.salvar('cfg', CFGS[o.cfg.id]); }
  if (o.proc) { normalizarProc(o.proc); o.proc.id = 'p_' + uid(); o.proc.atualizado = Date.now(); PROCS[o.proc.id] = o.proc; ATIVO.proc = o.proc.id; Store.salvar('proc', o.proc); }
  salvarTudo(); render(); toast('Importado.');
}

function carregarBrasao(file) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 220 / img.height);
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      R.cfg.brasao = cv.toDataURL('image/png'); R.cfg.brasaoProp = Math.round(img.width / img.height * 1000) / 1000;
      salvarTudo(); rerender(); toast('Brasão atualizado.');
    };
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 3200); }

/* ---------- eventos ---------- */
let railT;
function agendarRail() { if (modo() === 'simples') return; clearTimeout(railT); railT = setTimeout(() => { renderRail(); renderPassos(); }, 250); }
function valorDe(el) {
  if (el.dataset.type === 'bool') return el.checked;
  if (el.dataset.type === 'num') return el.value === '' ? '' : num(el.value);
  return el.value;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset && el.dataset.ov) {
    const [o, it] = el.dataset.ov.split('|'); setValorOrc(R.proc, o, it, el.value === '' ? '' : num(el.value));
    salvarTudo('proc'); return;
  }
  if (!el.dataset || !el.dataset.path || el.type === 'checkbox' || el.tagName === 'SELECT') return;
  setPath(el.dataset.path, valorDe(el)); salvarTudo(el.dataset.path); agendarRail();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'selCfg') { ATIVO.cfg = el.value; CONFIRMA = null; salvarTudo(); render(); return; }
  if (el.id === 'selProc') { ATIVO.proc = el.value; CONFIRMA = null; salvarTudo(); render(); return; }
  if (el.id === 'arqImport') { const f = el.files[0]; if (f) f.text().then(importar); el.value = ''; return; }
  if (el.id === 'arqBrasao') { const f = el.files[0]; if (f) carregarBrasao(f); el.value = ''; return; }
  if (el.dataset.act === 's-tipo') { R.proc.objeto.natureza = el.value; salvarTudo('proc'); rerender(); return; }
  if (el.dataset.act === 's-parc') {
    const o = R.proc.objeto; o.parcelamento = el.value;
    if (el.value === 'itens' && (!has(o.justParcelamento) || o.justParcelamento === '')) o.justParcelamento = SUGESTOES.parcelamento;
    if (el.value === 'global' && o.justParcelamento === SUGESTOES.parcelamento) o.justParcelamento = '';
    salvarTudo('proc'); rerender(); return;
  }
  if (el.dataset.act === 'escolha') { R.proc.enquadramento.escolha = el.value; salvarTudo(); renderMain(); renderRail(); renderPassos(); return; }
  if (el.dataset.act === 'srp-hip') {
    const s = R.proc.situacao; s.srpHip = s.srpHip || [];
    if (el.checked) { if (!s.srpHip.includes(el.dataset.k)) s.srpHip.push(el.dataset.k); } else s.srpHip = s.srpHip.filter(k => k !== el.dataset.k);
    salvarTudo(); agendarRail(); return;
  }
  if (!el.dataset || !el.dataset.path) return;
  setPath(el.dataset.path, valorDe(el)); salvarTudo(el.dataset.path);
  if (el.dataset.rr) rerender();
  if (el.dataset.path === 'cfg.nome') renderAutos();
  if (modo() !== 'simples') { renderRail(); renderPassos(); }
});
document.addEventListener('focusout', e => { const el = e.target; if (el.dataset && (el.dataset.path === 'proc.objeto.resumo' || el.dataset.path === 'proc.numero' || el.dataset.path === 'cfg.nome')) renderAutos(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) fecharPrevia(); });
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') fecharPrevia(); });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-passo],[data-spasso],[data-act]'); if (!b || b.tagName === 'INPUT') return;
  if (b.dataset.spasso) { SPASSO = b.dataset.spasso; renderSimples(); window.scrollTo({ top: 0 }); return; }
  if (b.dataset.passo) { PASSO = b.dataset.passo; CONFIRMA = null; renderPassos(); renderMain(); window.scrollTo({ top: 0 }); return; }
  const p = R.proc, i = +b.dataset.i, j = +b.dataset.j, act = b.dataset.act;
  const rr = () => { salvarTudo(); rerender(); };
  switch (act) {
    case 'modo': ATIVO.modo = b.dataset.m; CONFIRMA = null; salvarTudo(); render(); window.scrollTo({ top: 0 }); break;
    case 'sugerir': setPath(b.dataset.path, SUGESTOES[b.dataset.k]); rr(); break;
    case 's-add-forn': p.pedido.fornecedores.push({ id: uid(), nome: '', contato: '' }); rr(); break;
    case 's-del-forn': p.pedido.fornecedores.splice(i, 1); rr(); break;
    case 's-add-orc': p.orcs.push({ id: 'o_' + uid(), empresa: '', cnpj: '', data: hojeISO() }); rr(); break;
    case 's-del-orc': p.orcs.splice(i, 1); syncOrcs(p); rr(); break;
    case 's-copiar-forn': p.pedido.fornecedores.filter(f => has(f.nome)).forEach(f => p.orcs.push({ id: 'o_' + uid(), empresa: f.nome, cnpj: '', data: hojeISO() })); rr(); break;
    case 's-ver': { const k = pecasAtuais().pecas.findIndex(d => d.id === b.dataset.id); if (k >= 0) abrirPrevia(k); break; }
    case 's-baixar': { const d = pecasAtuais().pecas.find(x => x.id === b.dataset.id); if (d) baixarDocs([d], `${d.sigla}_${nomeArq(p.objeto.resumo || 'pedido').slice(0, 50)}.docx`); break; }
    case 'novo-proc': { const n = procVazio(); PROCS[n.id] = n; ATIVO.proc = n.id; PASSO = 'demanda'; SPASSO = 's_quem'; salvarTudo(); render(); window.scrollTo({ top: 0 }); toast(modo() === 'simples' ? 'Pedido novo criado.' : 'Processo criado.'); break; }
    case 'dup-proc': { const n = JSON.parse(JSON.stringify(p)); n.id = 'p_' + uid(); n.numero = ''; n.exemplo = false; n.atualizado = Date.now(); PROCS[n.id] = n; ATIVO.proc = n.id; salvarTudo(); render(); toast('Processo duplicado. Informe o novo número.'); break; }
    case 'del-proc': CONFIRMA = 'proc'; renderMain(); break;
    case 'cancela': CONFIRMA = null; renderMain(); break;
    case 'del-proc-sim': {
      const id = ATIVO.proc; delete PROCS[id]; Store.del('proc', id); CONFIRMA = null;
      if (!Object.keys(PROCS).length) { const n = procVazio(); PROCS[n.id] = n; }
      ATIVO.proc = Object.keys(PROCS)[0]; PASSO = 'demanda'; salvarTudo(); render(); toast('Processo excluído.'); break;
    }
    case 'novo-cfg': { const c = cfgPadrao(); c.nome = 'Novo órgão'; ['ente', 'cidade', 'cnpj', 'endereco', 'fone', 'email', 'site', 'brasao'].forEach(k => c[k] = ''); CFGS[c.id] = c; ATIVO.cfg = c.id; salvarTudo(); render(); break; }
    case 'exp-cfg': exportar({ formato: 'licita-iac', versao: 1, cfg: R.cfg }, 'orgao-' + nomeArq(R.cfg.nome) + '.json'); break;
    case 'exp-proc': exportar({ formato: 'licita-iac', versao: 1, proc: p, cfg: R.cfg }, 'processo-' + nomeArq(p.numero || p.objeto.resumo || 'sem-numero').slice(0, 60) + '.json'); break;
    case 'imp': $('#arqImport').click(); break;
    case 'brasao': $('#arqBrasao').click(); break;
    case 'tira-brasao': R.cfg.brasao = ''; rr(); break;
    case 'add-item': p.itens.push({ id: uid(), desc: '', unid: 'un', qtd: 1, catmat: '', precoRef: '', cot: [] }); rr(); break;
    case 'del-item': p.itens.splice(i, 1); rr(); break;
    case 'add-cot': p.itens[i].cot = p.itens[i].cot || []; p.itens[i].cot.push({ id: uid(), fonte: '', param: 'II', data: hojeISO(), valor: '', excluir: false }); rr(); break;
    case 'del-cot': p.itens[i].cot.splice(j, 1); rr(); break;
    case 'add-risco': p.riscos.push({ id: uid(), fase: 'Execução', risco: '', prob: 'M', imp: 'M', prev: '', cont: '', resp: '' }); rr(); break;
    case 'del-risco': p.riscos.splice(i, 1); rr(); break;
    case 'reset-riscos': p.riscos = RISCOS_BASE.map(r => Object.assign({ id: uid() }, r)); rr(); break;
    case 'ver': abrirPrevia(i); break;
    case 'fechar': fecharPrevia(); break;
    case 'baixar': { const { pecas } = pecasAtuais(); const d = pecas[i]; baixarDocs([d], `${d.sigla}_${nomeArq(p.numero || 'sem-numero')}_${nomeArq(d.titulo)}.docx`); break; }
    case 'baixar-tudo': { const { pecas } = pecasAtuais(); baixarDocs(pecas, `Processo_${nomeArq(p.numero || 'sem-numero')}_${nomeArq(p.objeto.resumo).slice(0, 50)}.docx`); break; }
  }
});

/* ---------- início ---------- */
(function iniciar() {
  if (IMG.logo) $('#logoApp').src = IMG.logo; else $('#logoApp').hidden = true;
  const L = Store.lerLocal();
  if (L && L.cfgs && Object.keys(L.cfgs).length) {
    CFGS = L.cfgs; PROCS = L.procs || {}; ATIVO = L.ativo || {};
    Object.values(CFGS).forEach(normalizarCfg);
  } else {
    const c = cfgPadrao(); CFGS[c.id] = c;
    const p = procExemplo(); PROCS[p.id] = p;
    ATIVO = { cfg: c.id, proc: p.id };
  }
  Object.values(PROCS).forEach(normalizarProc);
  if (!CFGS[ATIVO.cfg]) ATIVO.cfg = Object.keys(CFGS)[0];
  if (!PROCS[ATIVO.proc]) { if (!Object.keys(PROCS).length) { const p = procVazio(); PROCS[p.id] = p; } ATIVO.proc = Object.keys(PROCS)[0]; }
  render();
  Store.conectar().then(ok => { if (ok) { Object.values(PROCS).forEach(normalizarProc); Object.values(CFGS).forEach(normalizarCfg); if (!CFGS[ATIVO.cfg]) ATIVO.cfg = Object.keys(CFGS)[0]; if (!PROCS[ATIVO.proc]) ATIVO.proc = Object.keys(PROCS)[0]; if (!PROCS[ATIVO.proc]) { const p = procVazio(); PROCS[p.id] = p; ATIVO.proc = p.id; Store.salvar('proc', p); } Store.gravarLocal(); render(); } });
})();

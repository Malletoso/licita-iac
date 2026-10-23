/* ===================== LICITA IAC — MODO SECRETARIA (simplificado) ===================== */
let SPASSO = 's_quem';

const SUGESTOES = {
  parcelamento: 'Julgamento por item, pois os itens podem ser fornecidos por empresas diferentes, o que amplia a competição e tende a reduzir os preços.',
  conclusao: 'A contratação é necessária, viável e adequada para resolver a necessidade descrita, nas quantidades e especificações indicadas.',
  recebimento: 'Recebimento provisório no ato da entrega, para conferência das quantidades, e definitivo em até 5 (cinco) dias úteis, após a verificação da qualidade e da conformidade com este termo.'
};

const TIPOS_SIMPLES = [
  ['compra', 'Comprar produtos ou materiais', 'Material de limpeza, mudas, equipamentos, móveis'],
  ['servico_comum', 'Contratar um serviço', 'Limpeza, transporte, locação de som, coleta'],
  ['eng_comum', 'Serviço de engenharia', 'Reparos, manutenção predial, pintura, poda com laudo'],
  ['obra', 'Obra ou reforma', 'Construção, ampliação, reforma de prédio ou via'],
  ['manut_veic', 'Manutenção de veículos', 'Revisão, peças e mão de obra da frota'],
  ['tecnico', 'Serviço técnico especializado', 'Projeto, laudo, consultoria, assessoria, treinamento']
];
const UNIDADES = ['unidade', 'caixa', 'pacote', 'fardo', 'litro', 'quilo', 'metro', 'metro quadrado', 'metro cúbico', 'hora', 'diária', 'mês', 'serviço'];

const SPASSOS = [
  { id: 's_quem', t: 'Quem está pedindo', d: 'Seus dados aparecem na assinatura de todos os documentos.' },
  { id: 's_oque', t: 'O que você precisa', d: 'Diga o tipo de contratação e liste cada item com a quantidade.' },
  { id: 's_porque', t: 'Por que precisa', d: 'Esta é a parte mais importante. É ela que justifica gastar o dinheiro público.' },
  { id: 's_quanto', t: 'Como chegou na quantidade', d: 'Mostre a conta que levou ao número de itens pedidos.' },
  { id: 's_entrega', t: 'Entrega e condições', d: 'Onde, em quanto tempo e como o material ou serviço será recebido.' },
  { id: 's_pedido', t: 'Pedir orçamentos', d: 'O app monta um pedido de orçamento para cada empresa. Peça a pelo menos 3.' },
  { id: 's_orcs', t: 'Orçamentos recebidos', d: 'Digite o preço que cada empresa passou para cada item.' },
  { id: 's_fiscal', t: 'Quem vai fiscalizar', d: 'Indique quem acompanha a entrega e confere se está tudo certo.' },
  { id: 's_gerar', t: 'Conferir e gerar', d: 'Veja o que falta, baixe os documentos e envie para a Licitação.' }
];

function ajuda(txt, ex) {
  return `<div class="ajuda">${txt ? `<p>${txt}</p>` : ''}${ex ? `<p class="ex"><b>Exemplo:</b> ${ex}</p>` : ''}</div>`;
}
function sugerir(path, chave, rot = 'Usar texto sugerido') { return `<button class="btn small" data-act="sugerir" data-path="${path}" data-k="${chave}">${rot}</button>`; }

const SVIEWS = {
  s_quem() {
    return `<section class="s-card">
      ${campo('Secretaria', 'proc.demanda.secretaria', { req: true })}
      ${campo('Departamento ou setor', 'proc.demanda.unidade', { req: true })}
      <div class="grid2">${campo('Seu nome completo', 'proc.demanda.responsavel', { req: true })}${campo('Seu cargo', 'proc.demanda.cargo', { req: true })}</div>
      <div class="grid2">${campo('Data do pedido', 'proc.demanda.data', { type: 'date' })}<div class="field"><span class="lbl-prev">Número do processo</span><p class="info-num">${has(R.proc.numero) ? esc(R.proc.numero) : `Atribuído pela ${esc(setorLic(R.cfg))}`}</p></div></div>
      ${ajuda(`Você não precisa numerar o processo. A ${esc(setorLic(R.cfg))} atribui o número quando receber o seu pedido; até lá, os documentos saem com "a ser atribuído pela ${esc(setorLic(R.cfg))}".`, '')}
    </section>`;
  },

  s_oque() {
    const p = R.proc, nat = p.objeto.natureza;
    const tipos = TIPOS_SIMPLES.map(([k, l, ex]) => `<label class="opcao${nat === k ? ' sel' : ''}"><input type="radio" name="tipo" data-act="s-tipo" value="${k}"${nat === k ? ' checked' : ''}><span><b>${l}</b><small>${ex}</small></span></label>`).join('');
    const itens = p.itens.map((it, i) => `<div class="s-item">
      <div class="item-h"><span class="idx">Item ${i + 1}</span>${p.objeto.parcelamento === 'lotes' ? `<label class="lote-in">Lote <input type="number" min="1" data-path="proc.itens.${i}.lote" data-type="num" data-rr="1" value="${esc(it.lote)}" aria-label="Lote do item ${i + 1}"></label>` : ''}${p.itens.length > 1 ? `<button class="btn ghost small" data-act="del-item" data-i="${i}" style="margin-left:auto">Remover</button>` : ''}</div>
      ${campo('Como deve ser o produto ou serviço', `proc.itens.${i}.desc`, { type: 'textarea', rows: 2, req: true, rev: 'item' })}
      <div class="grid2"><div class="field"><label for="f_un_${i}">Unidade</label><input id="f_un_${i}" list="unidades" data-path="proc.itens.${i}.unid" value="${esc(it.unid)}"></div>
      ${campo('Quantidade', `proc.itens.${i}.qtd`, { type: 'number', req: true })}</div></div>`).join('');
    const parc = p.objeto.parcelamento;
    return `<section class="s-card"><h2>Que tipo de contratação é?</h2><div class="opcoes">${tipos}</div></section>
      <section class="s-card">${campo('Resuma em uma frase o que será comprado ou contratado', 'proc.objeto.resumo', { req: true, rev: 'resumo' })}
        ${ajuda('Comece com "Aquisição de…" para compras ou "Contratação de…" para serviços.', 'Aquisição de material de limpeza para as escolas municipais.')}</section>
      <section class="s-card"><h2>Itens</h2>
        ${ajuda('Descreva cada item pelas características que importam: tamanho, material, capacidade. Não cite marca: isso restringe a concorrência e o Tribunal de Contas aponta.', 'Detergente líquido neutro, biodegradável, frasco de 500 ml.')}
        ${itens}<datalist id="unidades">${UNIDADES.map(u => `<option value="${u}">`).join('')}</datalist>
        <div class="btns"><button class="btn" data-act="add-item">+ Adicionar outro item</button></div></section>
      <section class="s-card">${campo('Exigências de qualidade (opcional)', 'proc.objeto.requisitos', { type: 'textarea', rev: 'texto' })}
        ${ajuda('Normas técnicas, certificados, registros ou licenças que o fornecedor ou o produto precisam ter.', 'Produto com registro na ANVISA; mudas de viveiro inscrito no RENASEM.')}</section>
      ${p.itens.length > 1 ? `<section class="s-card"><h2>Como os itens serão disputados?</h2>
        <div class="opcoes tres">
          <label class="opcao${parc === 'itens' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="itens"${parc === 'itens' ? ' checked' : ''}><span><b>Por item</b><small>Cada item pode ficar com uma empresa diferente</small></span></label>
          <label class="opcao${parc === 'lotes' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="lotes"${parc === 'lotes' ? ' checked' : ''}><span><b>Por lote</b><small>Itens agrupados; cada lote tem o seu vencedor</small></span></label>
          <label class="opcao${parc === 'global' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="global"${parc === 'global' ? ' checked' : ''}><span><b>Tudo junto</b><small>Uma empresa só fornece todos os itens</small></span></label></div>
        ${EXPLICA_LOTES}
        ${parc === 'lotes' ? `<p class="hint"><b>${esc(composicaoLotes(p))}</b> Ajuste o número do lote em cada item, na lista acima.</p>` : ''}
        ${parc !== 'itens' ? campo(parc === 'lotes' ? 'Explique por que agrupar em lotes' : 'Explique por que precisa ser uma empresa só', 'proc.objeto.justParcelamento', { type: 'textarea', req: true, rev: 'justificativa', hint: parc === 'lotes' ? 'Ex.: os itens de cada lote são entregues juntos pelo mesmo tipo de fornecedor, e separá-los encareceria o frete.' : 'Razão técnica ou econômica (art. 40, §3º). "Facilita a gestão" sozinho não basta.' }) : ''}</section>` : ''}`;
  },

  s_porque() {
    return `<section class="s-card">${campo('Qual problema existe hoje?', 'proc.demanda.necessidade', { type: 'textarea', rows: 6, req: true, rev: 'necessidade' })}
      ${ajuda('Responda: o que falta ou não funciona? Quem é afetado? Desde quando? Use números sempre que puder. Evite frases genéricas como "para atender às necessidades da Secretaria".', 'As 6 escolas municipais, com 1.250 alunos, estão sem estoque de material de limpeza desde agosto. A Vigilância Sanitária exige higienização diária das cozinhas e banheiros.')}</section>
      <section class="s-card">${campo('O que acontece se não comprar ou não contratar?', 'proc.demanda.consequencias', { type: 'textarea', rows: 3, rev: 'consequencias' })}
      ${ajuda('', 'Sem o material, a limpeza diária fica comprometida e as escolas podem ser autuadas pela Vigilância Sanitária.')}</section>`;
  },

  s_quanto() {
    return `<section class="s-card">${campo('Como chegou nas quantidades?', 'proc.objeto.memoriaQtd', { type: 'textarea', rows: 4, req: true, rev: 'memoria' })}
      ${ajuda('Mostre a conta. Pode ser o consumo do ano anterior, o número de locais atendidos, a área a ser coberta.', '6 escolas × 20 frascos por mês × 12 meses = 1.440 frascos de detergente.')}</section>
      <section class="s-card">${campo('Existe outra forma de resolver o problema? (opcional)', 'proc.objeto.alternativas', { type: 'textarea', rev: 'texto' })}
      ${ajuda('Se pensou em alugar em vez de comprar, produzir na própria prefeitura ou receber por doação, conte por que não serve.', '')}</section>
      <section class="s-card">${campo('Conclusão', 'proc.objeto.conclusao', { type: 'textarea', req: true, rev: 'conclusao' })}
      <div class="btns">${sugerir('proc.objeto.conclusao', 'conclusao')}</div></section>`;
  },

  s_entrega() {
    const p = R.proc;
    return `<section class="s-card"><div class="grid2">${campo('Local de entrega ou execução', 'proc.execucao.local', { req: true, ph: 'Almoxarifado central, Rua…' })}${campo('Prazo', 'proc.execucao.prazo', { req: true, ph: '10 dias após o pedido' })}</div>
      ${campo('Como será feito o recebimento', 'proc.execucao.recebimento', { type: 'textarea', rev: 'texto' })}
      <div class="btns">${sugerir('proc.execucao.recebimento', 'recebimento')}</div>
      ${campo('Garantia exigida (opcional)', 'proc.execucao.garantia', { type: 'textarea', rows: 2, ph: 'Garantia de 12 meses contra defeitos de fabricação' })}</section>
      <section class="s-card">${campo('É um serviço ou fornecimento que se repete todo mês?', 'proc.objeto.continuo', { type: 'check', rr: 1, hint: 'Ex.: limpeza, coleta, locação mensal. Compras com entrega única não são contínuas.' })}
      ${p.objeto.continuo ? campo('Por quantos meses?', 'proc.objeto.vigenciaMeses', { type: 'number' }) : ''}</section>`;
  },

  s_pedido() {
    const ped = R.proc.pedido;
    const forns = ped.fornecedores.map((f, i) => `<div class="grid-forn">
      <div class="field"><label for="f_fn_${i}">Empresa ${i + 1}</label><input id="f_fn_${i}" data-path="proc.pedido.fornecedores.${i}.nome" value="${esc(f.nome)}" placeholder="Nome da empresa"></div>
      <div class="field"><label for="f_fc_${i}">Contato</label><input id="f_fc_${i}" data-path="proc.pedido.fornecedores.${i}.contato" value="${esc(f.contato)}" placeholder="E-mail ou telefone"></div>
      <button class="btn ghost small" data-act="s-del-forn" data-i="${i}" aria-label="Remover empresa">✕</button></div>`).join('');
    return `<section class="s-card"><h2>Para quais empresas vai pedir orçamento?</h2>
      ${ajuda('Peça a pelo menos 3 empresas que trabalhem com o produto ou serviço. O app gera uma folha de pedido para cada uma, com a lista de itens.', '')}
      ${forns || '<p class="hint">Nenhuma empresa adicionada ainda.</p>'}
      <div class="btns"><button class="btn" data-act="s-add-forn">+ Adicionar empresa</button></div></section>
      <section class="s-card"><div class="grid2">${campo('Responder até', 'proc.pedido.prazoResposta', { type: 'date' })}${campo('E-mail ou endereço para a resposta', 'proc.pedido.contato')}</div>
      <div class="btns"><button class="btn big pri" data-act="s-baixar" data-id="pedido">Baixar pedidos de orçamento (.docx)</button><button class="btn" data-act="s-ver" data-id="pedido">Ver antes</button></div></section>`;
  },

  s_orcs() {
    const p = R.proc, m = p.pesquisa.metodo;
    const velho = o => o.data && diasEntre(o.data, p.demanda.data || hojeISO()) > 183;
    const cards = p.orcs.map((o, i) => {
      const total = p.itens.reduce((x, it) => x + num(valorOrc(p, o.id, it.id)) * num(it.qtd), 0);
      return `<div class="s-item"><div class="item-h"><span class="idx">Orçamento ${i + 1}</span><span class="tot">Total: <b>${fmtBRL(total)}</b></span><button class="btn ghost small" data-act="s-del-orc" data-i="${i}">Remover</button></div>
        <div class="grid3"><div class="field span2"><label for="f_oe_${i}">Empresa</label><input id="f_oe_${i}" data-path="proc.orcs.${i}.empresa" value="${esc(o.empresa)}"></div>
        <div class="field"><label for="f_oc_${i}">CNPJ</label><input id="f_oc_${i}" data-path="proc.orcs.${i}.cnpj" value="${esc(o.cnpj)}"></div></div>
        <div class="grid2"><div class="field"><label for="f_od_${i}">Data do orçamento</label><input type="date" id="f_od_${i}" data-path="proc.orcs.${i}.data" data-rr="1" value="${esc(o.data)}">${velho(o) ? '<p class="hint aviso">Orçamento com mais de 6 meses. Peça um novo.</p>' : ''}</div></div>
        <div class="precos">${p.itens.map((it, k) => `<label class="preco"><span><b>${k + 1}.</b> ${esc((it.desc || 'Item sem descrição').slice(0, 80))} <small>(${fmtNum(it.qtd, 0)} ${esc(it.unid || 'un')})</small></span>
          <span class="rs">R$ <input type="number" step="any" inputmode="decimal" data-ov="${o.id}|${it.id}" value="${esc(valorOrc(p, o.id, it.id))}" aria-label="Preço unitário do item ${k + 1} — ${esc(o.empresa || 'orçamento ' + (i + 1))}"></span></label>`).join('')}</div></div>`;
    }).join('');
    const linhaR = (it, k) => { const s = estat(it); return `<tr><td>${k + 1}</td><td>${esc((it.desc || '—').slice(0, 60))}</td><td class="num">${s.n || 0}</td><td class="num">${s.n ? fmtBRL(s.menor) : '—'}</td><td class="num"><b>${fmtBRL(precoUnit(it, m))}</b></td><td class="num">${fmtBRL(totalItem(it, m))}</td></tr>`; };
    const L = grupoLotes(p);
    const resumo = L ? L.map(g => `<tr class="lote-h"><td colspan="6">${esc(nomeLote(g.lote).replace('⟦', '').replace('⟧', ''))}</td></tr>${g.itens.map(o => linhaR(o.it, o.i)).join('')}<tr class="lote-t"><td></td><td>Subtotal do lote</td><td></td><td></td><td></td><td class="num"><b>${fmtBRL(g.total)}</b></td></tr>`).join('')
      : p.itens.map(linhaR).join('');
    const importar = !p.orcs.length && p.pedido.fornecedores.some(f => has(f.nome)) ? `<button class="btn" data-act="s-copiar-forn">Usar as empresas do pedido</button>` : '';
    return `<section class="s-card">${ajuda('Digite o preço de cada item exatamente como está no orçamento da empresa (preço por unidade). Guarde os orçamentos assinados: eles vão junto para a Licitação.', '')}
      <div class="btns">${importar}</div></section>
      ${cards}
      <div class="btns"><button class="btn" data-act="s-add-orc">+ Adicionar orçamento</button></div>
      <section class="s-card"><h2>Resumo dos preços</h2><div class="tabwrap"><table class="t"><thead><tr><th>Item</th><th>Descrição</th><th>Orçamentos</th><th>Menor</th><th>Referência</th><th>Total</th></tr></thead><tbody>${resumo}</tbody>
      <tfoot><tr><td></td><td><b>Total estimado</b></td><td></td><td></td><td></td><td class="num"><b>${fmtBRL(estimativa(p))}</b></td></tr></tfoot></table></div>
      <p class="hint">Preço de referência = mediana dos orçamentos de cada item (o valor do meio). Ela não é puxada por um orçamento muito alto ou muito baixo.</p></section>`;
  },

  s_fiscal() {
    return `<section class="s-card">${ajuda('O gestor cuida do contrato como um todo (prazos, pagamentos, problemas com a empresa). O fiscal acompanha a entrega e confere se está de acordo com o pedido. Escolha servidores que conheçam o assunto e que não tenham parentesco nem negócio com as empresas.', '')}
      <div class="grid2">${campo('Gestor', 'proc.execucao.gestor', { req: true })}${campo('Cargo do gestor', 'proc.execucao.gestorCargo')}
      ${campo('Fiscal', 'proc.execucao.fiscal', { req: true })}${campo('Cargo do fiscal', 'proc.execucao.fiscalCargo')}</div></section>`;
  },

  s_gerar() {
    const p = R.proc, { pecas } = pecasAtuais();
    const orcsOk = p.orcs.filter(o => p.itens.every(it => num(valorOrc(p, o.id, it.id)) > 0)).length;
    const checks = [
      [has(p.demanda.responsavel) && has(p.demanda.secretaria) && has(p.demanda.cargo), 'Seus dados (nome, cargo, secretaria)', 's_quem'],
      [has(p.objeto.resumo) && p.itens.every(it => has(it.desc) && num(it.qtd) > 0), 'Resumo e itens com descrição e quantidade', 's_oque'],
      ...(p.objeto.parcelamento === 'lotes' ? [[p.itens.every(it => has(it.lote)) && has(p.objeto.justParcelamento), 'Lote de cada item e justificativa do agrupamento', 's_oque']] : []),
      [String(p.demanda.necessidade || '').trim().length >= 80, 'Justificativa da necessidade com detalhes (mínimo de 2 ou 3 frases)', 's_porque'],
      [has(p.objeto.memoriaQtd), 'Explicação de como chegou nas quantidades', 's_quanto'],
      [has(p.objeto.conclusao), 'Conclusão do estudo', 's_quanto'],
      [has(p.execucao.local) && has(p.execucao.prazo), 'Local e prazo de entrega', 's_entrega'],
      [orcsOk >= 3, `Pelo menos 3 orçamentos com preço em todos os itens (você tem ${orcsOk})`, 's_orcs'],
      [has(p.execucao.gestor) && has(p.execucao.fiscal), 'Gestor e fiscal indicados', 's_fiscal'],
      ...(() => { const g = avisosRedacao(p); return [[!g.length, g.length ? `Redação genérica em ${g.length} campo(s): veja as recomendações abaixo de cada um` : 'Textos sem redação genérica', g.length ? g[0].etapa : 's_porque']]; })()
    ];
    const faltam = checks.filter(c => !c[0]).length;
    const docs = pecas.map((d, i) => `<div class="doc-row"><span class="sg">${d.sigla}</span><div class="tt"><b>${esc(d.titulo)}</b><span>${d.pendencias ? d.pendencias + ' campo(s) em amarelo para completar' : 'pronto'}</span></div>
      <div class="btns"><button class="btn small" data-act="ver" data-i="${i}">Ver</button><button class="btn small pri" data-act="baixar" data-i="${i}">Baixar</button></div></div>`).join('');
    return `<section class="s-card"><h2>${faltam ? `Faltam ${faltam} ${faltam > 1 ? 'pontos' : 'ponto'}` : 'Tudo preenchido'}</h2>
      <ul class="checks">${checks.map(([ok, t, passo]) => `<li class="${ok ? 'ok' : 'falta'}"><span class="ic" aria-hidden="true">${ok ? '✓' : '!'}</span><span>${t}</span>${ok ? '' : `<button class="btn small" data-spasso="${passo}">Corrigir</button>`}</li>`).join('')}</ul>
      ${faltam ? '<p class="hint">Você pode baixar os documentos mesmo assim. O que faltar sai destacado em amarelo.</p>' : ''}
      <p class="hint">Erros de digitação e acentuação conhecidos são corrigidos automaticamente nos documentos. O que é genérico, só você pode completar.</p></section>
      ${AVISO_REVISAO}
      <section class="s-card"><h2>Documentos</h2>${docs}
      <div class="btns" style="padding-top:10px"><button class="btn big pri" data-act="baixar-tudo">Baixar todos em um arquivo (.docx)</button></div></section>
      <section class="s-card"><h2>Enviar para a Licitação</h2>
      <ol class="passos-envio"><li>Baixe os documentos, leia cada um com atenção, corrija o que for preciso, imprima e só então assine.</li><li>Junte os orçamentos assinados pelas empresas.</li><li>Baixe o arquivo do pedido e envie junto, por e-mail ou pendrive. A Licitação abre esse arquivo no app e continua o processo sem redigitar nada.</li></ol>
      <div class="btns"><button class="btn big" data-act="exp-proc">Baixar arquivo do pedido (.json)</button></div></section>
      <section class="s-card"><div class="btns"><button class="btn" data-act="novo-proc">Começar um novo pedido</button><button class="btn" data-act="dup-proc">Copiar este pedido</button><button class="btn ghost" data-act="del-proc">Excluir este pedido</button></div></section>`;
  }
};

function renderSimples() {
  const i = SPASSOS.findIndex(x => x.id === SPASSO), s = SPASSOS[i], p = R.proc;
  const pct = Math.round((i + 1) / SPASSOS.length * 100);
  const banner = p.exemplo ? `<div class="banner"><span><b>Este é um pedido de exemplo.</b> Os dados são de mentira e servem para você ver como funciona.</span><button class="btn small" data-act="novo-proc">Começar meu pedido</button></div>` : '';
  const prev = i > 0 ? `<button class="btn big" data-spasso="${SPASSOS[i - 1].id}">← Voltar</button>` : '<span></span>';
  const next = i < SPASSOS.length - 1 ? `<button class="btn big pri" data-spasso="${SPASSOS[i + 1].id}">Continuar →</button>` : '';
  $('#main').innerHTML = `${confirmaExclusao()}${banner}
    <div class="s-prog"><div class="s-prog-t"><span>Passo ${i + 1} de ${SPASSOS.length}</span><span class="salvo">Tudo é salvo automaticamente</span></div>
      <div class="barra"><i style="width:${pct}%;background:var(--accent)"></i></div>
      <div class="s-mapa">${SPASSOS.map((x, k) => `<button data-spasso="${x.id}" class="${k === i ? 'at' : k < i ? 'feito' : ''}" aria-label="Passo ${k + 1}: ${x.t}"${k === i ? ' aria-current="step"' : ''}>${k + 1}</button>`).join('')}</div></div>
    <div class="head-passo"><h1>${s.t}</h1><p>${s.d}</p></div>
    ${SVIEWS[SPASSO]()}
    <div class="nav-passo s-nav">${prev}${next}</div>`;
}

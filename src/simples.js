/* ===================== LICITA IAC — MODO SECRETARIA (simplificado) ===================== */
let SPASSO = 's_quem';

const SUGESTOES = {
  parcelamento: 'Julgamento por item, pois os itens podem ser fornecidos por empresas diferentes, o que amplia a competição e tende a reduzir os preços.',
  conclusao: 'A contratação é necessária, viável e adequada para resolver a necessidade descrita, nas quantidades e especificações indicadas.',
  recebimento: 'Recebimento provisório no ato da entrega, para conferência das quantidades, e definitivo em até 5 (cinco) dias úteis, após a verificação da qualidade e da conformidade com este termo.',
  garantia: p => garantiaPadrao(p.objeto.natureza),
  medicao: p => medicaoPadrao(p),
  pcaJust: 'A inclusão desta demanda justifica-se por se tratar de necessidade superveniente, identificada após a elaboração do PCA, cujo atendimento não pode aguardar o próximo exercício sem prejuízo ao serviço público.',
  justEscolha: p => `A solução escolhida é a que melhor atende à necessidade descrita, considerando qualidade, prazo e custo, frente às alternativas avaliadas.`
};

/* Opções grandes em forma de cartão (radio) ligadas a um campo */
function opcoesRadio(path, ops, cls = '') {
  const v = String(getPath(path) ?? '');
  return `<div class="opcoes ${cls}" role="radiogroup">${ops.map(([k, l, sm]) => `<label class="opcao${v === String(k) ? ' sel' : ''}"><input type="radio" name="r_${path.replace(/\W/g, '_')}" data-path="${path}" data-rr="1" value="${k}"${v === String(k) ? ' checked' : ''}><span><b>${l}</b>${sm ? `<small>${sm}</small>` : ''}</span></label>`).join('')}</div>`;
}

/* ---------- blocos usados nos dois modos ---------- */
const PAPEIS = [
  ['gestor', 'Gestor do contrato', 'Coordena o contrato: prazos, ocorrências, pagamentos, aditivos e o recebimento definitivo. Em geral, o secretário ou o diretor da área.', true],
  ['fiscal', 'Fiscal técnico', 'Acompanha a execução no dia a dia, confere se o que foi entregue está de acordo com o pedido e faz o recebimento provisório. Precisa conhecer o assunto.', true],
  ['fiscalAdm', 'Fiscal administrativo', 'Cuida da parte documental: prazos, certidões da empresa, empenho, pagamento e garantias. Opcional.', false],
  ['fiscalSet', 'Fiscal setorial', 'Só quando o objeto é executado em vários setores ou locais distantes e alguém de lá precisa acompanhar. Opcional.', false]
];
function blocoFiscais(simples) {
  return PAPEIS.map(([k, t, d, obrig]) => `<${simples ? 'section class="s-card"' : 'div class="item"'}><h2 class="papel">${t}${obrig ? '' : ' <small>(opcional)</small>'}</h2>${simples ? ajuda(d, '') : `<p class="hint">${d}</p>`}
    <div class="grid3">${campo('Nome', `proc.execucao.${k}`, { req: obrig })}${campo('Cargo', `proc.execucao.${k}Cargo`)}${campo('CPF', `proc.execucao.${k}Cpf`, { ph: '000.000.000-00', hint: 'Sai mascarado nos documentos (ex.: 464.XXX.XXX-08).' })}</div></${simples ? 'section' : 'div'}>`).join('');
}
function listaDotacoes() {
  const L = R.proc.orcamento.dotacoes || [];
  return `${L.map((x, i) => `<div class="grid-forn">${campo('Secretaria ou órgão', `proc.orcamento.dotacoes.${i}.orgao`, { ph: 'Meio Ambiente' })}${campo('Ficha', `proc.orcamento.dotacoes.${i}.ficha`, { ph: '331' })}
    <button class="btn ghost small" data-act="del-dot" data-i="${i}" aria-label="Remover dotação">✕</button></div>`).join('')}
    <div class="btns"><button class="btn" data-act="add-dot">+ Adicionar dotação</button></div>`;
}
function blocoExigencias(simples) {
  const p = R.proc, e = p.execucao, o = p.objeto;
  const card = (titulo, corpo) => simples ? `<section class="s-card"><h2>${titulo}</h2>${corpo}</section>` : `<div class="item"><h2 class="papel">${titulo}</h2>${corpo}</div>`;
  return card('A empresa precisa comprovar experiência?', `${simples ? ajuda('Peça atestado só quando a execução exigir experiência anterior. Exigência demais afasta concorrentes e o Tribunal de Contas aponta.', 'Atestado de capacidade técnica, emitido por pessoa jurídica de direito público ou privado, comprovando a execução de serviços compatíveis com o objeto.') : ''}
      ${campo('Exigência de qualificação técnica (deixe vazio se não houver)', 'proc.disputa.habTecnica', { type: 'textarea', rows: 3, art: 'art. 67' })}`)
    + card('Subcontratação', opcoesRadio('proc.objeto.subcontratacao', [['nao', 'Não permitir', 'A empresa vencedora executa tudo'], ['parcial', 'Permitir em parte', 'Parte do serviço pode ser feita por outra empresa']], 'duas')
      + (o.subcontratacao === 'parcial' ? campo('Quais partes e até quanto', 'proc.objeto.subcontratacaoJust', { type: 'textarea', rows: 2, req: true }) : ''))
    + card('Garantia do produto ou serviço', `${campo('Prazo e condições da garantia', 'proc.execucao.garantia', { type: 'textarea', rows: 3, rev: 'texto' })}<div class="btns">${sugerir('proc.execucao.garantia', 'garantia', 'Usar garantia padrão para este tipo')}</div>`)
    + card('Garantia financeira do contrato', `${opcoesRadio('proc.execucao.garantiaContratual', [['0', 'Não exigir', 'O pagamento só ocorre depois da entrega'], ['5', 'Exigir 5%', 'Caução, seguro ou fiança de 5% do valor (art. 96)']], 'duas')}
      ${num(e.garantiaContratual) > 0 ? '' : campo('Motivo (opcional)', 'proc.execucao.garantiaJust', { ph: 'considerando o baixo risco e o pagamento após a execução' })}`)
    + card('Vistoria nos locais', `${opcoesRadio('proc.disputa.vistoria', [['nao', 'Não precisa', 'O objeto é claro só pela descrição'], ['facultativa', 'Facultativa', 'A empresa pode visitar; se não for, declara que conhece o local'], ['obrigatoria', 'Obrigatória', 'Só se for indispensável conhecer o local antes']], 'tres')}
      ${(p.disputa.vistoria || 'nao') !== 'nao' ? campo('Onde agendar a vistoria', 'proc.disputa.vistoriaLocal', { ph: p.demanda.secretaria || 'Secretaria de …' }) : ''}`);
}
function opcoesRegime() {
  return [['', 'Não definido'], ['preco_unitario', 'Por preço unitário (paga o que for medido)'], ['preco_global', 'Por preço global (preço fechado)'], ['integral', 'Empreitada integral'], ['tarefa', 'Por tarefa (pequenos serviços)']];
}

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
  { id: 's_detalhe', t: 'Detalhes técnicos', d: 'Medidas, materiais, normas e cuidados que a empresa precisa seguir. Quanto mais claro, menos problema na entrega.' },
  { id: 's_porque', t: 'Por que precisa', d: 'Esta é a parte mais importante. É ela que justifica gastar o dinheiro público.' },
  { id: 's_quanto', t: 'Quantidade e solução', d: 'Mostre a conta das quantidades e por que esta é a melhor forma de resolver o problema.' },
  { id: 's_exig', t: 'Exigências e garantias', d: 'O que a empresa precisa comprovar e que garantias a Prefeitura terá.' },
  { id: 's_entrega', t: 'Execução e pagamento', d: 'Onde, em quanto tempo, como será conferido e como será pago.' },
  { id: 's_pedido', t: 'Pedir orçamentos', d: 'O app monta um pedido de orçamento para cada empresa. Peça a pelo menos 3.' },
  { id: 's_orcs', t: 'Orçamentos recebidos', d: 'Digite o preço que cada empresa passou para cada item.' },
  { id: 's_fiscal', t: 'Gestão e fiscalização', d: 'Quem vai cuidar do contrato e conferir a execução. Os nomes vão para o Termo de Referência e para o Termo de Responsabilidade.' },
  { id: 's_dotacao', t: 'Orçamento', d: 'De qual ficha sai o dinheiro. Se não souber, deixe em branco: a Contabilidade indica.' },
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
      <div class="grid2">${campo('Data do pedido', 'proc.demanda.data', { type: 'date' })}${campo('Nº da solicitação (se houver)', 'proc.demanda.solicitacao', { ph: '01078/2026', hint: 'Número gerado no sistema de compras. Vai no Termo de Responsabilidade.' })}</div>
      <div class="field"><span class="lbl-prev">Número do processo</span><p class="info-num">${has(R.proc.numero) ? esc(R.proc.numero) : `Atribuído pela ${esc(setorLic(R.cfg))}`}</p></div>
      ${ajuda(`Você não precisa numerar o processo. A ${esc(setorLic(R.cfg))} atribui o número quando receber o seu pedido.`, '')}
    </section>`;
  },

  s_oque() {
    const p = R.proc, nat = p.objeto.natureza;
    const tipos = TIPOS_SIMPLES.map(([k, l, ex]) => `<label class="opcao${nat === k ? ' sel' : ''}"><input type="radio" name="tipo" data-act="s-tipo" value="${k}"${nat === k ? ' checked' : ''}><span><b>${l}</b><small>${ex}</small></span></label>`).join('');
    const itens = p.itens.map((it, i) => `<div class="s-item">
      <div class="item-h"><span class="idx">Item ${i + 1}</span>${p.objeto.parcelamento === 'lotes' ? `<label class="lote-in">Lote <input type="number" min="1" data-path="proc.itens.${i}.lote" data-type="num" data-rr="1" value="${esc(it.lote)}" aria-label="Lote do item ${i + 1}"></label>` : ''}${p.itens.length > 1 ? `<button class="btn ghost small" data-act="del-item" data-i="${i}" style="margin-left:auto">Remover</button>` : ''}</div>
      ${campo('Como deve ser o produto ou serviço', `proc.itens.${i}.desc`, { type: 'textarea', rows: 2, req: true, rev: 'item' })}
      <div class="grid3"><div class="field"><label for="f_un_${i}">Unidade</label><input id="f_un_${i}" list="unidades" data-path="proc.itens.${i}.unid" value="${esc(it.unid)}"></div>
      ${campo('Quantidade', `proc.itens.${i}.qtd`, { type: 'number', req: true })}${campo('Local (opcional)', `proc.itens.${i}.local`, { ph: 'Ecoponto 01, CIEM…' })}</div></div>`).join('');
    const parc = p.objeto.parcelamento;
    return `<section class="s-card"><h2>Que tipo de contratação é?</h2><div class="opcoes">${tipos}</div></section>
      <section class="s-card">${campo('Resuma em uma frase o que será comprado ou contratado', 'proc.objeto.resumo', { req: true, rev: 'resumo' })}
        ${ajuda('Comece com "Aquisição de…" para compras ou "Contratação de…" para serviços.', 'Aquisição de material de limpeza para as escolas municipais.')}</section>
      <section class="s-card"><h2>Itens</h2>
        ${ajuda('Descreva cada item pelas características que importam: tamanho, material, capacidade. Não cite marca: isso restringe a concorrência e o Tribunal de Contas aponta.', 'Detergente líquido neutro, biodegradável, frasco de 500 ml.')}
        ${itens}<datalist id="unidades">${UNIDADES.map(u => `<option value="${u}">`).join('')}</datalist>
        <div class="btns"><button class="btn" data-act="add-item">+ Adicionar outro item</button></div></section>
      ${nat !== 'compra' ? `<section class="s-card"><h2>Como o serviço será pago?</h2>${opcoesRadio('proc.objeto.regime', [['preco_unitario', 'Pelo que for medido', 'Preço por metro, m², hora… Paga só o que foi executado (preço unitário)'], ['preco_global', 'Preço fechado', 'Um valor total para o serviço inteiro (preço global)']], 'duas')}</section>` : ''}
      ${p.itens.length > 1 ? `<section class="s-card"><h2>Como os itens serão disputados?</h2>
        <div class="opcoes tres">
          <label class="opcao${parc === 'itens' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="itens"${parc === 'itens' ? ' checked' : ''}><span><b>Por item</b><small>Cada item pode ficar com uma empresa diferente</small></span></label>
          <label class="opcao${parc === 'lotes' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="lotes"${parc === 'lotes' ? ' checked' : ''}><span><b>Por lote</b><small>Itens agrupados; cada lote tem o seu vencedor</small></span></label>
          <label class="opcao${parc === 'global' ? ' sel' : ''}"><input type="radio" name="parc" data-act="s-parc" value="global"${parc === 'global' ? ' checked' : ''}><span><b>Tudo junto</b><small>Uma empresa só fornece todos os itens</small></span></label></div>
        ${EXPLICA_LOTES}
        ${parc === 'lotes' ? `<p class="hint"><b>${esc(composicaoLotes(p))}</b> Ajuste o número do lote em cada item, na lista acima.</p>` : ''}
        ${parc !== 'itens' ? campo(parc === 'lotes' ? 'Explique por que agrupar em lotes' : 'Explique por que precisa ser uma empresa só', 'proc.objeto.justParcelamento', { type: 'textarea', req: true, rev: 'justificativa', hint: parc === 'lotes' ? 'Ex.: os itens de cada lote são entregues juntos pelo mesmo tipo de fornecedor, e separá-los encareceria o frete.' : 'Razão técnica ou econômica (art. 40, §3º). "Facilita a gestão" sozinho não basta.' }) : ''}</section>` : ''}`;
  },

  s_detalhe() {
    return `<section class="s-card">${campo('Exigências de qualidade', 'proc.objeto.requisitos', { type: 'textarea', rows: 3, rev: 'texto' })}
        ${ajuda('Normas técnicas, certificados, registros ou licenças que o fornecedor ou o produto precisam ter.', 'Produto com registro na ANVISA; mudas de viveiro inscrito no RENASEM.')}</section>
      <section class="s-card">${campo('Especificações técnicas detalhadas (opcional)', 'proc.objeto.especificacoes', { type: 'textarea', rows: 8, rev: 'texto' })}
        ${ajuda('Escreva um tópico por parágrafo, deixando uma linha em branco entre eles. Comece com um título curto e dois-pontos. Para listas, comece a linha com hífen (-). Cada parágrafo vira um item numerado no documento.', 'Normas Técnicas: O arame deve atender à ABNT NBR 6210.<br><br>Mourões de concreto:<br>- Comprimento total: 3,00 m<br>- Parte enterrada: 0,70 m')}</section>`;
  },

  s_porque() {
    const d = R.proc.demanda;
    return `<section class="s-card">${campo('Qual problema existe hoje?', 'proc.demanda.necessidade', { type: 'textarea', rows: 7, req: true, rev: 'necessidade' })}
      ${ajuda('Responda: o que falta ou não funciona? Quem é afetado? Desde quando? Use números sempre que puder. Se houver motivos diferentes, escreva um por parágrafo, com um título curto: cada um vira um item numerado (3.1, 3.2…). Evite frases genéricas como "para atender às necessidades da Secretaria".', 'Requisitos Legais: O cercamento do aterro é condição da Licença de Operação da CETESB.<br><br>Segurança Escolar: A cerca do CIEM impede o acesso de pessoas estranhas à escola.')}</section>
      <section class="s-card"><h2>Está no Plano de Contratações Anual (PCA)?</h2>${opcoesRadio('proc.demanda.pca', [['sim', 'Sim', 'A compra foi planejada no PCA'], ['nao', 'Não', 'Surgiu depois do PCA'], ['nao_elaborado', 'Não há PCA', 'O Município não elaborou PCA']], 'tres')}
      ${d.pca === 'sim' ? campo('Referência no PCA (opcional)', 'proc.demanda.pcaRef') : ''}
      ${d.pca === 'nao' ? campo('Por que a demanda não pode esperar o próximo PCA?', 'proc.demanda.pcaJust', { type: 'textarea', rows: 3, req: true, rev: 'justificativa' }) + `<div class="btns">${sugerir('proc.demanda.pcaJust', 'pcaJust')}</div>` : ''}</section>
      <section class="s-card">${campo('O que acontece se não comprar ou não contratar?', 'proc.demanda.consequencias', { type: 'textarea', rows: 3, rev: 'consequencias' })}
      ${ajuda('', 'Sem o material, a limpeza diária fica comprometida e as escolas podem ser autuadas pela Vigilância Sanitária.')}</section>`;
  },

  s_quanto() {
    return `<section class="s-card">${campo('Como chegou nas quantidades?', 'proc.objeto.memoriaQtd', { type: 'textarea', rows: 4, req: true, rev: 'memoria' })}
      ${ajuda('Mostre a conta. Pode ser o consumo do ano anterior, o número de locais atendidos, a área a ser coberta.', '6 escolas × 20 frascos por mês × 12 meses = 1.440 frascos de detergente.')}</section>
      <section class="s-card">${campo('Existe outra forma de resolver o problema? (opcional)', 'proc.objeto.alternativas', { type: 'textarea', rev: 'texto' })}
      ${ajuda('Se pensou em alugar em vez de comprar, produzir na própria prefeitura ou receber por doação, conte por que não serve.', '')}</section>
      <section class="s-card"><h2>Vantagens e desvantagens da solução escolhida (opcional)</h2>
      ${ajuda('Uma por linha, começando com hífen (-). Mostra que a escolha foi pensada.', '- Responsabilidade única pelo material e pela instalação<br>- Garantia unificada')}
      <div class="grid2">${campo('Vantagens', 'proc.objeto.vantagens', { type: 'textarea', rows: 4, rev: 'lista' })}${campo('Desvantagens ou riscos', 'proc.objeto.desvantagens', { type: 'textarea', rows: 4, rev: 'lista' })}</div>
      ${campo('Por que esta solução foi a escolhida', 'proc.objeto.justEscolha', { type: 'textarea', rows: 3, rev: 'texto' })}<div class="btns">${sugerir('proc.objeto.justEscolha', 'justEscolha')}</div></section>
      <section class="s-card">${campo('Conclusão', 'proc.objeto.conclusao', { type: 'textarea', req: true, rev: 'conclusao' })}
      <div class="btns">${sugerir('proc.objeto.conclusao', 'conclusao')}</div></section>`;
  },

  s_exig() { return blocoExigencias(true); },

  s_entrega() {
    const p = R.proc, compra = p.objeto.natureza === 'compra';
    return `<section class="s-card"><h2>Onde e quando</h2>
      ${campo(compra ? 'Local de entrega' : 'Local de execução', 'proc.execucao.local', { req: true, ph: 'Almoxarifado central, Rua…' })}
      <div class="grid2">${campo('Prazo para começar (opcional)', 'proc.execucao.prazoInicio', { ph: compra ? '5 dias após o empenho' : '15 dias após a Ordem de Serviço' })}${campo(compra ? 'Prazo de entrega' : 'Prazo de execução', 'proc.execucao.prazo', { req: true, ph: compra ? '10 dias após o pedido' : '6 (seis) meses' })}</div>
      ${campo('É um serviço ou fornecimento que se repete todo mês?', 'proc.objeto.continuo', { type: 'check', rr: 1, hint: 'Ex.: limpeza, coleta, locação mensal. Compras com entrega única e serviços com fim definido não são contínuos.' })}
      ${p.objeto.continuo ? campo('Por quantos meses?', 'proc.objeto.vigenciaMeses', { type: 'number' }) : (compra && p.objeto.entregaImediata ? '' : campo('Vigência do contrato', 'proc.execucao.vigenciaTexto', { ph: '12 (doze) meses' }))}</section>
      <section class="s-card">${campo(compra ? 'Cuidados na entrega (opcional)' : 'Como o serviço deve ser executado (opcional)', 'proc.execucao.metodologia', { type: 'textarea', rows: 5, rev: 'lista' })}
      ${ajuda('Um passo ou cuidado por linha, começando com hífen (-).', compra ? '- Entrega em caminhão coberto<br>- Descarregamento sem arrastar as caixas' : '- Espaçamento máximo entre mourões: 2,5 m<br>- Respeitar a cura do concreto (72 horas) antes de esticar os arames')}</section>
      <section class="s-card"><h2>Conferência e pagamento</h2>
      ${campo('Como será feito o recebimento', 'proc.execucao.recebimento', { type: 'textarea', rev: 'texto' })}<div class="btns">${sugerir('proc.execucao.recebimento', 'recebimento')}</div>
      ${campo('Como será medido', 'proc.execucao.medicao', { type: 'textarea', rows: 3, rev: 'texto' })}<div class="btns">${sugerir('proc.execucao.medicao', 'medicao')}</div>
      <div class="grid2">${campo('Prazo para refazer o que for recusado (dias)', 'proc.execucao.prazoRejeicao', { type: 'number' })}${campo('Prazo de pagamento (dias)', 'proc.execucao.pagamentoDias', { type: 'number' })}</div></section>`;
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
    return `<section class="s-card">${ajuda('Escolha servidores que conheçam o assunto e que não tenham parentesco nem negócio com as empresas. Gestor e fiscal técnico não devem ser a mesma pessoa.', '')}</section>${blocoFiscais(true)}`;
  },

  s_dotacao() {
    return `<section class="s-card"><h2>Dotação orçamentária</h2>${ajuda('Se mais de uma secretaria vai usar o objeto, informe a ficha de cada uma. Elas dividem a despesa.', 'Meio Ambiente: ficha 331 · Educação: ficha 89')}${listaDotacoes()}</section>`;
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
      [has(p.execucao.gestor) && has(p.execucao.fiscal), 'Gestor e fiscal técnico indicados', 's_fiscal'],
      [!has(p.execucao.gestor) || p.execucao.gestor.trim() !== String(p.execucao.fiscal || '').trim(), 'Gestor e fiscal técnico são pessoas diferentes', 's_fiscal'],
      ...(p.demanda.pca === 'nao' ? [[has(p.demanda.pcaJust), 'Justificativa da demanda fora do PCA', 's_porque']] : []),
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

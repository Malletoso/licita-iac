// Testes do motor de enquadramento e da geração das peças — uso: npm test
const { test } = require('node:test');
const assert = require('node:assert/strict');
const docx = require('docx');
const C = require('../src/core.js');

const clone = o => JSON.parse(JSON.stringify(o));
const hip = (a, id) => a.H.find(h => h.id === id);

test('exemplo de compra pequena cai em dispensa por valor (art. 75, II)', () => {
  const cfg = C.cfgPadrao(), p = C.procExemplo();
  const { a, pecas } = C.montarPecas(p, cfg);
  assert.equal(a.escolhida.id, '75-II');
  assert.equal(a.instrumento.tipo, 'substitutivo');
  assert.ok(pecas.some(d => d.id === 'aviso'), 'deve gerar o aviso do art. 75, §3º');
  assert.equal(hip(a, 'CONCORRENCIA').status, 'bloq', 'concorrência é incabível para objeto comum');
});

test('somatório do exercício acima do limite bloqueia a dispensa (fracionamento)', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.situacao.gastoExercicio = 60000;
  const { a, pecas } = C.montarPecas(p, cfg);
  assert.equal(hip(a, '75-II').status, 'bloq');
  assert.equal(a.escolhida.id, 'PREGAO');
  assert.ok(pecas.some(d => d.id === 'edital'));
});

test('pregão é incabível para obra; emergência é sugerida quando marcada', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.objeto.natureza = 'obra';
  p.situacao.emergencia = true; p.situacao.emergData = p.demanda.data;
  const { a } = C.montarPecas(p, cfg);
  assert.equal(hip(a, 'PREGAO').status, 'bloq');
  assert.equal(a.sug.id, '75-VIII');
});

test('emergência com mais de 1 ano é bloqueada', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.situacao.emergencia = true; p.situacao.emergData = '2020-01-01';
  const { a } = C.montarPecas(p, cfg);
  assert.equal(hip(a, '75-VIII').status, 'bloq');
});

test('serviço técnico acima do limite do art. 37, §2º exige técnica e preço', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.objeto.natureza = 'tecnico'; p.itens[0].qtd = 10000;
  const { a } = C.montarPecas(p, cfg);
  assert.ok(a.est > cfg.valores.tecnico);
  assert.ok(hip(a, 'CONCORRENCIA').motivos.some(m => m.includes('art. 37, §2º')));
});

test('registro de preços em contratação direta exige mais de um órgão', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.situacao.srp = true; p.situacao.srpHip = ['I']; p.situacao.gastoConfirmado = true;
  const { a } = C.montarPecas(p, cfg);
  assert.equal(hip(a, '75-II').status, 'alerta');
  assert.equal(a.instrumento.tipo, 'ata');
});

test('limite dobra para consórcio ou agência executiva (art. 75, §2º)', () => {
  const cfg = C.cfgPadrao(); cfg.dobro = true;
  const p = clone(C.procExemplo()); p.situacao.gastoExercicio = 60000;
  const { a } = C.montarPecas(p, cfg);
  assert.notEqual(hip(a, '75-II').status, 'bloq');
});

test('todas as peças viram um .docx válido', async () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.situacao.gastoExercicio = 60000; p.situacao.srp = true; p.situacao.srpHip = ['IV'];
  const { pecas } = C.montarPecas(p, cfg);
  const buf = await docx.Packer.toBuffer(C.paraDocx(docx, pecas, p, cfg));
  assert.ok(buf.length > 10000);
  assert.equal(buf.subarray(0, 2).toString(), 'PK', 'arquivo .docx é um zip');
});

test('modo Secretaria gera só as peças pedidas pela Licitação', async () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  const { pecas } = C.montarPecas(p, cfg, { simples: true });
  assert.deepEqual(pecas.map(d => d.id), ['etp', 'tr', 'precos', 'pedido', 'designacao']);
  const tr = pecas.find(d => d.id === 'tr');
  assert.ok(tr.blocks.some(b => /confirmado pela Secretaria de Licitação/.test(b.text || '')), 'dispensa por valor fica sujeita à confirmação da Licitação');
  const pedido = pecas.find(d => d.id === 'pedido');
  assert.equal(pedido.blocks.filter(b => b.t === 'pb').length, 2, 'uma página por fornecedor');
  const buf = await docx.Packer.toBuffer(C.paraDocx(docx, pecas, p, cfg));
  assert.equal(buf.subarray(0, 2).toString(), 'PK');
});

test('orçamentos por empresa alimentam a pesquisa e somem quando a empresa é removida', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.orcs.push({ id: 'o4', empresa: 'Viveiro D', cnpj: '', data: p.demanda.data });
  C.setValorOrc(p, 'o4', p.itens[1].id, 55);
  C.syncOrcs(p);
  assert.equal(C.estat(p.itens[1]).n, 3);
  p.orcs = p.orcs.filter(o => o.id !== 'o4');
  C.syncOrcs(p);
  assert.equal(C.estat(p.itens[1]).n, 2);
});

test('peças levam o cabeçalho da prefeitura e o brasão ao fundo', async () => {
  const JSZip = require('jszip');
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  const { pecas } = C.montarPecas(p, cfg, { simples: true });
  const zip = await JSZip.loadAsync(await docx.Packer.toBuffer(C.paraDocx(docx, pecas, p, cfg)));
  const cabs = Object.keys(zip.files).filter(f => /word\/header\d+\.xml$/.test(f));
  assert.equal(cabs.length, pecas.length, 'um cabeçalho por peça');
  const xml = await zip.file(cabs[0]).async('string');
  assert.ok(xml.includes('Prefeitura do Município de Iacanga'));
  assert.ok(xml.includes('CNPJ: 46.137.477/0001-14'));
  assert.ok(xml.includes('behindDoc="1"'), 'marca d\'água atrás do texto');
  const semMarca = Object.assign(C.cfgPadrao(), { marcaDagua: false });
  const zip2 = await JSZip.loadAsync(await docx.Packer.toBuffer(C.paraDocx(docx, pecas, p, semMarca)));
  assert.ok(!(await zip2.file(cabs[0]).async('string')).includes('behindDoc="1"'));
});

test('perfil antigo de Iacanga recebe os dados do cabeçalho', () => {
  const antigo = { id: 'm_x', nome: 'Prefeitura Municipal de Iacanga', cidade: 'Iacanga', uf: 'SP', cnpj: '', brasao: '', valores: C.cfgPadrao().valores };
  const c = C.normalizarCfg(antigo);
  assert.equal(c.cnpj, '46.137.477/0001-14');
  assert.equal(c.brasao, 'iacanga');
  assert.equal(C.linhasCabecalho(c).linhas[0].t, 'Estado de São Paulo');
});

test('julgamento por lote agrupa itens, soma subtotais e explica vencedores distintos', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.objeto.parcelamento = 'lotes'; p.objeto.justParcelamento = 'Itens entregues juntos.';
  p.itens.push(clone(p.itens[0])); p.itens[2].desc = 'Muda de ipê-roxo'; p.itens[2].id = 'x3'; p.itens[2].cot.forEach(c => { c.orcId = undefined; });
  p.itens[0].lote = 1; p.itens[1].lote = 2; p.itens[2].lote = 1;
  const L = C.grupoLotes(p);
  assert.deepEqual(L.map(g => [g.lote, g.itens.map(o => o.i + 1)]), [['1', [1, 3]], ['2', [2]]]);
  const { pecas } = C.montarPecas(p, cfg, { simples: true });
  const tr = pecas.find(d => d.id === 'tr');
  assert.ok(tr.blocks.some(b => /vencedor diferente para cada lote/.test(b.text || '')));
  const tab = tr.blocks.find(b => b.t === 'table');
  assert.ok(tab.rows.some(r => /LOTE 1/.test(r[1])));
  const etp = pecas.find(d => d.id === 'etp');
  assert.ok(etp.blocks.some(b => /Lote 1 — itens 1, 3; Lote 2 — item 2/.test(b.text || '')));
  const mapa = pecas.find(d => d.id === 'precos');
  assert.ok(JSON.stringify(mapa).includes('Subtotal — lote 1'));
});

test('exclusividade ME/EPP é avaliada por lote', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.objeto.parcelamento = 'lotes'; p.itens[0].lote = 1; p.itens[1].lote = 1;
  assert.deepEqual(C.exclusivosME(p, cfg), { tipo: 'lotes', lista: ['1'] });
  p.itens[0].qtd = 5000;
  assert.deepEqual(C.exclusivosME(p, cfg).lista, []);
});

const RV = require('../src/revisor.js');

test('revisor corrige erros comuns sem mudar o sentido', () => {
  const r = RV.corrigirTexto('aquisicao de material nescessário para o balcao ,afim de atender  as escolas', { ponto: true });
  assert.equal(r.texto, 'Aquisição de material necessário para o balcão, a fim de atender as escolas.');
  assert.equal(RV.corrigirTexto('Entrega às 11:30, caixas de 1,50 m e site www.iacanga.sp.gov.br').texto, 'Entrega às 11:30, caixas de 1,50 m e site www.iacanga.sp.gov.br', 'horários, decimais e endereços ficam intactos');
});

test('revisor aponta texto genérico e recomenda como escrever', () => {
  const r = RV.revisarTexto('necessidade', 'Para atender as necessidades da secretaria.');
  assert.ok(r.generico);
  assert.ok(r.avisos.some(a => a.nivel === 'recomenda' && /arquivo final/.test(a.msg)));
  const bom = RV.revisarTexto('necessidade', 'As 6 escolas municipais, com 1.250 alunos, estão sem material de limpeza desde agosto, e a Vigilância Sanitária exige higienização diária.');
  assert.ok(!bom.generico);
  assert.ok(RV.revisarTexto('item', 'Detergente marca X').avisos.some(a => /marca/.test(a.msg)));
});

test('peças saem com as correções aplicadas e sem pendência de número no modo Secretaria', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  p.demanda.necessidade = 'falta agua nas escolas ha meses';
  const { pecas } = C.montarPecas(p, cfg, { simples: true });
  const etp = pecas.find(d => d.id === 'etp');
  assert.ok(etp.blocks.some(b => /Falta água nas escolas/.test(b.text || '')));
  assert.ok(!JSON.stringify(pecas).includes('⟦nº do processo⟧'), 'nenhuma peça cobra o número do processo no modo Secretaria');
  assert.equal(p.demanda.necessidade, 'falta agua nas escolas ha meses', 'o texto do usuário não é alterado');
});


test('valor por extenso', () => {
  assert.equal(C.reaisExtenso(340624.88), 'Trezentos e quarenta mil, seiscentos e vinte e quatro reais e oitenta e oito centavos');
  assert.equal(C.reaisExtenso(1500), 'Mil e quinhentos reais');
  assert.equal(C.reaisExtenso(2001.01), 'Dois mil e um reais e um centavo');
  assert.equal(C.reaisExtenso(1000000), 'Um milhão de reais');
  assert.equal(C.reaisExtenso(100), 'Cem reais');
});

test('CPF sai mascarado nas peças', () => {
  assert.equal(C.mascaraCPF('464.358.458-08'), '464.XXX.XXX-08');
  assert.equal(C.mascaraCPF('46435845808'), '464.XXX.XXX-08');
});

test('ETP, TR e Termo seguem a estrutura do modelo de Iacanga', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo());
  Object.assign(p.execucao, { gestor: 'Fulano', gestorCargo: 'Secretário', gestorCpf: '29005735805', fiscal: 'Beltrano', fiscalCargo: 'Diretor', fiscalCpf: '46435845808', fiscalAdm: 'Ciclano', fiscalAdmCargo: 'Agente Administrativo', fiscalAdmCpf: '44416274831' });
  const { pecas } = C.montarPecas(p, cfg, { simples: true });
  const secs = id => pecas.find(d => d.id === id).blocks.filter(b => b.t === 'sec').map(b => b.text);
  assert.equal(secs('etp').length, 15);
  assert.equal(secs('etp')[0], '01 – DA UNIDADE REQUISITANTE');
  assert.equal(secs('etp')[14], '15 – POSICIONAMENTO CONCLUSIVO E ESCOLHA DA SOLUÇÃO');
  assert.equal(secs('tr').length, 10);
  assert.equal(secs('tr')[5], '06 – GESTÃO E FISCALIZAÇÃO');
  const txt = JSON.stringify(pecas);
  assert.ok(txt.includes('464.XXX.XXX-08') && !txt.includes('464.358.458-08'), 'CPF mascarado');
  const termo = pecas.find(d => d.id === 'designacao');
  assert.ok(termo.blocks.some(b => b.text === '3 – DO FISCAL ADMINISTRATIVO'));
  assert.ok(JSON.stringify(termo).includes('Decreto Municipal nº 1.528/2025'));
  const etp = pecas.find(d => d.id === 'etp');
  assert.ok(etp.blocks.some(b => b.t === 'cl' && b.num === '3.1.'), 'necessidade numerada');
  assert.ok(JSON.stringify(etp).includes('(Nove mil, quatrocentos e vinte reais)'), 'valor por extenso');
});

test('texto livre vira cláusulas e marcadores', () => {
  const ps = C.paragrafos('Requisitos Legais: o cercamento é obrigatório.\n\nSegundo parágrafo:\n- marcador um\n- marcador dois');
  assert.equal(ps.length, 2);
  assert.deepEqual(ps[1].bul, ['marcador um', 'marcador dois']);
});

test('serviço de engenharia sem tabela oficial gera alerta do art. 23, §2º', () => {
  const cfg = C.cfgPadrao(), p = clone(C.procExemplo()); p.objeto.natureza = 'eng_comum';
  assert.ok(C.analisar(p, cfg).alertas.some(a => /SINAPI/.test(a.t)));
});

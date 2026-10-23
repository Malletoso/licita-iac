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

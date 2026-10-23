# Licita IAC

Gerador de processos de licitação e contratação direta pela Lei nº 14.133/2021. O usuário preenche a demanda, o objeto, a pesquisa de preços e os fatos relevantes; o motor de regras indica o enquadramento cabível e gera as peças do processo em Word (.docx).

> Ferramenta de apoio à instrução processual. Não substitui o parecer jurídico (art. 53) nem a análise do agente de contratação. Campos sem informação saem destacados em amarelo nos documentos: o app não inventa nomes, números ou justificativas.

## Como usar

Acesse o endereço do GitHub Pages do repositório. No Chrome ou no Edge, use **Instalar app** (ícone na barra de endereço) para abrir em janela própria, com ícone na área de trabalho e funcionamento offline.

Os dados ficam salvos **no navegador do computador em uso**. Limpar os dados do navegador apaga os processos. Use **Exportar dados do processo (.json)** para guardar cópias e **Importar** para levá-las a outro computador.

## Dois modos

- **Secretaria** (padrão): passo a passo em linguagem simples para as secretarias requisitantes. Gera só o que a Licitação pede: ETP, termo de referência, mapa de orçamentos, pedido de orçamento (uma folha por empresa) e termo de responsabilidade com a indicação de gestor e fiscal. No fim, o pedido é exportado em .json para a Licitação abrir no app.
- **Licitações**: o processo completo descrito abaixo, com motor de enquadramento e todas as peças.

## Etapas do modo Licitações

| Etapa | O que define |
|---|---|
| Município | órgão, autoridades, regulamento adotado, valores-limite do ano |
| Demanda | unidade requisitante, necessidade, PCA |
| Objeto e itens | natureza do objeto, itens, elementos do ETP (art. 18, §1º) |
| Pesquisa de preços | cotações por parâmetro do art. 23, estatísticas, preço de referência |
| Situação de fato | somatório do exercício, hipóteses dos arts. 74 e 75, registro de preços |
| Enquadramento | hipóteses cabíveis, ressalvas e bloqueios, escolha justificada |
| Fornecedor ou disputa | contratado e habilitação (direta) ou regras da disputa (licitação) |
| Execução e gestão | prazos, recebimento, instrumento (art. 95), gestor e fiscal |
| Riscos | mapa de riscos por fase |
| Orçamento | dotação |
| Documentos | peças em .docx, individualmente ou o processo completo |

## Identidade visual

Todas as peças saem com o cabeçalho da Prefeitura (brasão, nome sublinhado, endereço, telefone e CNPJ) e o brasão esmaecido a 10% ao fundo de cada página. Os dados vêm do perfil do órgão, na etapa Município; outro município pode enviar o próprio brasão e desligar a marca d'água.

As imagens originais ficam em `static/originais/`. Depois de trocá-las, rode `python3 scripts/make_assets.py` (requer Pillow) para regerar ícones, `static/brand/` e `src/assets.js`.

## Peças geradas

DFD, ETP, mapa de riscos, termo de referência, relatório de pesquisa de preços, reserva e disponibilidade orçamentária, justificativa de dispensa ou inexigibilidade, aviso de contratação direta (art. 75, §3º), minuta de edital, minuta de contrato ou de ata de registro de preços, designação de gestor e fiscal, termo de ciência e notificação do TCESP (UF = SP), encaminhamento à assessoria jurídica e autorização da autoridade competente com extrato.

## Cobertura do motor de regras

- Dispensa: art. 75, I, II, III, IV "e" e "j", VIII, IX, XI, XIV e XV, com controle do somatório do exercício (§1º), limite em dobro (§2º) e manutenção de veículos (§7º). Demais hipóteses entram como "outra hipótese", para conferência manual.
- Inexigibilidade: art. 74, I a V.
- Licitação: pregão, concorrência, leilão, concurso e diálogo competitivo; prazos do art. 55; art. 37, §2º; exclusividade ME/EPP (LC nº 123/2006, art. 48, I).
- Valores de 2026 conforme o Decreto nº 12.807/2025, editáveis na etapa Município.

Obras e serviços de engenharia são enquadrados, mas o projeto básico, o orçamento de referência (SINAPI, CDHU etc.) e o BDI continuam sendo peças técnicas próprias, com ART.

## Desenvolvimento

Requer Node.js 20 ou superior.

```bash
npm ci          # instala a biblioteca docx
npm test        # testa o motor de regras e a geração do .docx
npm start       # gera web/ e abre em http://localhost:8080
npm run build   # gera web/ (site) e dist/licita-iac-artifact.html (arquivo único)
```

Estrutura:

```
src/core.js       motor de regras, textos das peças e conversão para .docx (sem DOM)
src/ui.js         interface do modo Licitações e partes comuns
src/simples.js    passo a passo do modo Secretaria
src/shell.html    marcação e estilos
src/assets.js     logo, brasão e marca d'água em data URI (gerado)
scripts/build.mjs monta o site (PWA) e o arquivo único
test/             testes do motor (node:test)
static/icons/     ícones do app (gerados)
static/originais/ imagens originais: logo, brasão, cabeçalho de referência
```

Cada push na branch `main` roda os testes e publica a pasta `web/` no GitHub Pages (`.github/workflows/pages.yml`).

## Licença

Todos os direitos reservados — VM Ambiental - Consultoria Ambiental e Engenharia. Ver `LICENSE`.

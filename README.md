# SIGLoSUS — Sistema Inteligente de Gestão Logística e Distribuição de Medicamentos do SUS

> *"Logística que salva vidas."*

Projeto de Engenharia de Software (UFAM/ICET) que propõe um sistema para **reduzir a falta de medicamentos nas farmácias do SUS**.

## O problema

A falta de medicamentos nas unidades de saúde do SUS decorre, em grande parte, de:

- ausência de uma **visão consolidada de estoque** entre as unidades;
- **processos manuais e descentralizados**;
- dificuldade de **prever a demanda**;
- **rotas de distribuição ineficientes**.

## A proposta

O SIGLoSUS **integra-se aos sistemas já existentes** (e-SUS APS, HÓRUS/SNA, BNAFAR) para dar visão em tempo real do estoque e, a partir dela, **agir de forma proativa**: prever demanda, alertar sobre risco de desabastecimento, sugerir transferências entre unidades e **gerar rotas de distribuição otimizadas** — para que o medicamento chegue mais rápido e onde é necessário.

O objetivo não é apenas uma gestão de estoque eficiente: é **salvar vidas**.

## Organização do repositório

O trabalho está organizado por partes (entregas). Cada parte fica em sua própria pasta.

```
SIGLoSUS---Engenharia-de-Software/
├── README.md
├── LICENSE
└── pasta 01/                              # Parte 1 do trabalho
    ├── SIGLoSUS_Parte1_ABNT.docx          # Documento único para entrega (normas ABNT)
    ├── Projeto_SUSLog.md                  # Escopo inicial do projeto
    ├── Relatorio_Final_SIGLoSUS.html
    └── SIGLoSUS/
        ├── docs/
        │   ├── Documentacao_SIGLoSUS.docx   # Parte 1 – itens 1 a 3.5
        │   ├── Documentacao_SIGLoSUS.md
        │   ├── Documentacao_SIGLoSUS.html
        │   ├── Relatorio_Final_SIGLoSUS.docx
        │   └── Relatorio_Final_SIGLoSUS.md
        ├── diagramas/
        │   ├── gerar-casos-de-uso.js        # gerador do diagrama de casos de uso (UML clássico)
        │   ├── 02-seq-autenticar.mmd
        │   ├── 03-seq-sincronizar.mmd
        │   ├── 04-seq-transferencia.mmd
        │   ├── 05-seq-rota.mmd
        │   ├── 06-atv-monitoramento.mmd
        │   ├── 07-atv-rota.mmd
        │   ├── 08-atv-autenticacao.mmd
        │   └── 09-classes.mmd
        └── imagens/                         # Diagramas renderizados (SVG e PNG)
            ├── 01-casos-de-uso.svg / .png
            ├── ...
            └── 09-classes.svg / .png
```

## Conteúdo da documentação (Parte 1)

1. **Introdução** — 1.1 Descrição Geral do Sistema · 1.2 Descrição dos Usuários
2. **Requisitos Gerais do Sistema** — 2.1 Requisitos Funcionais (22) · 2.2 Requisitos Não-Funcionais (13) · 2.3 Regras de Negócio (9)
3. **Diagramas UML** — 3.1 Casos de Uso · 3.2 Especificação dos Casos de Uso (7) · 3.3 Sequência (4) · 3.4 Atividades (3) · 3.5 Classes

## Como visualizar os diagramas

- **Markdown:** abra `pasta 01/SIGLoSUS/docs/Documentacao_SIGLoSUS.md` no VS Code (extensão Markdown Preview Mermaid) ou no GitHub.
- **HTML:** abra `pasta 01/SIGLoSUS/docs/Documentacao_SIGLoSUS.html` no navegador (os diagramas são renderizados via Mermaid) e use *Imprimir → Salvar como PDF*.
- **Imagens:** as figuras já estão prontas em `pasta 01/SIGLoSUS/imagens/` (`.png` e `.svg`).
- **Editar diagramas:** altere os arquivos `.mmd` e renderize com o [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) (`mmdc -i arquivo.mmd -o arquivo.png`).
- **Diagrama de casos de uso:** por usar notação UML clássica (bonecos palito, elipses, `<<include>>`/`<<extend>>`), é gerado pelo script `pasta 01/SIGLoSUS/diagramas/gerar-casos-de-uso.js`.

## Documentos de referência utilizados

- *Modelo de Projeto – Padrão ISO* (template da disciplina) — estrutura seguida.
- *Técnicas de Identificação e Escrita de Requisitos* — padronização de RF, RNF e RN.
- *Sintaxe de Caso de Uso* — convenções de atores, casos de uso, `<<include>>` e `<<extend>>`.
- *Revisão de Programação Orientada a Objetos* — base para o diagrama de classes.

## Entrega

O **arquivo final a ser enviado** é `pasta 01/SIGLoSUS_Parte1_ABNT.docx` (itens 1 a 3.5, em normas ABNT). O `pasta 01/SIGLoSUS/docs/Relatorio_Final_SIGLoSUS.docx` é o relatório geral com todo o trabalho realizado.

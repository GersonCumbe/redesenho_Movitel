# Redesenho do website da Movitel (secção de Pacotes)

Disciplina: Tecnologias Web

## Estrutura
- index.html     -> estrutura (HTML semântico)
- css/style.css  -> estilo responsivo (Grid, Flexbox, media queries, tema escuro)
- js/app.js      -> lógica (pesquisa, ordenação, adicionar, remover, comparar, localStorage)

## Como testar no computador
Abra o ficheiro index.html no navegador. Não precisa de instalar nada.

## Como publicar na Vercel
1. Crie uma conta em vercel.com.
2. Carregue esta pasta (via GitHub ou "Add New > Project" > carregar pasta).
3. Copie o link público e coloque-o no relatório.

## O que deve completar antes de entregar
1. Em js/app.js, troque PACOTES_INICIAIS pelos pacotes e preços reais do site da Movitel.
2. No relatório, descreva os problemas do site original (navegação, pesquisa, telemóvel, velocidade).
   Use a tabela "O que melhorou" do index.html como guia.
3. Meça o site original e o redesenho (ex.: PageSpeed Insights) e ponha os números no relatório.
4. Grave o vídeo (máx. 5 min) e coloque-o, com o código, no Google Drive público.

## Requisitos do trabalho e onde estão
- Adicionar item: formulário "Adicionar um pacote" (validação em js/app.js, aoSubmeter)
- Remover item: botão "Remover" com confirmação (removerPacote)
- Pesquisa eficiente: índice de texto + vários termos + atraso de 250 ms (construirIndice, filtrarPacotes)
- Ordenação: Merge Sort O(n log n) por preço, nome, data e validade (ordenarPorFusao)
- localStorage: pacotes, comparação e tema (lerArmazenamento, gravarArmazenamento)
- Responsividade: Grid + Flexbox + media queries (css/style.css, secção 7)
- Acessibilidade: HTML semântico, rótulos, foco visível, aria-live, reduced-motion
- Performance: métricas no rodapé (carregamento, última pesquisa, interacções)

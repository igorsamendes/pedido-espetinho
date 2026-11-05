# Churrasco da Galera 🍢

Página estática, com visual propositalmente arcaico, para anotar quantos espetinhos cada pessoa quer. O placar mostra o total por pessoa e por sabor. Os pedidos são gravados na [planilha do grupo](https://docs.google.com/spreadsheets/d/178cuFed-Cvpwn1CVwZ59hO6NN3uv1MBqxzieRfXC-HE/edit?usp=sharing), na aba **Pedidos**.

## Ligar a planilha (uma vez)

É preciso ter permissão de **edição** na planilha. O link público sozinho não autoriza um site a gravar nela.

São duas URLs diferentes, e a página precisa da segunda:

- a **da planilha** (`docs.google.com/spreadsheets/...`), que só serve para abrir o arquivo;
- a **do aplicativo da Web** do Apps Script (`script.google.com/macros/s/.../exec`), a única capaz de gravar os pedidos. É ela que vai em `public/config.js`.

Enquanto `window.APP_SCRIPT_URL` estiver vazia — ou com a URL errada — a página mostra o aviso "A planilha ainda não está conectada" e diz na própria tela o que falta corrigir.

1. Abra a planilha com uma conta que possa editá-la.
2. Vá em **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo arquivo [google-apps-script/Code.gs](google-apps-script/Code.gs) deste projeto e salve.
4. Volte para a planilha e **recarregue a página**. Vai aparecer o menu **🍢 Churrasco**.
5. Clique em **🍢 Churrasco → Configurar planilha** e autorize o script quando o Google pedir. Isso monta as abas `Pedidos` e `Resumo` (detalhes abaixo).
6. De volta ao Apps Script, clique em **Implantar → Nova implantação → Aplicativo da Web**.
7. Em **Executar como**, escolha **Eu**. Em **Quem pode acessar**, escolha **Qualquer pessoa**.
8. Copie a URL terminada em `/exec` e cole em [public/config.js](public/config.js), entre as aspas de `window.APP_SCRIPT_URL`.
9. Envie a nova versão de `public/config.js` ao GitHub. A Vercel fará o deploy novamente.

## Como a planilha fica

**Configurar planilha** pode rodar quantas vezes você quiser: ela nunca apaga pedido já registrado. O que ela faz:

- Define o idioma como português e o fuso como `America/Sao_Paulo`, para as datas saírem certas.
- Monta a aba **Pedidos**, onde cada sabor vira uma linha: data e hora, ID do pedido, pessoa, ID do sabor, sabor e quantidade. Cabeçalho fixo, filtro ligado, colunas no tamanho certo e a data formatada como `dd/mm/aaaa hh:mm`. O ID do pedido evita gravar o mesmo envio duas vezes.
- Monta a aba **Resumo**, que se atualiza sozinha por fórmula conforme os pedidos chegam: total de espetos, quantas pessoas pediram, quantos sabores diferentes saíram, horário do último pedido, e duas tabelas — **por pessoa** e **por sabor**, já ordenadas do maior para o menor.
- Remove a aba vazia que o Google cria por padrão (`Página1`).

O menu tem também **Limpar pedidos**, que zera a aba `Pedidos` mantendo o cabeçalho — útil para reusar a mesma planilha no próximo churrasco.

Como o app é público, qualquer visitante que abrir o link pode ver os nomes e pedidos; a planilha também foi fornecida como pública.

## Publicar na Vercel

1. O repositório já está em [github.com/igorsamendes/pedido-espetinho](https://github.com/igorsamendes/pedido-espetinho).
2. Na Vercel, use **Add New → Project → Import Git Repository**.
3. Selecione o repositório. Escolha **Other** como framework; deixe Build Command vazio e Output Directory como `public` (ou mantenha o padrão, que procura `public`).
4. Faça o deploy. O site não precisa de Node nem de variáveis de ambiente.

## Rodar localmente

Na pasta do projeto, execute `npx serve public` ou qualquer servidor estático apontando para `public`. Abrir `index.html` diretamente como arquivo pode bloquear o módulo JavaScript no navegador.

Os testes rodam com `npm test` (Node 18+, sem dependências). Eles cobrem o cardápio, a agregação do placar e o script da planilha — inclusive a montagem das abas e a proteção contra envio duplicado.

## Observações

- Sabores transcritos da tabela da Filé Mania enviada pelo grupo, de agosto de 2026. A seção “Diversos” ficou de fora porque não contém espetinhos.
- A imagem do churrasco foi gerada para esta página. Prompt: “Photorealistic-natural website header photograph, humorous affectionate depiction of a modest Brazilian backyard barbecue ('churrasco de pobre'): improvised small brick barbecue, simple metal grill with several beef and chicken skewers, plastic chairs, concrete wall, warm late afternoon light, casual family gathering mood, no visible faces, no brand logos, no text.” Ferramenta: ImageGen integrada.

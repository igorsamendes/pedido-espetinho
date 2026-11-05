# Churrasco da Galera 🍢

Página estática, com visual propositalmente arcaico, para anotar quantos espetinhos cada pessoa quer. O placar mostra o total por pessoa e por sabor. Os pedidos são gravados na [planilha do grupo](https://docs.google.com/spreadsheets/d/178cuFed-Cvpwn1CVwZ59hO6NN3uv1MBqxzieRfXC-HE/edit?usp=sharing), na aba **Pedidos**.

## Ligar a planilha (uma vez)

É preciso ter permissão de **edição** na planilha. O link público sozinho não autoriza um site a gravar nela.

1. Abra a planilha com uma conta que possa editá-la.
2. Vá em **Extensões → Apps Script**.
3. Substitua o conteúdo de `Code.gs` pelo arquivo [google-apps-script/Code.gs](google-apps-script/Code.gs) deste projeto e salve.
4. Clique em **Implantar → Nova implantação → Aplicativo da Web**.
5. Em **Executar como**, escolha **Eu**. Em **Quem pode acessar**, escolha **Qualquer pessoa**. Autorize o script quando o Google pedir.
6. Copie a URL terminada em `/exec` e cole em [public/config.js](public/config.js), entre as aspas de `window.APP_SCRIPT_URL`.
7. Envie a nova versão de `public/config.js` ao GitHub. A Vercel fará o deploy novamente.

O script cria a aba `Pedidos` automaticamente no primeiro acesso. Cada sabor vira uma linha com data, ID do pedido, pessoa, sabor e quantidade. O ID evita duplicar o mesmo envio. Como o app é público, qualquer visitante que abrir o link pode ver os nomes e pedidos; a planilha também foi fornecida como pública.

## Publicar na Vercel

1. Crie um repositório no seu GitHub e envie esta pasta.
2. Na Vercel, use **Add New → Project → Import Git Repository**.
3. Selecione o repositório. Escolha **Other** como framework; deixe Build Command vazio e Output Directory como `public` (ou mantenha o padrão, que procura `public`).
4. Faça o deploy. O site não precisa de Node nem de variáveis de ambiente.

## Rodar localmente

Na pasta do projeto, execute `npx serve public` ou qualquer servidor estático apontando para `public`. Abrir `index.html` diretamente como arquivo pode bloquear o módulo JavaScript no navegador.

## Observações

- Sabores transcritos da tabela da Filé Mania enviada pelo grupo, de agosto de 2026. A seção “Diversos” ficou de fora porque não contém espetinhos.
- A imagem do churrasco foi gerada para esta página. Prompt: “Photorealistic-natural website header photograph, humorous affectionate depiction of a modest Brazilian backyard barbecue ('churrasco de pobre'): improvised small brick barbecue, simple metal grill with several beef and chicken skewers, plastic chairs, concrete wall, warm late afternoon light, casual family gathering mood, no visible faces, no brand logos, no text.” Ferramenta: ImageGen integrada.

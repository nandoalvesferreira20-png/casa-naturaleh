# 🌿 Casa Naturaleh

### E-commerce de produtos naturais desenvolvido com Next.js, TypeScript e integrações de serviços reais.

A **Casa Naturaleh** é uma aplicação de comércio eletrônico desenvolvida para digitalizar a experiência de compra de uma loja de produtos naturais.

O projeto reúne catálogo dinâmico, autenticação de usuários, gerenciamento de pedidos, checkout, pagamentos via Pix e administração de produtos em uma interface responsiva.

Mais do que uma loja virtual, é um projeto de desenvolvimento full-stack que envolve integrações entre frontend, backend, banco de dados e serviços externos.

---

## 🎯 Objetivo do projeto

Desenvolver uma plataforma que permita aos clientes conhecer os produtos da Casa Naturaleh, navegar pelo catálogo e realizar pedidos online de maneira prática.

Os principais desafios incluem:

- Organizar e apresentar um catálogo de produtos dinâmico.
- Criar uma experiência de navegação responsiva.
- Integrar autenticação e persistência de dados.
- Implementar um fluxo de pedidos com validações no servidor.
- Oferecer pagamento por Pix sem depender de um gateway na primeira versão.
- Integrar funcionalidades de administração e controle de estoque.

---

## 🛠️ Stack tecnológica

**Frontend**
- Next.js 16 — App Router
- React 19
- TypeScript
- Tailwind CSS 4
- CSS

**Backend e dados**
- Next.js Route Handlers
- Supabase — PostgreSQL e catálogo de produtos
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK

**Integrações**
- Geoapify — geocodificação de endereços
- ViaCEP — preenchimento de endereços
- Pix — geração de código de pagamento e QR Code
- SheetJS — processamento de planilhas de produtos

**Ferramentas**
- Git e GitHub
- ESLint
- Node.js
- Vercel

---

## ✨ Funcionalidades

### 🛍️ Catálogo de produtos

- Listagem dinâmica de produtos cadastrados.
- Organização por categorias.
- Pesquisa e filtros.
- Páginas individuais de produtos.
- Exibição de preço e disponibilidade.
- Integração com o banco de dados Supabase.

### 🛒 Carrinho de compras

- Adição e remoção de produtos.
- Atualização de quantidades.
- Cálculo de subtotal.
- Persistência do estado do carrinho.
- Integração com o fluxo de checkout.

### 👤 Área do cliente

- Cadastro e autenticação de usuários.
- Login e recuperação de senha.
- Área de conta.
- Consulta de pedidos.
- Fluxo de confirmação de compra.

### 💳 Checkout e Pix

- Validação de produtos e valores no servidor.
- Criação de pedidos autenticados.
- Geração de código Pix Copia e Cola.
- Exibição de QR Code.
- Referência de pagamento associada ao pedido.
- Confirmação manual de recebimento pelo administrador.

**Importante:** a versão documentada utiliza Pix manual, sem aprovação bancária automática. A arquitetura de integração com gateway de pagamento está preservada para evolução futura.

### 🚚 Entrega e retirada

- Preenchimento de endereços com ViaCEP.
- Geocodificação por meio da API Geoapify.
- Cálculo de distância para validação de entrega.
- Aplicação de regras de frete.
- Opção de retirada na loja.

### 📦 Administração e estoque

- Área administrativa.
- Gestão de informações de produtos.
- Importação de produtos por planilhas.
- Validação de campos e dados importados.
- Tratamento de estoque por unidade e peso.
- Gerenciamento e acompanhamento de pedidos.

---

## 📸 Demonstração visual

> Adicionar capturas de tela reais do projeto nesta seção.

### Página inicial

![Página inicial da Casa Naturaleh](docs/screenshots/home.png)

### Catálogo de produtos

![Catálogo de produtos](docs/screenshots/loja.png)

### Carrinho e checkout

![Carrinho e checkout](docs/screenshots/checkout.png)

### Painel administrativo

![Painel administrativo](docs/screenshots/admin.png)

**Observação:** os caminhos acima são reservados para as capturas de tela. As imagens precisam ser adicionadas ao repositório para aparecerem no README.

---

## 🏗️ Arquitetura da aplicação

A aplicação utiliza uma arquitetura baseada no Next.js App Router, separando páginas, componentes de interface, estados compartilhados e serviços de integração.

Fluxo simplificado:

```text
                    CLIENTE
                       |
                       v
             Next.js / React
                       |
             +---------+---------+
             |                   |
             v                   v
       Interface Web       API / Servidor
             |                   |
             v           +-------+-------+
       Carrinho e        |       |       |
       Navegação         v       v       v
                       Firebase Supabase Geoapify
                          |       |
                          v       v
                       Pedidos  Produtos
                          |
                          v
                     Pix Manual
```

### Organização principal

```text
casa-naturaleh/
├── app/
│   ├── admin/
│   ├── api/
│   ├── cadastro/
│   ├── carrinho/
│   ├── checkout/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── login/
│   ├── loja/
│   ├── meus-pedidos/
│   ├── minha-conta/
│   ├── nossa-historia/
│   ├── pedido-confirmado/
│   └── produto/
├── docs/
├── public/
├── scripts/
├── tests/
├── package.json
└── README.md
```

---

## 🔐 Validação e segurança

O projeto adota diferentes cuidados para reduzir riscos em operações de compra e gerenciamento de dados:

- Autenticação de requisições relacionadas a pedidos.
- Verificação de identidade com Firebase Admin.
- Revalidação de produtos e preços no servidor.
- Cálculo do valor final sem confiar nos dados enviados pelo navegador.
- Separação entre configurações públicas e credenciais privadas.
- Validação de dados de importação.
- Regras específicas para atualização de pedidos e pagamentos.

Essas medidas integram a arquitetura da aplicação, mas não substituem uma auditoria de segurança antes de operar em produção.

---

## 🧪 Testes

O repositório contém testes automatizados para diferentes regras de negócio, incluindo:

- Persistência do carrinho.
- Consulta e filtragem do catálogo.
- Validação do checkout.
- Regras de entrega.
- Geração e validação de Pix.
- Importação e classificação de produtos.
- Tratamento de estoque.
- Fluxos de pagamento.

Os testes estão organizados no diretório `tests/`.

---

## 🚀 Executando localmente

### Pré-requisitos

- Node.js compatível com Next.js 16.
- npm.
- Git.
- Serviços externos configurados para os recursos que exigem integração.

### 1. Clone o repositório

```bash
git clone https://github.com/nandoalvesferreira20-png/casa-naturaleh.git
cd casa-naturaleh
```

### 2. Instale as dependências

```bash
npm ci
```

### 3. Configure o ambiente

Crie um arquivo `.env.local` com as variáveis exigidas pelos serviços utilizados na aplicação.

As integrações incluem Supabase, Firebase, Pix e Geoapify.

As credenciais devem ser configuradas conforme o ambiente, sem expor chaves privadas no código-fonte.

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse:

http://localhost:3000

### 5. Verificações do projeto

```bash
npm run lint
npm run build
```

A execução completa dos fluxos depende das configurações válidas dos serviços externos.

---

## 🧠 Desafios técnicos e aprendizados

Durante o desenvolvimento, alguns pontos exigiram atenção especial:

**1. Integração de múltiplos serviços**

Construir uma aplicação que combina Next.js, Supabase, Firebase e APIs externas mantendo responsabilidades bem definidas.

**2. Consistência de valores e pedidos**

Garantir que os cálculos de checkout sejam realizados e validados no servidor, evitando depender exclusivamente das informações enviadas pelo cliente.

**3. Tratamento de estoque**

Adaptar a importação de produtos para diferentes unidades comerciais, incluindo quantidades inteiras e pesos fracionários.

**4. Experiência do usuário**

Organizar a navegação entre catálogo, produto, carrinho e checkout em uma interface adaptável a diferentes dispositivos.

**5. Integração de pagamentos**

Implementar um fluxo inicial de Pix manual, mantendo documentada uma arquitetura que possa evoluir para integrações automatizadas.

---

## 📈 Possíveis evoluções

- [ ] Homologar e habilitar integração automatizada com gateway de pagamento.
- [ ] Ampliar a cobertura de testes de integração e ponta a ponta.
- [ ] Melhorar a observabilidade de erros e operações.
- [ ] Implementar indicadores operacionais para acompanhamento de vendas.
- [ ] Ampliar otimizações de desempenho e acessibilidade.

---

## 👨‍💻 Desenvolvedor

**Fernando Ferreira Alves**

Estudante de Engenharia de Software, com foco em desenvolvimento de aplicações, dados, automações e inteligência artificial.

Este projeto integra meu portfólio de soluções desenvolvidas para problemas reais de negócio.

[GitHub](https://github.com/nandoalvesferreira20-png) · [Instagram profissional](https://www.instagram.com/fernandev.tech/) · [Loung Tech](https://loung-tech.vercel.app/)

---

<p align="center">
  Desenvolvido com foco em experiência do usuário, organização de código e resolução de problemas reais.
</p>

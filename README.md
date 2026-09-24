# Manutenção Predial — UERN

Sistema Integrado de Gestão de Manutenção Predial da **Universidade do Estado do Rio Grande do Norte (UERN)**, desenvolvido para a **Pró-Reitoria de Administração (PROAD)**.

Construído em **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Prisma ORM** e banco de dados **Neon PostgreSQL Serverless**, seguindo o mesmo padrão arquitetural e identidade visual do **SGCT-UERN**.

---

## 🚀 Tecnologias

- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com paleta institucional UERN
- **Ícones:** [Lucide React](https://lucide.dev/)
- **ORM:** [Prisma](https://www.prisma.io/)
- **Banco de Dados:** [Neon PostgreSQL](https://neon.tech/) (Serverless com Connection Pooling)
- **Autenticação:** JWT via cookies `HttpOnly` com `jose` e senhas criptografadas com `bcryptjs`
- **Deploy:** [Vercel](https://vercel.com/)

---

## 🏛️ Perfis e Controle de Acesso (RBAC)

1. **ADMIN (PROAD):** Gestão geral de contratos, aditivos, cotas, unidades, usuários, tabelas de referência e relatórios globais.
2. **GESTOR_CONTRATO:** Acompanhamento contratual, autorização por alçadas de valor e controle de cotas orçamentárias.
3. **FISCAL_TECNICO / FISCAL_ADM:** Análise de orçamentos, vistorias técnicas, fiscalização de prazos e pareceres.
4. **FISCAL_SETORIAL:** Gestão de chamados e prioridades específicas do seu campus/unidade.
5. **DEMANDANTE:** Abertura de chamados com upload de fotos comprobatórias, acompanhamento e validação/aceite final do serviço.
6. **EMPRESA:** Visualização da fila atribuída, orçamento detalhado de insumos (SINAPI/tabela de referência), execução e registro de fotos do atendimento.

---

## 🛠️ Configuração e Execução Local

### 1. Clonar o Repositório e Instalar Dependências

```bash
git clone https://github.com/proaduern/manutencao-uern.git
cd manutencao-uern
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
DATABASE_URL="postgresql://neondb_owner:...@ep-orange-hat-b647yg1d-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:...@ep-orange-hat-b647yg1d.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="sua_chave_secreta_jwt_aqui"
```

### 3. Sincronizar o Banco Neon e Popular Dados

```bash
# Criar/atualizar as tabelas no Neon
npx prisma db push

# Popular unidades, categorias, tipos de ambiente e usuário admin inicial
npm run prisma:seed
```

### 4. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## ☁️ Deploy na Vercel

1. Importe o repositório `proaduern/manutencao-uern` no painel da **Vercel**.
2. Configure as seguintes variáveis de ambiente (**Environment Variables**):
   - `DATABASE_URL`: String de conexão Neon **com pooling**.
   - `DIRECT_URL`: String de conexão Neon **sem pooling**.
   - `JWT_SECRET`: Chave secreta aleatória para assinatura dos tokens.
3. O build e deploy serão executados automaticamente.

---

## 📄 Licença e Propriedade

Desenvolvido para a **Universidade do Estado do Rio Grande do Norte (UERN)**. Todos os direitos reservados.
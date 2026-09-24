import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Populando dados iniciais no banco Neon PostgreSQL...');

  // 1. Criar Unidades Principais da UERN
  const campusCentral = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-MOSSORO' },
    update: {},
    create: {
      nome: 'Campus Central - Mossoró',
      sigla: 'CAMPUS-MOSSORO',
      campus: 'Mossoró',
      codigo: '001',
    },
  });

  const campusNatal = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-NATAL' },
    update: {},
    create: {
      nome: 'Complexo Cultural / Campus de Natal',
      sigla: 'CAMPUS-NATAL',
      campus: 'Natal',
      codigo: '002',
    },
  });

  const proad = await prisma.unidade.upsert({
    where: { sigla: 'PROAD' },
    update: {},
    create: {
      nome: 'Pró-Reitoria de Administração - PROAD',
      sigla: 'PROAD',
      campus: 'Mossoró',
      codigo: '010',
    },
  });

  // 2. Criar Usuário Administrador PROAD
  const senhaAdminHash = await bcrypt.hash('uern@2026', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin.manutencao@uern.br' },
    update: {},
    create: {
      nome: 'Administrador PROAD',
      email: 'admin.manutencao@uern.br',
      senhaHash: senhaAdminHash,
      role: Role.ADMIN,
      deveTrocarSenha: false,
      unidadeId: proad.id,
      matricula: '0001-PROAD',
    },
  });

  // 3. Categorias de Serviço de Manutenção Predial
  const categorias = [
    {
      nome: 'Instalações Hidráulicas e Sanitárias',
      tipos: ['Vazamento em tubulação', 'Reparo em caixa d’água', 'Desentupimento de esgoto', 'Troca de torneiras/válvulas'],
    },
    {
      nome: 'Instalações Elétricas e Iluminação',
      tipos: ['Substituição de disjuntor/quadro', 'Troca de lâmpadas/reatores', 'Tomadas e interruptores sem energia', 'Curto-circuito'],
    },
    {
      nome: 'Climatização e Ar Condicionado',
      tipos: ['Manutenção preventiva de ar split', 'Vazamento de água em ar condicionado', 'Recarga de gás refrigerante', 'Reparo elétrico do compressor'],
    },
    {
      nome: 'Alvenaria, Pintura e Cobertura',
      tipos: ['Reparo em infiltrações de teto/telhado', 'Pintura pontual de salas/paredes', 'Reparo em pisos e cerâmicas', 'Conserto de portas e fechaduras'],
    },
  ];

  for (const cat of categorias) {
    const categoria = await prisma.categoriaServico.upsert({
      where: { nome: cat.nome },
      update: {},
      create: { nome: cat.nome },
    });

    for (const tipo of cat.tipos) {
      const existe = await prisma.tipoServico.findFirst({
        where: { nome: tipo, categoriaId: categoria.id },
      });
      if (!existe) {
        await prisma.tipoServico.create({
          data: {
            nome: tipo,
            categoriaId: categoria.id,
            prazoEstimadoHoras: 72,
          },
        });
      }
    }
  }

  // 4. Tipos de Ambiente
  const ambientes = [
    'Sala de Aula',
    'Laboratório',
    'Gabinete de Professor / Coordenação',
    'Sanitário Masculino / Feminino',
    'Auditório / Biblioteca',
    'Área Externa / Pátio',
    'Setor Administrativo',
  ];

  for (const amb of ambientes) {
    await prisma.tipoAmbiente.upsert({
      where: { nome: amb },
      update: {},
      create: { nome: amb },
    });
  }

  // 5. Frases de Urgência (para cálculo de gravidade/alçada)
  const frases = [
    { frase: 'Impede completamente as atividades no local (Risco imediato)', nivel: 1 },
    { frase: 'Prejudica gravemente o funcionamento com risco de agravamento', nivel: 2 },
    { frase: 'Causa transtorno significativo, mas ambiente ainda utilizável', nivel: 3 },
    { frase: 'Problema estético ou de pequena monta, sem risco', nivel: 4 },
  ];

  for (const f of frases) {
    await prisma.fraseUrgencia.upsert({
      where: { frase: f.frase },
      update: {},
      create: { frase: f.frase, nivelSugerido: f.nivel },
    });
  }

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Tabela de "Ocupação Principal" da Receita Federal usada no Carnê-Leão / IRPF.
 *
 * Fonte: Anexo Único da IN RFB nº 1.531/2014, atualizado pela IN RFB nº 2.177/2024
 * (que desdobrou o antigo código 229 em 230/231/232). Descrições seguem a tabela
 * oficial de Ocupação Principal do IRPF.
 *
 * O campo `receitaSaude` marca as 6 ocupações habilitadas ao recibo eletrônico
 * "Receita Saúde" (indicador automático "S" no Carnê-Leão). Demais ocupações
 * lançam o rendimento como trabalho não assalariado (mesmo código R01.001.001)
 * porém com Receita Saúde = "N".
 *
 * NOTA: este módulo é puro (sem dependências de Angular/DOM) para reuso futuro
 * em Kotlin Multiplatform.
 */

export type CodigoOcupacao = string;

export interface Ocupacao {
  codigo: string;
  descricao: string;
  grupo: string;
  /** true para as 6 ocupações da Receita Saúde. */
  receitaSaude: boolean;
}

/** Ocupações habilitadas ao recibo eletrônico Receita Saúde. */
export const RECEITA_SAUDE_CODIGOS = ['225', '226', '230', '231', '232', '255'] as const;
export type OcupacaoReceitaSaude = (typeof RECEITA_SAUDE_CODIGOS)[number];

const RS = new Set<string>(RECEITA_SAUDE_CODIGOS);

/** Tabela bruta agrupada (código, descrição). */
const TABELA: ReadonlyArray<{ grupo: string; itens: ReadonlyArray<[string, string]> }> = [
  {
    grupo: 'Militares',
    itens: [
      ['010', 'Militar da Aeronáutica'],
      ['020', 'Militar do Exército'],
      ['030', 'Militar da Marinha'],
      ['040', 'Policial militar'],
      ['050', 'Bombeiro militar'],
    ],
  },
  {
    grupo: 'Membros superiores e dirigentes do poder público',
    itens: [
      ['101', 'Membro do Poder Executivo (Presidente, Governador, Prefeito e vices)'],
      ['102', 'Membro do Poder Judiciário e de Tribunal de Contas'],
      ['103', 'Membro do Poder Legislativo (Senador, Deputado, Vereador)'],
      ['104', 'Membro do Ministério Público (Procurador e Promotor)'],
      ['105', 'Dirigente superior da administração pública'],
      ['106', 'Diplomata e afins'],
      ['107', 'Servidor das carreiras do Poder Legislativo'],
      ['108', 'Servidor das carreiras do Ministério Público'],
      ['109', 'Servidor das carreiras do Poder Judiciário'],
      ['110', 'Advogado do setor público, Procurador da Fazenda'],
      ['111', 'Servidor das carreiras de auditoria fiscal'],
      ['112', 'Servidor das carreiras do Banco Central, CVM e Susep'],
      ['113', 'Delegado de Polícia e outros servidores das carreiras de polícia'],
      ['114', 'Servidor das carreiras de gestão governamental'],
      ['115', 'Servidor das carreiras de ciência e tecnologia'],
      ['116', 'Servidor das demais carreiras da administração pública'],
      ['117', 'Titular de Cartório'],
      ['118', 'Dirigente ou administrador de partido político'],
    ],
  },
  {
    grupo: 'Dirigentes de empresas e organizações',
    itens: [
      ['120', 'Diretor de empresa industrial, comercial ou de serviços'],
      ['121', 'Diretor-presidente de empresa pública'],
      ['130', 'Gerente ou supervisor de empresa'],
      ['131', 'Gerente ou supervisor de empresa pública'],
      ['140', 'Dirigente de organização não governamental'],
    ],
  },
  {
    grupo: 'Ciências exatas, físicas e engenharia',
    itens: [
      ['211', 'Matemático, estatístico, atuário e afins'],
      ['212', 'Analista de sistemas, desenvolvedor e profissional de informática'],
      ['213', 'Físico, químico, meteorologista, geólogo e afins'],
      ['214', 'Engenheiro, arquiteto e afins'],
      ['215', 'Piloto, comandante, oficial de máquinas e afins'],
    ],
  },
  {
    grupo: 'Ciências biológicas e da saúde',
    itens: [
      ['221', 'Biólogo, biomédico e afins'],
      ['222', 'Agrônomo e afins'],
      ['224', 'Profissional da educação física (exceto professor)'],
      ['225', 'Médico'],
      ['226', 'Odontólogo e afins'],
      ['227', 'Enfermeiro de nível superior, nutricionista, farmacêutico e afins'],
      ['228', 'Veterinário, patologista e zootecnista'],
      ['230', 'Fonoaudiólogo'],
      ['231', 'Fisioterapeuta'],
      ['232', 'Terapeuta ocupacional'],
    ],
  },
  {
    grupo: 'Ciências jurídicas, sociais e humanas',
    itens: [
      ['241', 'Advogado'],
      ['250', 'Sociólogo, cientista político e afins'],
      ['251', 'Antropólogo, arqueólogo e afins'],
      ['252', 'Economista, contador, auditor e afins'],
      ['253', 'Profissional de marketing, publicidade e afins'],
      ['255', 'Psicólogo e psicanalista'],
      ['256', 'Geógrafo'],
      ['257', 'Historiador'],
      ['258', 'Assistente social e economista doméstico'],
      ['259', 'Filósofo'],
    ],
  },
  {
    grupo: 'Letras, artes, comunicação e religião',
    itens: [
      ['261', 'Jornalista, repórter e afins'],
      ['263', 'Religioso (sacerdote, ministro, membro de ordem religiosa)'],
      ['264', 'Tradutor, intérprete e afins'],
      ['265', 'Bibliotecário, arquivista, museólogo e afins'],
      ['266', 'Escritor, crítico e afins'],
      ['271', 'Locutor de rádio e televisão e afins'],
      ['272', 'Ator, diretor de espetáculos e afins'],
      ['273', 'Cantor, compositor e afins'],
      ['274', 'Músico, maestro e afins'],
      ['275', 'Designer industrial, escultor, pintor e afins'],
      ['276', 'Cenógrafo, decorador de interiores e afins'],
      ['277', 'Produtor de espetáculo e afins'],
      ['279', 'Outros profissionais de espetáculos e artes'],
    ],
  },
  {
    grupo: 'Educação',
    itens: [
      ['290', 'Professor de educação infantil'],
      ['291', 'Professor do ensino fundamental'],
      ['292', 'Professor do ensino médio'],
      ['293', 'Professor da educação profissional'],
      ['294', 'Professor do ensino superior'],
      ['295', 'Instrutor e professor de cursos livres'],
      ['296', 'Pedagogo, orientador educacional e afins'],
    ],
  },
  {
    grupo: 'Técnicos das ciências físicas, químicas e engenharia',
    itens: [
      ['311', 'Técnico em ciências físicas e químicas'],
      ['312', 'Técnico em construção civil'],
      ['313', 'Técnico em eletroeletrônica'],
      ['314', 'Técnico em metalmecânica'],
      ['316', 'Técnico em mineralogia e geologia'],
      ['317', 'Técnico em informática'],
      ['318', 'Desenhista técnico e afins'],
      ['319', 'Outros técnicos das ciências físicas e químicas'],
    ],
  },
  {
    grupo: 'Técnicos da saúde',
    itens: [
      ['320', 'Técnico em biologia'],
      ['321', 'Técnico agrícola e afins'],
      ['322', 'Técnico em saúde humana (exceto laboratório)'],
      ['323', 'Técnico em saúde animal'],
      ['324', 'Técnico de laboratório e afins'],
      ['325', 'Técnico em bioquímica e biotecnologia'],
      ['328', 'Técnico em conservação de corpos e afins'],
    ],
  },
  {
    grupo: 'Técnicos de transporte e logística',
    itens: [
      ['341', 'Técnico em navegação aérea e marítima'],
      ['342', 'Técnico em transportes e logística'],
    ],
  },
  {
    grupo: 'Técnicos administrativos e comerciais',
    itens: [
      ['351', 'Técnico administrativo e contábil'],
      ['352', 'Técnico em coordenação fiscal e de inspeção'],
      ['353', 'Agente de bolsa de valores e de serviços financeiros'],
      ['354', 'Agente comercial, representante e corretor'],
      ['355', 'Corretor e administrador de imóveis'],
    ],
  },
  {
    grupo: 'Técnicos culturais, comunicação e esportes',
    itens: [
      ['371', 'Técnico em serviços culturais'],
      ['372', 'Cinegrafista, fotógrafo e afins'],
      ['373', 'Técnico de operação de emissora de rádio e televisão'],
      ['374', 'Técnico em sonorização e cenografia'],
      ['375', 'Decorador, vitrinista e afins'],
      ['376', 'Artista intérprete, modelo e afins'],
      ['377', 'Atleta, desportista e afins'],
    ],
  },
  {
    grupo: 'Outros técnicos de nível médio',
    itens: [['391', 'Outros técnicos de nível médio']],
  },
  {
    grupo: 'Serviços administrativos',
    itens: [
      ['410', 'Escriturário, auxiliar de escritório e afins'],
      ['420', 'Trabalhador de atendimento ao público e caixa'],
    ],
  },
  {
    grupo: 'Serviços diversos',
    itens: [
      ['511', 'Comissário de bordo, guia de turismo e afins'],
      ['512', 'Trabalhador dos serviços domésticos'],
      ['513', 'Trabalhador dos serviços de hotelaria e alimentação'],
      ['514', 'Trabalhador de conservação de edifícios e logradouros'],
      ['515', 'Trabalhador auxiliar dos serviços de saúde'],
      ['516', 'Trabalhador dos serviços de beleza e cuidados pessoais'],
      ['517', 'Trabalhador dos serviços de segurança'],
      ['518', 'Motorista e condutor de transporte de passageiros'],
      ['519', 'Outros trabalhadores dos serviços'],
    ],
  },
  {
    grupo: 'Comércio',
    itens: [['529', 'Vendedor e prestador de serviços do comércio']],
  },
  {
    grupo: 'Setor primário',
    itens: [
      ['610', 'Produtor agropecuário'],
      ['620', 'Trabalhador agropecuário'],
      ['630', 'Pescador, caçador e extrativista florestal'],
      ['640', 'Operador de máquinas agrícolas'],
    ],
  },
  {
    grupo: 'Indústria',
    itens: [
      ['710', 'Trabalhador da mineração e construção civil'],
      ['720', 'Trabalhador da transformação de metais e compósitos'],
      ['730', 'Trabalhador de instalações eletroeletrônicas'],
      ['740', 'Montador de instrumentos de precisão'],
      ['750', 'Joalheiro, vidreiro, ceramista e afins'],
      ['760', 'Trabalhador têxtil, do vestuário e das artes gráficas'],
      ['770', 'Trabalhador da madeira e do mobiliário'],
      ['780', 'Operador de robôs e equipamentos especiais'],
      ['810', 'Trabalhador de processos químicos e petroquímicos'],
      ['820', 'Trabalhador siderúrgico e de materiais de construção'],
      ['830', 'Trabalhador de fabricação de celulose e papel'],
      ['840', 'Trabalhador da produção de alimentos e bebidas'],
      ['860', 'Operador de produção e distribuição de energia'],
      ['870', 'Outros trabalhadores agroindustriais'],
    ],
  },
  {
    grupo: 'Manutenção e reparação',
    itens: [['900', 'Trabalhador de reparação e manutenção']],
  },
  {
    grupo: 'Outras ocupações',
    itens: [['000', 'Outras ocupações não classificadas anteriormente']],
  },
];

export const OCUPACOES_POR_GRUPO: ReadonlyArray<{ grupo: string; itens: Ocupacao[] }> =
  TABELA.map((g) => ({
    grupo: g.grupo,
    itens: g.itens.map(([codigo, descricao]) => ({
      codigo,
      descricao,
      grupo: g.grupo,
      receitaSaude: RS.has(codigo),
    })),
  }));

export const OCUPACOES: ReadonlyArray<Ocupacao> = OCUPACOES_POR_GRUPO.flatMap((g) => g.itens);

/** Apenas as 6 ocupações da Receita Saúde (atalho para públicos específicos). */
export const OCUPACOES_RECEITA_SAUDE: ReadonlyArray<Ocupacao> = OCUPACOES.filter(
  (o) => o.receitaSaude,
);

const POR_CODIGO = new Map<string, Ocupacao>(OCUPACOES.map((o) => [o.codigo, o]));

export function ehReceitaSaude(codigo?: string | null): boolean {
  return !!codigo && RS.has(codigo);
}

export function ocupacaoExiste(codigo?: string | null): boolean {
  return !!codigo && POR_CODIGO.has(codigo);
}

export function descricaoOcupacao(codigo?: string | null): string {
  return (codigo && POR_CODIGO.get(codigo)?.descricao) || codigo || '—';
}

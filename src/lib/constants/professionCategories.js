/**
 * Lista centralizada de todas as categorias de profissões.
 * Usada na Home, no dropdown de busca (SearchFilters) e como fallback
 * quando o banco de dados não retorna resultados.
 *
 * Para adicionar uma nova profissão, basta incluí-la aqui — ela aparecerá
 * automaticamente na Home e no dropdown de busca.
 */

// Gera slug a partir do nome (mesma lógica usada em todo o app)
export function toSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Grupos de serviços com metadados visuais para a Home.
 * Cada grupo contém: title, emoji, color, hoverColor, e services[].
 * O campo `linkTo` é opcional (usado para redirecionar a seção inteira).
 */
import {
  Paintbrush, Wrench, Zap, Droplets, Sparkles, TreePine, HardHat,
  Hammer, Scissors, Truck, Building2, ShoppingBag, Brush, Palette,
  LayoutGrid, Thermometer, Sun, Camera, Waves, Flower2, Bug, Sofa,
  DoorOpen, Frame, Layers, Square, ScrollText, Mountain,
  Package, Shovel, Container, FileText, PenTool,
  ClipboardCheck, Compass, Calculator, Settings, Flame,
  Snowflake, Fan, Trees, Home as HomeIcon,
  Car, PawPrint, PartyPopper, Monitor, GraduationCap
} from "lucide-react";

export const serviceGroups = [
  {
    title: "Construção, Reforma e Estrutura",
    emoji: "🏗️",
    color: "bg-orange-500",
    hoverColor: "hover:bg-orange-50",
    services: [
      { name: "Pedreiro", icon: HardHat, color: "bg-orange-500" },
      { name: "Mestre de Obras", icon: HardHat, color: "bg-violet-500" },
      { name: "Empreiteiro", icon: Building2, color: "bg-orange-600" },
      { name: "Pintor", icon: Paintbrush, color: "bg-rose-500" },
      { name: "Gesso/Drywall", icon: LayoutGrid, color: "bg-slate-600" },
      { name: "Azulejista", icon: Square, color: "bg-slate-700" },
      { name: "Porcelanista", icon: Square, color: "bg-orange-500" },
      { name: "Reboco/Acabamento", icon: Brush, color: "bg-violet-500" },
      { name: "Telhadista", icon: HomeIcon, color: "bg-red-500" },
      { name: "Calheiro", icon: Droplets, color: "bg-blue-500" },
      { name: "Impermeabilização", icon: Droplets, color: "bg-blue-600" },
      { name: "Isolamento", icon: Layers, color: "bg-orange-500" },
      { name: "Fundações", icon: Mountain, color: "bg-slate-600" },
      { name: "Concreto", icon: Package, color: "bg-violet-500" },
      { name: "Pré-moldados", icon: Package, color: "bg-orange-500" },
      { name: "Demolição", icon: Hammer, color: "bg-amber-700" },
      { name: "Reformas Geral", icon: Wrench, color: "bg-amber-700" }
    ]
  },
  {
    title: "Elétrica, Hidráulica e Climatização",
    emoji: "⚡",
    color: "bg-yellow-500",
    hoverColor: "hover:bg-yellow-50",
    services: [
      { name: "Eletricista Residencial", icon: Zap, color: "bg-orange-500" },
      { name: "Eletricista Industrial", icon: Zap, color: "bg-violet-500" },
      { name: "Automação Residencial", icon: Settings, color: "bg-orange-600" },
      { name: "Energia Solar", icon: Sun, color: "bg-yellow-500" },
      { name: "CFTV/Câmeras", icon: Camera, color: "bg-slate-700" },
      { name: "Encanador", icon: Droplets, color: "bg-teal-500" },
      { name: "Bombeiro Hidráulico", icon: Droplets, color: "bg-orange-500" },
      { name: "Gás", icon: Flame, color: "bg-amber-500" },
      { name: "Aquecimento", icon: Thermometer, color: "bg-orange-600" },
      { name: "Ar Condicionado", icon: Snowflake, color: "bg-cyan-500" },
      { name: "Ventilação/Exaustão", icon: Fan, color: "bg-teal-600" },
      { name: "Piscinas", icon: Waves, color: "bg-emerald-500" },
      { name: "Irrigação", icon: Droplets, color: "bg-green-600" },
      { name: "Desentupimento", icon: Wrench, color: "bg-slate-600" }
    ]
  },
  {
    title: "Limpeza, Manutenção e Conservação",
    emoji: "🧹",
    color: "bg-pink-500",
    hoverColor: "hover:bg-pink-50",
    services: [
      { name: "Limpeza Residencial", icon: Sparkles, color: "bg-pink-500" },
      { name: "Limpeza Comercial", icon: Sparkles, color: "bg-violet-500" },
      { name: "Limpeza Pós-obra", icon: Sparkles, color: "bg-rose-500" },
      { name: "Limpeza Fachada", icon: Building2, color: "bg-blue-500" },
      { name: "Limpeza Telhado", icon: HomeIcon, color: "bg-slate-600" },
      { name: "Lavagem Pátio", icon: Droplets, color: "bg-cyan-500" },
      { name: "Limpeza Caixa d'água", icon: Droplets, color: "bg-teal-500" },
      { name: "Dedetização", icon: Bug, color: "bg-red-500" },
      { name: "Controle Pragas", icon: Bug, color: "bg-orange-500" },
      { name: "Jardinagem", icon: Flower2, color: "bg-green-500" },
      { name: "Paisagismo", icon: Trees, color: "bg-emerald-600" },
      { name: "Roçada", icon: Scissors, color: "bg-lime-600" },
      { name: "Poda", icon: Scissors, color: "bg-green-600" },
      { name: "Manutenção Predial", icon: Wrench, color: "bg-slate-700" },
      { name: "Marido Aluguel", icon: Wrench, color: "bg-amber-600" }
    ]
  },
  {
    title: "Madeira, Móveis e Acabamentos",
    emoji: "🪵",
    color: "bg-amber-600",
    hoverColor: "hover:bg-amber-50",
    services: [
      { name: "Marceneiro", icon: Hammer, color: "bg-amber-700" },
      { name: "Carpinteiro", icon: Hammer, color: "bg-orange-600" },
      { name: "Montador Móveis", icon: Sofa, color: "bg-violet-500" },
      { name: "Restauração", icon: Brush, color: "bg-rose-500" },
      { name: "Instalação Portas", icon: DoorOpen, color: "bg-amber-600" },
      { name: "Instalação Janelas", icon: Frame, color: "bg-blue-500" },
      { name: "Vidraçaria", icon: Frame, color: "bg-cyan-500" },
      { name: "Serralheria", icon: Wrench, color: "bg-slate-700" },
      { name: "Alumínio/Esquadrias", icon: Frame, color: "bg-slate-600" },
      { name: "Pisos Laminados", icon: Layers, color: "bg-amber-700" },
      { name: "Pisos Vinílicos", icon: Layers, color: "bg-orange-500" },
      { name: "Rodapés", icon: Layers, color: "bg-violet-500" },
      { name: "Forros", icon: LayoutGrid, color: "bg-teal-500" },
      { name: "Gessó Decorativo", icon: Sparkles, color: "bg-pink-500" },
      { name: "Papel Parede", icon: ScrollText, color: "bg-rose-500" },
      { name: "Persianas", icon: LayoutGrid, color: "bg-blue-600" }
    ]
  },
  {
    title: "Máquinas, Terraplanagem e Logística",
    emoji: "🚚",
    color: "bg-blue-600",
    hoverColor: "hover:bg-blue-50",
    services: [
      { name: "Terraplanagem", icon: Mountain, color: "bg-amber-700" },
      { name: "Escavação", icon: Shovel, color: "bg-orange-600" },
      { name: "Retroescavadeira", icon: Truck, color: "bg-yellow-500" },
      { name: "Caminhão Munck", icon: Truck, color: "bg-blue-600" },
      { name: "Guindaste", icon: Truck, color: "bg-violet-500" },
      { name: "Compactação", icon: Package, color: "bg-slate-600" },
      { name: "Locação Máquinas", icon: Truck, color: "bg-teal-500" },
      { name: "Caçamba", icon: Container, color: "bg-green-600" },
      { name: "Frete", icon: Truck, color: "bg-blue-500" },
      { name: "Mudança", icon: Package, color: "bg-orange-500" },
      { name: "Carreto", icon: Truck, color: "bg-rose-500" },
      { name: "Guincho Pesado", icon: Truck, color: "bg-red-600" }
    ]
  },
  {
    title: "Lojas, Fornecedores e Materiais",
    emoji: "🏪",
    color: "bg-purple-600",
    hoverColor: "hover:bg-purple-50",
    services: [
      { name: "Materiais Construção", icon: ShoppingBag, color: "bg-orange-500" },
      { name: "Areia / Brita", icon: Mountain, color: "bg-amber-600" },
      { name: "Concreto Usinado", icon: Package, color: "bg-slate-600" },
      { name: "Pré-moldados", icon: Package, color: "bg-violet-500" },
      { name: "Madeireira", icon: TreePine, color: "bg-green-600" },
      { name: "Casa de Tintas", icon: Palette, color: "bg-pink-500" },
      { name: "Vidraçaria", icon: Frame, color: "bg-cyan-500" },
      { name: "Serralheria", icon: Wrench, color: "bg-slate-700" },
      { name: "Marmoraria", icon: Square, color: "bg-amber-700" },
      { name: "Elétrica (Loja)", icon: Zap, color: "bg-yellow-500" },
      { name: "Hidráulica (Loja)", icon: Droplets, color: "bg-blue-500" },
      { name: "Ferramentas", icon: Wrench, color: "bg-red-500" },
      { name: "Equipamentos", icon: Settings, color: "bg-teal-600" },
      { name: "Distribuidores", icon: Truck, color: "bg-indigo-500" }
    ]
  },
  {
    title: "Projetos e Engenharia",
    emoji: "📐",
    color: "bg-slate-700",
    hoverColor: "hover:bg-slate-50",
    services: [
      { name: "Arquiteto", icon: PenTool, color: "bg-violet-600" },
      { name: "Engenheiro Civil", icon: Building2, color: "bg-blue-600" },
      { name: "Projetos Elétricos", icon: Zap, color: "bg-yellow-500" },
      { name: "Projetos Hidráulicos", icon: Droplets, color: "bg-cyan-500" },
      { name: "Laudos Técnicos", icon: FileText, color: "bg-slate-600" },
      { name: "Habite-se", icon: ClipboardCheck, color: "bg-green-600" },
      { name: "Regularização Imóveis", icon: FileText, color: "bg-amber-600" },
      { name: "Topografia", icon: Compass, color: "bg-teal-500" },
      { name: "Orçamentos Técnicos", icon: Calculator, color: "bg-orange-500" }
    ]
  },
  {
    title: "Outros Tipos de Serviços",
    emoji: "✨",
    color: "bg-indigo-500",
    hoverColor: "hover:bg-indigo-50",
    linkTo: "OtherServices",
    services: [
      { name: "Mecânico", icon: Car, color: "bg-red-500" },
      { name: "Funilaria/Pintura", icon: Car, color: "bg-blue-600" },
      { name: "Cabeleireiro", icon: Scissors, color: "bg-pink-500" },
      { name: "Manicure", icon: Sparkles, color: "bg-rose-500" },
      { name: "Estética", icon: Sparkles, color: "bg-violet-500" },
      { name: "Pet Shop", icon: PawPrint, color: "bg-amber-500" },
      { name: "Veterinário", icon: PawPrint, color: "bg-green-600" },
      { name: "Fotógrafo", icon: Camera, color: "bg-slate-700" },
      { name: "Buffet/Eventos", icon: PartyPopper, color: "bg-orange-500" },
      { name: "Informática", icon: Monitor, color: "bg-cyan-600" },
      { name: "Aulas Particulares", icon: GraduationCap, color: "bg-indigo-500" },
      { name: "Costureira", icon: Scissors, color: "bg-teal-500" }
    ]
  }
];

/**
 * Versão simplificada (name + slug) para uso no dropdown de busca.
 * Inclui TODOS os grupos, inclusive "Outros Tipos de Serviços".
 */
export const professionGroups = serviceGroups.map(group => ({
  name: group.title,
  items: group.services.map(s => ({ name: s.name, slug: toSlug(s.name) }))
}));

/**
 * Lista plana de todas as profissões com slug.
 * Útil para validações e lookups rápidos.
 */
export const allProfessions = professionGroups.flatMap(g => g.items);

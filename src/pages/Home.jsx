import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProfessionalService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { motion } from "framer-motion";
import { 
  Search, ArrowRight, Paintbrush, Wrench, Zap, 
  Droplets, Sparkles, TreePine, HardHat, Users,
  CheckCircle, Star, ChevronDown
} from "lucide-react";
import ProfessionalCard from "@/componentes/interface do usuário/ProfessionalCard";

const categories = [
  // 🏗️ CONSTRUÇÃO, REFORMA E ESTRUTURA
  { slug: "pedreiro_alvenaria", label: "Pedreiro", icon: HardHat, color: "bg-orange-500", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "mestre_obras", label: "Mestre de Obras", icon: HardHat, color: "bg-orange-600", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "empreiteiro", label: "Empreiteiro", icon: HardHat, color: "bg-orange-700", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "pintura_residencial", label: "Pintor", icon: Paintbrush, color: "bg-blue-500", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "gesso_drywall", label: "Gesso/Drywall", icon: HardHat, color: "bg-slate-500", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "azulejista", label: "Azulejista", icon: HardHat, color: "bg-purple-500", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "porcelanista", label: "Porcelanista", icon: HardHat, color: "bg-purple-600", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "reboco_acabamento", label: "Reboco/Acabamento", icon: HardHat, color: "bg-slate-400", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "telhados", label: "Telhadista", icon: HardHat, color: "bg-red-600", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "calheiro", label: "Calheiro", icon: Droplets, color: "bg-blue-600", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "impermeabilizacao", label: "Impermeabilização", icon: Droplets, color: "bg-blue-800", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "isolamento_termico", label: "Isolamento", icon: HardHat, color: "bg-cyan-700", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "fundacoes", label: "Fundações", icon: HardHat, color: "bg-gray-700", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "concreto", label: "Concreto", icon: HardHat, color: "bg-gray-600", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "pre_moldados", label: "Pré-moldados", icon: HardHat, color: "bg-gray-500", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "demolicao", label: "Demolição", icon: HardHat, color: "bg-red-700", category: "🏗️ Construção, Reforma e Estrutura" },
  { slug: "reformas_geral", label: "Reformas Geral", icon: HardHat, color: "bg-orange-800", category: "🏗️ Construção, Reforma e Estrutura" },
  
  // ⚡ ELÉTRICA, HIDRÁULICA E CLIMATIZAÇÃO
  { slug: "eletricista", label: "Eletricista Residencial", icon: Zap, color: "bg-yellow-500", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "eletricista_industrial", label: "Eletricista Industrial", icon: Zap, color: "bg-yellow-600", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "automacao", label: "Automação Residencial", icon: Zap, color: "bg-purple-600", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "energia_solar", label: "Energia Solar", icon: Zap, color: "bg-yellow-400", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "cameras_seguranca", label: "CFTV/Câmeras", icon: Zap, color: "bg-indigo-700", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "hidraulica", label: "Encanador", icon: Droplets, color: "bg-cyan-500", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "bombeiro_hidraulico", label: "Bombeiro Hidráulico", icon: Droplets, color: "bg-cyan-600", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "gas", label: "Gás", icon: Droplets, color: "bg-orange-500", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "aquecimento", label: "Aquecimento", icon: Zap, color: "bg-red-500", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "ar_condicionado", label: "Ar Condicionado", icon: Zap, color: "bg-blue-400", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "ventilacao", label: "Ventilação/Exaustão", icon: Zap, color: "bg-blue-300", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "piscineiro", label: "Piscinas", icon: Droplets, color: "bg-cyan-600", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "irrigacao", label: "Irrigação", icon: Droplets, color: "bg-green-600", category: "⚡ Elétrica, Hidráulica e Climatização" },
  { slug: "desentupidor", label: "Desentupimento", icon: Droplets, color: "bg-blue-700", category: "⚡ Elétrica, Hidráulica e Climatização" },
  
  // 🧹 LIMPEZA, MANUTENÇÃO E CONSERVAÇÃO
  { slug: "limpeza", label: "Limpeza Residencial", icon: Sparkles, color: "bg-pink-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "limpeza_comercial", label: "Limpeza Comercial", icon: Sparkles, color: "bg-pink-600", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "limpeza_pos_obra", label: "Limpeza Pós-obra", icon: Sparkles, color: "bg-pink-700", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "limpeza_fachada", label: "Limpeza Fachada", icon: Sparkles, color: "bg-blue-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "limpeza_telhado", label: "Limpeza Telhado", icon: Sparkles, color: "bg-red-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "lavagem_patio", label: "Lavagem Pátio", icon: Sparkles, color: "bg-cyan-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "limpeza_reservatorio", label: "Limpeza Caixa d'água", icon: Droplets, color: "bg-cyan-700", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "dedetizacao", label: "Dedetização", icon: Sparkles, color: "bg-red-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "controle_pragas", label: "Controle Pragas", icon: Sparkles, color: "bg-red-600", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "jardinagem", label: "Jardinagem", icon: TreePine, color: "bg-green-500", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "paisagismo", label: "Paisagismo", icon: TreePine, color: "bg-green-600", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "rocada", label: "Roçada", icon: TreePine, color: "bg-green-700", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "poda", label: "Poda", icon: TreePine, color: "bg-green-800", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "manutencao_predial", label: "Manutenção Predial", icon: Wrench, color: "bg-gray-600", category: "🧹 Limpeza, Manutenção e Conservação" },
  { slug: "marido_aluguel", label: "Marido Aluguel", icon: Wrench, color: "bg-teal-600", category: "🧹 Limpeza, Manutenção e Conservação" },
  
  // 🪵 MADEIRA, MÓVEIS E ACABAMENTOS
  { slug: "marceneiro", label: "Marceneiro", icon: Wrench, color: "bg-amber-700", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "carpinteiro", label: "Carpinteiro", icon: Wrench, color: "bg-amber-600", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "montador_moveis", label: "Montador Móveis", icon: Wrench, color: "bg-orange-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "restauracao_moveis", label: "Restauração", icon: Wrench, color: "bg-amber-800", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "instalacao_portas", label: "Instalação Portas", icon: Wrench, color: "bg-amber-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "instalacao_janelas", label: "Instalação Janelas", icon: Wrench, color: "bg-sky-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "vidraceiro", label: "Vidraçaria", icon: Sparkles, color: "bg-sky-400", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "serralheiro", label: "Serralheria", icon: Wrench, color: "bg-gray-700", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "aluminio_esquadrias", label: "Alumínio/Esquadrias", icon: Wrench, color: "bg-slate-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "instalador_pisos", label: "Pisos Laminados", icon: HardHat, color: "bg-amber-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "pisos_vinilicos", label: "Pisos Vinílicos", icon: HardHat, color: "bg-purple-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "rodapes", label: "Rodapés", icon: HardHat, color: "bg-brown-500", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "forros", label: "Forros", icon: HardHat, color: "bg-slate-400", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "gesso_decorativo", label: "Gesso Decorativo", icon: Sparkles, color: "bg-slate-300", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "instalacao_papel_parede", label: "Papel Parede", icon: Paintbrush, color: "bg-purple-400", category: "🪵 Madeira, Móveis e Acabamentos" },
  { slug: "instalacao_persianas", label: "Persianas", icon: Wrench, color: "bg-slate-600", category: "🪵 Madeira, Móveis e Acabamentos" },
  
  // 🚚 MÁQUINAS, TERRAPLANAGEM E LOGÍSTICA
  { slug: "terraplanagem", label: "Terraplanagem", icon: HardHat, color: "bg-yellow-700", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "escavacao", label: "Escavação", icon: HardHat, color: "bg-orange-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "retroescavadeira", label: "Retroescavadeira", icon: HardHat, color: "bg-yellow-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "caminhao_munck", label: "Caminhão Munck", icon: HardHat, color: "bg-orange-900", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "guindaste", label: "Guindaste", icon: HardHat, color: "bg-gray-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "compactacao", label: "Compactação", icon: HardHat, color: "bg-slate-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "locacao_maquinas", label: "Locação Máquinas", icon: HardHat, color: "bg-indigo-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "cacamba", label: "Caçamba", icon: HardHat, color: "bg-green-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "frete", label: "Frete", icon: Wrench, color: "bg-blue-800", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "mudancas", label: "Mudança", icon: Wrench, color: "bg-orange-700", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "carreto", label: "Carreto", icon: Wrench, color: "bg-teal-700", category: "🚚 Máquinas, Terraplanagem e Logística" },
  { slug: "guincho_pesado", label: "Guincho Pesado", icon: Wrench, color: "bg-red-900", category: "🚚 Máquinas, Terraplanagem e Logística" },
  
  // 🏪 FORNECEDORES E MATERIAIS
  { slug: "material_construcao", label: "Material Construção", icon: HardHat, color: "bg-orange-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "areia_brita", label: "Areia/Brita", icon: HardHat, color: "bg-yellow-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "concreto_usinado", label: "Concreto Usinado", icon: HardHat, color: "bg-gray-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "pre_moldados_loja", label: "Pré-moldados", icon: HardHat, color: "bg-slate-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "madeireira", label: "Madeireira", icon: Wrench, color: "bg-amber-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "casa_tintas", label: "Casa de Tintas", icon: Paintbrush, color: "bg-blue-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "vidracaria_loja", label: "Vidraçaria", icon: Sparkles, color: "bg-sky-600", category: "🏪 Fornecedores e Materiais" },
  { slug: "serralheria_loja", label: "Serralheria", icon: Wrench, color: "bg-gray-800", category: "🏪 Fornecedores e Materiais" },
  { slug: "marmoraria", label: "Marmoraria", icon: HardHat, color: "bg-slate-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "eletrica_loja", label: "Elétrica (Loja)", icon: Zap, color: "bg-yellow-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "hidraulica_loja", label: "Hidráulica (Loja)", icon: Droplets, color: "bg-cyan-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "ferramentas", label: "Ferramentas", icon: Wrench, color: "bg-red-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "equipamentos", label: "Equipamentos", icon: HardHat, color: "bg-indigo-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "aluguel_equipamentos", label: "Locação", icon: HardHat, color: "bg-purple-700", category: "🏪 Fornecedores e Materiais" },
  { slug: "distribuidores", label: "Distribuidores", icon: HardHat, color: "bg-green-700", category: "🏪 Fornecedores e Materiais" },
  
  // 📐 PROJETOS E ENGENHARIA
  { slug: "arquiteto", label: "Arquiteto", icon: HardHat, color: "bg-indigo-600", category: "📐 Projetos e Engenharia" },
  { slug: "engenheiro", label: "Engenheiro Civil", icon: HardHat, color: "bg-indigo-700", category: "📐 Projetos e Engenharia" },
  { slug: "projetos_eletricos", label: "Projetos Elétricos", icon: Zap, color: "bg-yellow-700", category: "📐 Projetos e Engenharia" },
  { slug: "projetos_hidraulicos", label: "Projetos Hidráulicos", icon: Droplets, color: "bg-cyan-800", category: "📐 Projetos e Engenharia" },
  { slug: "laudos_tecnicos", label: "Laudos Técnicos", icon: HardHat, color: "bg-slate-700", category: "📐 Projetos e Engenharia" },
  { slug: "habitese", label: "Habite-se", icon: HardHat, color: "bg-green-700", category: "📐 Projetos e Engenharia" },
  { slug: "regularizacao", label: "Regularização", icon: HardHat, color: "bg-blue-700", category: "📐 Projetos e Engenharia" },
  { slug: "topografia", label: "Topografia", icon: HardHat, color: "bg-purple-700", category: "📐 Projetos e Engenharia" },
  { slug: "orcamentos_tecnicos", label: "Orçamentos Técnicos", icon: HardHat, color: "bg-orange-700", category: "📐 Projetos e Engenharia" },
];

export default function Home() {
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['featured-professionals'],
    queryFn: async () => {
      const all = await ProfessionalService.search({
        isApproved: true,
        featured: true,
        limit: 6
      });
      return all || [];
    }
  });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500 rounded-full blur-3xl opacity-20 animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm border border-orange-500/50 rounded-full px-4 py-2 mb-6"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-medium text-sm">Encontre profissionais em segundos</span>
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Encontre o profissional
              <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent"> perfeito </span>
              perto de você
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
              Use sua localização para encontrar pintores, pedreiros, eletricistas e outros profissionais qualificados. Rápido, fácil e confiável. 🚀
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={createPageUrl("RequestQuote")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg px-8 py-7 rounded-xl shadow-xl shadow-orange-500/50">
                    <Search className="w-5 h-5 mr-2" />
                    Solicitar Orçamento
                  </Button>
                </motion.div>
              </Link>
              <Link to={createPageUrl("SearchProfessionals")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-bold text-lg px-8 py-7 rounded-xl shadow-lg">
                    Buscar Profissionais
                  </Button>
                </motion.div>
              </Link>
              <Link to={createPageUrl("Onboarding")}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 border-2 border-white font-bold text-lg px-8 py-7 rounded-xl shadow-lg">
                    Sou Profissional
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-8 mt-12"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-gradient-to-br from-orange-400 to-pink-500" />
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-white font-bold">500+</p>
                  <p className="text-slate-400 text-sm">Profissionais</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Star className="w-10 h-10 text-yellow-400 fill-yellow-400" />
                <div className="text-left">
                  <p className="text-white font-bold">4.8/5</p>
                  <p className="text-slate-400 text-sm">Avaliação</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Quick Category Access */}
      <section className="py-12 bg-white border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Acesso Rápido às Categorias Populares
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-10 gap-3">
            {[
              "pintor", "pedreiro", "gesseiro_drywall", "telhadista", "azulejista", 
              "marmoraria", "impermeabilizacao", "pisos_laminados", "pisos_vinilicos",
              "arquiteto", "engenheiro_civil", "eletricista_residencial", "encanador", 
              "calheiro", "ar_condicionado", "energia_solar", "desentupimento", 
              "piscinas", "limpeza_residencial", "limpeza_fachada"
            ].map(slug => {
              const cat = categories.find(c => c.slug === slug);
              if (!cat) return null;
              return (
                <Link 
                  key={cat.slug}
                  to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                  className="group"
                >
                  <div className="bg-white hover:bg-orange-50 rounded-lg p-3 text-center transition-all duration-200 hover:shadow-md border-2 border-slate-200 hover:border-orange-400">
                    <div className={`w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center mx-auto mb-1 group-hover:scale-110 transition-transform`}>
                      <cat.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 leading-tight">{cat.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      
      {/* Other Services Button */}
      <section className="py-8 bg-gradient-to-r from-purple-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Link to={createPageUrl("OtherServices")}>
            <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 font-bold text-lg px-8 py-6 rounded-xl shadow-xl">
              <Search className="w-5 h-5 mr-2" />
              🔎 Outros Tipos de Serviços
            </Button>
          </Link>
          <p className="text-purple-100 mt-3 text-sm">
            Automotivo • Beleza • Pets • Eventos • Tecnologia e mais
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Serviços de Construção Civil e Reformas
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Profissionais, Empresas e Fornecedores - Tudo para sua obra em um só lugar!
            </p>
          </div>
          
          {/* Grouped Categories - ONLY CONSTRUCTION CATEGORIES */}
          <div className="space-y-8">
            {[
              "🏗️ Construção, Reforma e Estrutura",
              "⚡ Elétrica, Hidráulica e Climatização",
              "🧹 Limpeza, Manutenção e Conservação",
              "🪵 Madeira, Móveis e Acabamentos",
              "🚚 Máquinas, Terraplanagem e Logística",
              "🏪 Fornecedores e Materiais",
              "📐 Projetos e Engenharia"
            ].map(categoryGroup => {
              const groupCategories = categories.filter(cat => cat.category === categoryGroup);
              if (groupCategories.length === 0) return null;

              return (
                <div key={categoryGroup} className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-6 border-2 border-orange-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                    {categoryGroup}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {groupCategories.map((cat) => (
                      <Link 
                        key={cat.slug}
                        to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                        className="group"
                      >
                        <div className="bg-white hover:bg-orange-50 rounded-xl p-4 text-center transition-all duration-300 hover:shadow-xl border-2 border-slate-200 hover:border-orange-400">
                          <div className={`w-14 h-14 ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                            <cat.icon className="w-7 h-7 text-white" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{cat.label}</h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 text-center">
            <Link to={createPageUrl("SearchProfessionals")}>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-6 text-lg rounded-xl">
                <Search className="w-5 h-5 mr-2" />
                Ver Todos os Profissionais
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Featured Professionals */}
      {professionals.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                  Profissionais em Destaque
                </h2>
                <p className="text-slate-600">
                  Conheça alguns dos nossos profissionais mais bem avaliados
                </p>
              </div>
              <Link to={createPageUrl("SearchProfessionals")}>
                <Button variant="outline" className="hidden md:flex items-center gap-2">
                  Ver Todos
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {professionals.map((professional) => (
                <ProfessionalCard key={professional.id} professional={professional} distance={null} />
              ))}
            </div>
            
            <div className="mt-8 text-center md:hidden">
              <Link to={createPageUrl("SearchProfessionals")}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Ver Todos os Profissionais
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
      
      {/* How it Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Encontrar o profissional certo nunca foi tão fácil
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Busque",
                description: "Escolha o tipo de serviço e sua cidade para encontrar profissionais disponíveis."
              },
              {
                step: "02",
                title: "Compare",
                description: "Veja fotos dos trabalhos realizados e encontre o profissional ideal para você."
              },
              {
                step: "03",
                title: "Contrate",
                description: "Entre em contato direto pelo WhatsApp e negocie o serviço."
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA for Professionals */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            É profissional da construção?
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Cadastre-se e mostre seu trabalho para milhares de clientes que buscam profissionais qualificados na sua região.
          </p>
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold text-lg px-8 py-6 rounded-xl">
              Criar Meu Perfil
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Share App Section */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Compartilhe com seus amigos!
            </h2>
            <p className="text-xl text-purple-200 mb-8">
              Ajude outras pessoas a encontrarem os melhores profissionais 🚀
            </p>
            <Button
              size="lg"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'ProObra - Encontre Profissionais',
                    text: 'Encontre os melhores profissionais da construção perto de você!',
                    url: window.location.origin
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('Link copiado! 📋');
                }
              }}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-2xl"
            >
              <Users className="w-5 h-5 mr-2" />
              Compartilhar ProObra
            </Button>
          </motion.div>
        </div>
      </section>

      </div>
      );
      }
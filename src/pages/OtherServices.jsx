import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/componentes/interface do usuário/button";
import { ArrowLeft, Search, Wrench, Zap, Sparkles, Users } from "lucide-react";

const otherServicesCategories = [
  // 🚗 Automotivo
  { slug: "mecanico_auto", label: "Mecânica", icon: Wrench, color: "bg-orange-600", category: "🚗 Automotivo" },
  { slug: "eletricista_auto", label: "Auto Elétrica", icon: Zap, color: "bg-yellow-600", category: "🚗 Automotivo" },
  { slug: "lavagem_automotiva", label: "Lavagem", icon: Sparkles, color: "bg-cyan-500", category: "🚗 Automotivo" },
  { slug: "estetica_automotiva", label: "Polimento", icon: Sparkles, color: "bg-cyan-600", category: "🚗 Automotivo" },
  { slug: "funilaria_pintura", label: "Funilaria", icon: Wrench, color: "bg-slate-700", category: "🚗 Automotivo" },
  { slug: "vidraceiro_auto", label: "Vidraceiro Auto", icon: Sparkles, color: "bg-sky-600", category: "🚗 Automotivo" },
  { slug: "som_automotivo", label: "Som Auto", icon: Zap, color: "bg-purple-700", category: "🚗 Automotivo" },
  { slug: "alinhamento_balanceamento", label: "Alinhamento", icon: Wrench, color: "bg-gray-600", category: "🚗 Automotivo" },
  { slug: "borracheiro", label: "Borracheiro", icon: Wrench, color: "bg-slate-700", category: "🚗 Automotivo" },
  { slug: "troca_oleo", label: "Troca de Óleo", icon: Wrench, color: "bg-amber-600", category: "🚗 Automotivo" },
  { slug: "reboque_guincho", label: "Guincho", icon: Wrench, color: "bg-red-800", category: "🚗 Automotivo" },

  // 💆 Saúde e Beleza
  { slug: "cabeleireiro", label: "Cabeleireiro", icon: Sparkles, color: "bg-pink-400", category: "💆 Saúde e Beleza" },
  { slug: "barbeiro", label: "Barbeiro", icon: Sparkles, color: "bg-slate-600", category: "💆 Saúde e Beleza" },
  { slug: "manicure_pedicure", label: "Manicure", icon: Sparkles, color: "bg-rose-400", category: "💆 Saúde e Beleza" },
  { slug: "estetica_facial", label: "Estética Facial", icon: Sparkles, color: "bg-pink-500", category: "💆 Saúde e Beleza" },
  { slug: "depilacao", label: "Depilação", icon: Sparkles, color: "bg-rose-500", category: "💆 Saúde e Beleza" },
  { slug: "massagem", label: "Massagem", icon: Sparkles, color: "bg-purple-500", category: "💆 Saúde e Beleza" },
  { slug: "personal_trainer", label: "Personal", icon: Users, color: "bg-green-600", category: "💆 Saúde e Beleza" },

  // 🐾 Pets
  { slug: "veterinario", label: "Veterinário", icon: Sparkles, color: "bg-green-600", category: "🐾 Pets" },
  { slug: "pet_grooming", label: "Banho e Tosa", icon: Sparkles, color: "bg-green-400", category: "🐾 Pets" },
  { slug: "passeador_caes", label: "Passeador", icon: Users, color: "bg-teal-500", category: "🐾 Pets" },
  { slug: "adestramento", label: "Adestrador", icon: Users, color: "bg-teal-600", category: "🐾 Pets" },

  // 🎉 Eventos e Mídia
  { slug: "fotografia", label: "Fotografia", icon: Sparkles, color: "bg-indigo-500", category: "🎉 Eventos e Mídia" },
  { slug: "video", label: "Filmagem", icon: Sparkles, color: "bg-purple-700", category: "🎉 Eventos e Mídia" },
  { slug: "dj", label: "DJ", icon: Sparkles, color: "bg-purple-800", category: "🎉 Eventos e Mídia" },
  { slug: "eventos", label: "Eventos", icon: Sparkles, color: "bg-fuchsia-500", category: "🎉 Eventos e Mídia" },
  { slug: "buffet", label: "Buffet", icon: Sparkles, color: "bg-amber-500", category: "🎉 Eventos e Mídia" },
  { slug: "decoracao_festas", label: "Decoração", icon: Sparkles, color: "bg-pink-600", category: "🎉 Eventos e Mídia" },
  { slug: "musicos", label: "Músicos", icon: Sparkles, color: "bg-violet-600", category: "🎉 Eventos e Mídia" },
  { slug: "brinquedos_inflaveis", label: "Infláveis", icon: Sparkles, color: "bg-yellow-500", category: "🎉 Eventos e Mídia" },

  // 💻 Tecnologia e Digital
  { slug: "informatica_ti", label: "Informática/TI", icon: Zap, color: "bg-slate-800", category: "💻 Tecnologia e Digital" },
  { slug: "design_grafico", label: "Design Gráfico", icon: Sparkles, color: "bg-purple-600", category: "💻 Tecnologia e Digital" },

  // 🎓 Educação
  { slug: "aulas_particulares", label: "Aulas Particulares", icon: Users, color: "bg-blue-600", category: "🎓 Educação" },
  { slug: "traducao", label: "Tradução", icon: Users, color: "bg-indigo-400", category: "🎓 Educação" },
  { slug: "nutricao", label: "Nutrição", icon: Sparkles, color: "bg-green-500", category: "🎓 Educação" },
  { slug: "psicologia", label: "Psicologia", icon: Sparkles, color: "bg-indigo-500", category: "🎓 Educação" },

  // 🏠 Decoração e Interiores
  { slug: "decorador", label: "Decorador", icon: Sparkles, color: "bg-purple-400", category: "🏠 Decoração" },
  { slug: "tapeceiro", label: "Tapeceiro", icon: Wrench, color: "bg-rose-500", category: "🏠 Decoração" },
  { slug: "tapecaria_estofamento", label: "Estofamento", icon: Wrench, color: "bg-rose-600", category: "🏠 Decoração" },
  { slug: "instalacao_cortinas", label: "Cortinas", icon: Sparkles, color: "bg-violet-500", category: "🏠 Decoração" },

  // 🔧 Instalações Leves
  { slug: "chaveiro", label: "Chaveiro", icon: Wrench, color: "bg-yellow-700", category: "🔧 Instalações Leves" },
  { slug: "automacao", label: "Automação", icon: Zap, color: "bg-purple-600", category: "🔧 Instalações Leves" },
  { slug: "seguranca_eletronica", label: "CFTV", icon: Zap, color: "bg-indigo-600", category: "🔧 Instalações Leves" },
  { slug: "alarmes", label: "Alarmes", icon: Zap, color: "bg-red-700", category: "🔧 Instalações Leves" },
  { slug: "cameras_seguranca", label: "Câmeras", icon: Zap, color: "bg-indigo-700", category: "🔧 Instalações Leves" },
  { slug: "cerca_eletrica", label: "Cerca Elétrica", icon: Zap, color: "bg-yellow-600", category: "🔧 Instalações Leves" },
  { slug: "portoes_automaticos", label: "Portões Auto", icon: Zap, color: "bg-gray-800", category: "🔧 Instalações Leves" },
  { slug: "instalacao_internet", label: "Internet", icon: Zap, color: "bg-blue-500", category: "🔧 Instalações Leves" },
  { slug: "antenas_satelite", label: "Antenas", icon: Zap, color: "bg-slate-500", category: "🔧 Instalações Leves" },

  // 🧩 Outros
  { slug: "encontra_objeto", label: "Encontra Objeto", icon: Search, color: "bg-emerald-600", category: "🧩 Outros" },
  { slug: "outros", label: "Outros", icon: Wrench, color: "bg-gray-500", category: "🧩 Outros" },
];

export default function OtherServices() {
  const categoryGroups = [
    "🚗 Automotivo",
    "💆 Saúde e Beleza",
    "🐾 Pets",
    "🎉 Eventos e Mídia",
    "💻 Tecnologia e Digital",
    "🎓 Educação",
    "🏠 Decoração",
    "🔧 Instalações Leves",
    "🧩 Outros"
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <Link to={createPageUrl("Home")}>
            <Button variant="outline" className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Construção
            </Button>
          </Link>
          
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            🔎 Outros Tipos de Serviços
          </h1>
          <p className="text-xl text-indigo-200">
            Além da construção civil, conectamos você a diversos profissionais especializados
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="space-y-8">
          {categoryGroups.map(categoryGroup => {
            const groupCategories = otherServicesCategories.filter(cat => cat.category === categoryGroup);
            if (groupCategories.length === 0) return null;

            return (
              <div key={categoryGroup} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  {categoryGroup}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {groupCategories.map((cat) => (
                    <Link 
                      key={cat.slug}
                      to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                      className="group"
                    >
                      <div className="bg-slate-50 hover:bg-purple-50 rounded-xl p-4 text-center transition-all duration-300 hover:shadow-lg border-2 border-slate-200 hover:border-purple-300">
                        <div className={`w-14 h-14 ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                          <cat.icon className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900">{cat.label}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link to={createPageUrl("Home")}>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold px-8 py-6 rounded-xl">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar para Serviços de Construção
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
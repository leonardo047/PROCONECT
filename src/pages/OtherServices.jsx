import React, { useMemo } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Category } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import { ArrowLeft, Search, Wrench, Zap, Sparkles, Users, Loader2 } from "lucide-react";

// Mapeamento de nomes de ícones para componentes
const iconMap = {
  Wrench, Zap, Sparkles, Users, Search
};

// Helper para obter componente de ícone pelo nome
const getIconComponent = (iconName) => iconMap[iconName] || Wrench;

export default function OtherServices() {
  // Buscar categorias do banco
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['other-services-categories'],
    queryFn: () => Category.filter({
      filters: { location: 'other_services', is_active: true },
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Agrupar categorias por category_group
  const groupedCategories = useMemo(() => {
    const groups = {};
    categories.forEach(cat => {
      const group = cat.category_group || '🧩 Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(cat);
    });
    return groups;
  }, [categories]);

  // Ordem dos grupos
  const groupOrder = [
    "🚗 Automotivo",
    "💆 Saúde e Beleza",
    "🐾 Pets",
    "🎉 Eventos e Mídia",
    "💻 Tecnologia",
    "🎓 Educação",
    "🏠 Decoração",
    "🔧 Instalações",
    "🧩 Outros"
  ];

  // Ordenar grupos conforme ordem predefinida
  const sortedGroups = useMemo(() => {
    const sortedKeys = Object.keys(groupedCategories).sort((a, b) => {
      const indexA = groupOrder.findIndex(g => a.includes(g.replace(/^[^\s]+\s/, '')));
      const indexB = groupOrder.findIndex(g => b.includes(g.replace(/^[^\s]+\s/, '')));
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return sortedKeys;
  }, [groupedCategories]);

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
            Outros Tipos de Serviços
          </h1>
          <p className="text-xl text-indigo-200">
            Além da construção civil, conectamos você a diversos profissionais especializados
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Carregando categorias...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">Nenhuma categoria disponível no momento.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedGroups.map(categoryGroup => {
              const groupCategories = groupedCategories[categoryGroup];
              if (!groupCategories?.length) return null;

              return (
                <div key={categoryGroup} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    {categoryGroup}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {groupCategories.map((cat) => {
                      const IconComponent = getIconComponent(cat.icon);
                      return (
                        <Link
                          key={cat.slug}
                          to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                          className="group"
                        >
                          <div className="bg-slate-50 hover:bg-purple-50 rounded-xl p-4 text-center transition-all duration-300 hover:shadow-lg border-2 border-slate-200 hover:border-purple-300">
                            <div className={`w-14 h-14 ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                              <IconComponent className="w-7 h-7 text-white" />
                            </div>
                            <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

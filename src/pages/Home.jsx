import React, { memo, useMemo, Suspense, lazy } from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProfessionalService } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/componentes/interface do usuário/button";
import {
  Search, ArrowRight, Paintbrush, Wrench, Zap,
  Droplets, Sparkles, TreePine, HardHat, Users,
  Star
} from "lucide-react";

// Lazy load do componente de card (pesado por causa das imagens)
const ProfessionalCard = lazy(() => import("@/componentes/interface do usuário/ProfessionalCard"));

// Skeleton para cards
const CardSkeleton = memo(() => (
  <div className="bg-white rounded-xl p-4 animate-pulse">
    <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
  </div>
));

const categories = [
  { slug: "pedreiro_alvenaria", label: "Pedreiro", icon: HardHat, color: "bg-orange-500", category: "build" },
  { slug: "pintura_residencial", label: "Pintor", icon: Paintbrush, color: "bg-blue-500", category: "build" },
  { slug: "gesso_drywall", label: "Gesso/Drywall", icon: HardHat, color: "bg-slate-500", category: "build" },
  { slug: "azulejista", label: "Azulejista", icon: HardHat, color: "bg-purple-500", category: "build" },
  { slug: "telhados", label: "Telhadista", icon: HardHat, color: "bg-red-600", category: "build" },
  { slug: "impermeabilizacao", label: "Impermeabilização", icon: Droplets, color: "bg-blue-800", category: "build" },
  { slug: "eletricista", label: "Eletricista", icon: Zap, color: "bg-yellow-500", category: "electric" },
  { slug: "hidraulica", label: "Encanador", icon: Droplets, color: "bg-cyan-500", category: "electric" },
  { slug: "ar_condicionado", label: "Ar Condicionado", icon: Zap, color: "bg-blue-400", category: "electric" },
  { slug: "energia_solar", label: "Energia Solar", icon: Zap, color: "bg-yellow-400", category: "electric" },
  { slug: "limpeza", label: "Limpeza", icon: Sparkles, color: "bg-pink-500", category: "clean" },
  { slug: "jardinagem", label: "Jardinagem", icon: TreePine, color: "bg-green-500", category: "clean" },
  { slug: "marido_aluguel", label: "Marido Aluguel", icon: Wrench, color: "bg-teal-600", category: "clean" },
  { slug: "marceneiro", label: "Marceneiro", icon: Wrench, color: "bg-amber-700", category: "wood" },
  { slug: "vidraceiro", label: "Vidraçaria", icon: Sparkles, color: "bg-sky-400", category: "wood" },
  { slug: "serralheiro", label: "Serralheria", icon: Wrench, color: "bg-gray-700", category: "wood" },
  { slug: "arquiteto", label: "Arquiteto", icon: HardHat, color: "bg-indigo-600", category: "project" },
  { slug: "engenheiro", label: "Engenheiro", icon: HardHat, color: "bg-indigo-700", category: "project" },
];

// Categorias populares (apenas os slugs mais buscados)
const popularSlugs = [
  "pintura_residencial", "pedreiro_alvenaria", "eletricista", "hidraulica",
  "gesso_drywall", "azulejista", "ar_condicionado", "limpeza",
  "marceneiro", "jardinagem"
];

// Componente de categoria otimizado
const CategoryCard = memo(({ cat }) => (
  <Link
    to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
    className="group"
  >
    <div className="bg-white hover:bg-orange-50 rounded-xl p-4 text-center transition-all duration-200 hover:shadow-lg border-2 border-slate-200 hover:border-orange-400">
      <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-md`}>
        <cat.icon className="w-6 h-6 text-white" />
      </div>
      <h4 className="font-bold text-sm text-slate-900">{cat.label}</h4>
    </div>
  </Link>
));

// Hero section otimizada (sem framer-motion)
const HeroSection = memo(() => (
  <section className="relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20" />
    </div>

    <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm border border-orange-500/50 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 font-medium text-sm">Encontre profissionais em segundos</span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Encontre o profissional
          <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent"> perfeito </span>
          perto de você
        </h1>
        <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed">
          Pintores, pedreiros, eletricistas e outros profissionais qualificados. Rápido, fácil e confiável.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={createPageUrl("RequestQuote")}>
            <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-xl shadow-orange-500/30">
              <Search className="w-5 h-5 mr-2" />
              Solicitar Orçamento
            </Button>
          </Link>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-bold text-lg px-8 py-6 rounded-xl">
              Buscar Profissionais
            </Button>
          </Link>
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 font-bold text-lg px-8 py-6 rounded-xl">
              Sou Profissional
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-8 mt-10">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-gradient-to-br from-orange-400 to-pink-500" />
              ))}
            </div>
            <div className="text-left">
              <p className="text-white font-bold">500+</p>
              <p className="text-slate-400 text-sm">Profissionais</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            <div className="text-left">
              <p className="text-white font-bold">4.8/5</p>
              <p className="text-slate-400 text-sm">Avaliação</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
));

// Seção de categorias populares
const PopularCategories = memo(() => {
  const popularCategories = useMemo(() =>
    popularSlugs.map(slug => categories.find(c => c.slug === slug)).filter(Boolean),
    []
  );

  return (
    <section className="py-10 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
          Categorias Populares
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
          {popularCategories.map(cat => (
            <Link
              key={cat.slug}
              to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
              className="group"
            >
              <div className="bg-white hover:bg-orange-50 rounded-lg p-3 text-center transition-colors border border-slate-200 hover:border-orange-400">
                <div className={`w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center mx-auto mb-1`}>
                  <cat.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-medium text-slate-700">{cat.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
});

// Seção de todas as categorias
const AllCategories = memo(() => (
  <section className="py-12 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Todos os Serviços
        </h2>
        <p className="text-slate-600">
          Encontre o profissional ideal para sua necessidade
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9 gap-3">
        {categories.map((cat) => (
          <CategoryCard key={cat.slug} cat={cat} />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link to={createPageUrl("OtherServices")}>
          <Button variant="outline" className="font-semibold">
            <Search className="w-4 h-4 mr-2" />
            Outros Serviços
          </Button>
        </Link>
      </div>
    </div>
  </section>
));

// Seção de profissionais em destaque
const FeaturedProfessionals = memo(({ professionals }) => {
  if (!professionals?.length) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              Profissionais em Destaque
            </h2>
            <p className="text-slate-600">
              Os mais bem avaliados da plataforma
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
          <Suspense fallback={<><CardSkeleton /><CardSkeleton /><CardSkeleton /></>}>
            {professionals.map((professional) => (
              <ProfessionalCard key={professional.id} professional={professional} distance={null} />
            ))}
          </Suspense>
        </div>
      </div>
    </section>
  );
});

// Como funciona
const HowItWorks = memo(() => (
  <section className="py-12 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
          Como Funciona
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { step: "01", title: "Busque", desc: "Escolha o serviço e sua cidade" },
          { step: "02", title: "Compare", desc: "Veja fotos e avaliações" },
          { step: "03", title: "Contrate", desc: "Contato direto por WhatsApp" }
        ].map((item, i) => (
          <div key={i} className="text-center bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3">
              {item.step}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
            <p className="text-slate-600 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
));

// CTA para profissionais
const ProfessionalCTA = memo(() => (
  <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        É profissional da construção?
      </h2>
      <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
        Cadastre-se e mostre seu trabalho para milhares de clientes
      </p>
      <Link to={createPageUrl("Onboarding")}>
        <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
          Criar Meu Perfil
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Link>
    </div>
  </section>
));

export default function Home() {
  const { data: professionals = [] } = useQuery({
    queryKey: ['featured-professionals'],
    queryFn: async () => {
      const all = await ProfessionalService.search({
        isApproved: true,
        featured: true,
        limit: 6
      });
      return all || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });

  return (
    <div>
      <HeroSection />
      <PopularCategories />
      <AllCategories />
      <FeaturedProfessionals professionals={professionals} />
      <HowItWorks />
      <ProfessionalCTA />
    </div>
  );
}

import React, { memo, useEffect, Suspense, lazy, useState, useCallback } from 'react';
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ProfessionalService, ClientReferralService, Category } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/componentes/interface do usuário/button";
import { ArrowRight, Paintbrush, Wrench, Zap,
  Droplets, Sparkles, TreePine, HardHat,
  Star, Loader2, Home as HomeIcon, Hammer, Scissors, Truck, Building2, ShoppingBag,
  Brush, Palette, LayoutGrid, ChevronRight,
  Thermometer, Sun, Camera, Waves, Flower2, Bug, Sofa,
  DoorOpen, Frame, Layers, Square, ScrollText, Mountain,
  Package, Shovel, Container, FileText, PenTool,
  ClipboardCheck, Compass, Calculator, Settings, Flame,
  Snowflake, Fan, Trees, Share2, Check
} from "lucide-react";

// Lazy load do componente de card
const ProfessionalCard = lazy(() => import("@/componentes/interface do usuário/ProfessionalCard"));

// Skeleton para cards
const CardSkeleton = memo(() => (
  <div className="bg-white rounded-xl p-4 animate-pulse">
    <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-200 rounded w-1/2" />
  </div>
));

// Categorias populares fixas (atalhos)
const popularCategorySlugs = [
  { slug: "pintor", name: "Pintor", icon: Paintbrush, color: "bg-orange-500" },
  { slug: "pedreiro", name: "Pedreiro", icon: HardHat, color: "bg-slate-600" },
  { slug: "eletricista", name: "Eletricista", icon: Zap, color: "bg-yellow-500" },
  { slug: "encanador", name: "Encanador", icon: Droplets, color: "bg-blue-500" },
  { slug: "gesso_drywall", name: "Gesso/Drywall", icon: LayoutGrid, color: "bg-gray-500" },
  { slug: "azulejista", name: "Azulejista", icon: Square, color: "bg-cyan-500" },
  { slug: "telhadista", name: "Telhadista", icon: HomeIcon, color: "bg-red-600" },
  { slug: "ar_condicionado", name: "Ar Condicionado", icon: Snowflake, color: "bg-sky-500" },
  { slug: "limpeza", name: "Limpeza", icon: Sparkles, color: "bg-green-500" },
  { slug: "jardinagem", name: "Jardinagem", icon: TreePine, color: "bg-emerald-600" },
  { slug: "marceneiro", name: "Marceneiro", icon: Hammer, color: "bg-amber-700" }
];

// Grupos de serviços com ícones e cores individuais variadas
const serviceGroups = [
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
  }
];

// Card de serviço individual
const ServiceCard = memo(({ service }) => {
  const IconComponent = service.icon;
  const slug = service.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return (
    <Link
      to={createPageUrl(`SearchProfessionals?profession=${slug}`)}
      className="group"
    >
      <div className="bg-white rounded-xl p-4 flex flex-col items-center hover:shadow-md transition-all border border-slate-100 hover:border-slate-200">
        <div className={`w-14 h-14 ${service.color} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-sm`}>
          <IconComponent className="w-7 h-7 text-white" />
        </div>
        <span className="text-xs text-center text-slate-700 font-medium leading-tight">
          {service.name}
        </span>
      </div>
    </Link>
  );
});

// Card de grupo de serviços
const ServiceGroupCard = memo(({ group }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm">●</span>
        </div>
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <span>{group.emoji}</span>
          {group.title}
        </h3>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {group.services.map((service) => (
          <ServiceCard
            key={service.name}
            service={service}
          />
        ))}
      </div>
    </div>
  );
});

// Bloco 1 - Hero com gradiente roxo/laranja
// Botões dinâmicos baseados no status do usuário
const SearchSection = memo(({ isAuthenticated, user }) => {
  // Determinar quais botões mostrar
  const isProfessional = user?.is_professional === true;

  // Renderizar botões baseado no status do usuário
  const renderButtons = () => {
    if (!isAuthenticated) {
      // VISITANTE (não logado)
      // Solicitar Orçamento, Buscar Profissionais, Sou Profissional
      return (
        <>
          <Link to={createPageUrl("RequestQuote")}>
            <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
              Solicitar Orçamento
            </Button>
          </Link>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Buscar Profissionais
            </Button>
          </Link>
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Área Profissional
            </Button>
          </Link>
        </>
      );
    }

    if (isProfessional) {
      // USUÁRIO É PROFISSIONAL (pode também ser cliente)
      // Painel Profissional, Buscar Profissionais, Solicitar Serviço
      return (
        <>
          <Link to={createPageUrl("ProfessionalDashboard")}>
            <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
              Painel Profissional
            </Button>
          </Link>
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Buscar Profissionais
            </Button>
          </Link>
          <Link to={createPageUrl("RequestQuote")}>
            <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
              Solicitar Serviço
            </Button>
          </Link>
        </>
      );
    }

    // USUÁRIO SÓ É CLIENTE (não é profissional)
    // Solicitar Serviço, Buscar Profissionais, Tornar-se Profissional
    return (
      <>
        <Link to={createPageUrl("RequestQuote")}>
          <Button size="lg" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-5 rounded-xl shadow-lg">
            Solicitar Serviço
          </Button>
        </Link>
        <Link to={createPageUrl("SearchProfessionals")}>
          <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
            Buscar Profissionais
          </Button>
        </Link>
        <Link to={createPageUrl("BecomeProfessional")}>
          <Button size="lg" variant="outline" className="w-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-6 py-5 rounded-xl">
            Tornar-se Profissional
          </Button>
        </Link>
      </>
    );
  };

  return (
    <section className="bg-gradient-to-r from-purple-900 via-purple-800 to-orange-600 py-12 md:py-16 relative overflow-hidden">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <p className="text-base md:text-lg text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed">
          Use sua localização para encontrar pintores, pedreiros, eletricistas e outros profissionais qualificados. Rápido, fácil e confiável. ✨
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-2xl mx-auto mb-8">
          {renderButtons()}
        </div>

        <div className="flex items-center justify-center gap-8 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white" />
              <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <span className="font-semibold">500+</span>
            <span>Profissionais</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold">4.8/5</span>
            <span>Avaliação</span>
          </div>
        </div>
      </div>
    </section>
  );
});

// Bloco 2 - Categorias Populares (Atalhos)
const PopularCategories = memo(() => {
  return (
    <section className="py-8 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-6 text-center">
          Acessó Rápido às Categorias Populares
        </h3>
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {popularCategorySlugs.map((cat) => {
            const IconComponent = cat.icon;
            return (
              <Link
                key={cat.slug}
                to={createPageUrl(`SearchProfessionals?profession=${cat.slug}`)}
                className="group flex flex-col items-center"
              >
                <div className={`w-14 h-14 ${cat.color} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-medium text-slate-600 text-center max-w-[70px] leading-tight">{cat.name}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
});

// Banner laranja para Outros Serviços
const OtherServicesBanner = memo(() => (
  <section className="bg-gradient-to-r from-orange-500 to-orange-600 py-4">
    <div className="max-w-7xl mx-auto px-4">
      <Link to={createPageUrl("OtherServices")} className="flex items-center justify-center gap-2 text-white hover:opacity-90 transition-opacity">
        <span className="font-semibold">✨ Outros Tipos de Serviços</span>
        <span className="hidden sm:inline text-orange-100">- Automotivo · Beleza · Pets · Eventos · Tecnologia e mais</span>
        <ChevronRight className="w-5 h-5" />
      </Link>
    </div>
  </section>
));

// Bloco 3 - Todos os Serviços (FOCO OBRA) com novo design
const AllServicesSection = memo(({ isLoading }) => {
  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* Título principal */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Serviços de Construção Civil e Reformas
          </h2>
          <p className="text-slate-600">
            Profissionais, Empresas e Fornecedores - Tudo para sua obra em um só lugar!
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            {serviceGroups.map((group, index) => (
              <ServiceGroupCard key={index} group={group} />
            ))}
          </div>
        )}

        {/* Botão Ver Todos os Profissionais */}
        <div className="mt-10 text-center">
          <Link to={createPageUrl("SearchProfessionals")}>
            <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-10 py-6 rounded-xl shadow-lg">
              Ver Todos os Profissionais
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
});

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

// CTA para profissionais com botão de compartilhamento
const ProfessionalCTA = memo(({ isAuthenticated, user }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://connectpro.app.br';
  const shareText = 'Encontre profissionais qualificados para sua obra ou serviço no ConectPro!';
  const isProfessional = user?.is_professional === true;

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ConectPro - Profissionais de Construção',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        // Usuário cancelou ou erro
      }
    } else {
      // Fallback: copiar link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        // Erro ao copiar
      }
    }
  }, [shareUrl, shareText]);

  // Se já é profissional, mostrar CTA diferente
  if (isAuthenticated && isProfessional) {
    return (
      <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Gerencie seu perfil profissional
          </h2>
          <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
            Atualize suas informações, fotos e acompanhe seus contatos
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={createPageUrl("ProfessionalDashboard")}>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
                Meu Painel
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Compartilhar Site
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Se é cliente logado, mostrar CTA para virar profissional
  if (isAuthenticated && !isProfessional) {
    return (
      <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Quer oferecer seus serviços?
          </h2>
          <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
            Torne-se um profissional e mostre seu trabalho para milhares de clientes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to={createPageUrl("BecomeProfessional")}>
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
                Tornar-se Profissional
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={handleShare}
              className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Link Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 mr-2" />
                  Compartilhar Site
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Visitante (não logado) - CTA padrão
  return (
    <section className="py-12 bg-gradient-to-r from-orange-500 to-orange-600">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          É profissional da construção?
        </h2>
        <p className="text-lg text-orange-100 mb-6 max-w-xl mx-auto">
          Cadastre-se e mostre seu trabalho para milhares de clientes
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to={createPageUrl("Onboarding")}>
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold px-8 py-5 rounded-xl">
              Criar Meu Perfil
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            onClick={handleShare}
            className="bg-white/10 text-white hover:bg-white/20 border-2 border-white/30 font-semibold px-8 py-5 rounded-xl"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Link Copiado!
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5 mr-2" />
                Compartilhar Site
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
});

export default function Home() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');
  const { user, isAuthenticated } = useAuth();

  // Capturar código de indicação da URL e salvar no localStorage
  useEffect(() => {
    const captureReferralCode = async () => {
      if (refCode) {
        try {
          const referrerProfessional = await ProfessionalService.findByReferralCode(refCode);
          if (referrerProfessional) {
            localStorage.setItem('referral_code', refCode);
            localStorage.setItem('referrer_name', referrerProfessional.name);
          } else {
            const referrerClient = await ClientReferralService.findByReferralCode(refCode);
            if (referrerClient) {
              localStorage.setItem('referral_code', refCode);
              localStorage.setItem('referrer_name', referrerClient.full_name || '');
            }
          }
        } catch (error) {
          localStorage.setItem('referral_code', refCode);
        }
      }
    };
    captureReferralCode();
  }, [refCode]);

  // Buscar categorias do banco (para possível usó futuro)
  const { isLoading: loadingCategories } = useQuery({
    queryKey: ['home-categories'],
    queryFn: () => Category.filter({
      orderBy: { field: 'order', direction: 'asc' },
      limit: 500
    }),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

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
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return (
    <div>
      {/* Bloco 1 - Hero */}
      <SearchSection isAuthenticated={isAuthenticated} user={user} />

      {/* Bloco 2 - Categorias Populares (Atalhos) */}
      <PopularCategories />

      {/* Banner Outros Serviços */}
      <OtherServicesBanner />

      {/* Bloco 3 - Todos os Serviços (FOCO OBRA) */}
      <AllServicesSection isLoading={loadingCategories} />

      {/* Profissionais em Destaque */}
      <FeaturedProfessionals professionals={professionals} />

      {/* Como Funciona */}
      <HowItWorks />

      {/* CTA para Profissionais */}
      <ProfessionalCTA isAuthenticated={isAuthenticated} user={user} />
    </div>
  );
}

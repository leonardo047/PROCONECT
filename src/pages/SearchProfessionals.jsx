import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Availability, SavedSearch } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Sparkles, Trophy, TrendingUp, Save, Bookmark, X, ChevronDown } from "lucide-react";
import SearchFilters from "@/componentes/interface do usuário/SearchFilters";
import ProfessionalCard from "@/componentes/interface do usuário/ProfessionalCard";
import LocationSearch from "@/componentes/procurar/LocationSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/interface do usuário/dialog";
import { Badge } from "@/componentes/interface do usuário/badge";

// Itens por página
const ITEMS_PER_PAGE = 12;

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Componente de card memoizado
const MemoizedProfessionalCard = memo(({ professional, distance }) => (
  <ProfessionalCard professional={professional} distance={distance} />
));

// Skeleton para loading
const CardSkeleton = memo(() => (
  <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
    <div className="w-full h-48 bg-slate-200 rounded-lg mb-4" />
    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
    <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
    <div className="h-10 bg-slate-200 rounded" />
  </div>
));

// Header memoizado
const PageHeader = memo(() => (
  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 py-12 relative overflow-hidden">
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-10 right-10 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
    </div>
    <div className="max-w-7xl mx-auto px-4 relative">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Buscar Profissionais</h1>
          <p className="text-orange-200">Encontre os melhores profissionais perto de você</p>
        </div>
      </div>
    </div>
  </div>
));

// Saved searches component
const SavedSearches = memo(({ searches, onLoad, onDelete }) => {
  if (!searches?.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Bookmark className="w-4 h-4 text-slate-600" />
      <span className="text-sm font-semibold text-slate-700">Salvas:</span>
      {searches.map(search => (
        <Badge
          key={search.id}
          variant="outline"
          className="cursor-pointer hover:bg-orange-50 flex items-center gap-1"
        >
          <span onClick={() => onLoad(search)}>{search.name}</span>
          <X
            className="w-3 h-3 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(search.id);
            }}
          />
        </Badge>
      ))}
    </div>
  );
});

// Results counter
const ResultsCounter = memo(({ total, showing, searchMode, userLocation, searchRadius }) => (
  <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-4 shadow-sm border border-slate-200">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
        <Trophy className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">
          {showing} de {total}
        </p>
        <p className="text-sm text-slate-600">
          {searchMode === 'location' && userLocation
            ? `Em um raio de ${searchRadius} km`
            : 'Profissionais disponíveis'}
        </p>
      </div>
    </div>
  </div>
));

export default function SearchProfessionals() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialProfession = urlParams.get('profession') || 'all';

  const { user, isAuthenticated } = useAuth();

  const [filters, setFilters] = useState({
    profession: initialProfession,
    state: 'all',
    city: '',
    availableDate: null,
    minRating: 0
  });

  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [searchRadius, setSearchRadius] = useState(20);
  const [searchMode, setSearchMode] = useState('traditional');

  // Estado de paginação
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Reset paginação quando filtros mudam
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filters, userLocation, searchRadius, searchMode]);

  useEffect(() => {
    if (isAuthenticated && user) {
      SavedSearch.filter({ filters: { user_id: user.id } })
        .then(setSavedSearches)
        .catch(() => {});
    }
  }, [user, isAuthenticated]);

  const handleSaveSearch = useCallback(async () => {
    if (!user) {
      alert('Você precisa estar logado para salvar buscas');
      return;
    }
    if (!searchName.trim()) {
      alert('Digite um nome para a busca');
      return;
    }

    await SavedSearch.create({
      user_id: user.id,
      name: searchName,
      filters: filters
    });

    const searches = await SavedSearch.filter({ filters: { user_id: user.id } });
    setSavedSearches(searches);
    setShowSaveDialog(false);
    setSearchName('');
  }, [user, searchName, filters]);

  const handleLoadSearch = useCallback((savedSearch) => {
    setFilters(savedSearch.filters);
  }, []);

  const handleDeleteSearch = useCallback(async (searchId) => {
    await SavedSearch.delete(searchId);
    const searches = await SavedSearch.filter({ filters: { user_id: user.id } });
    setSavedSearches(searches);
  }, [user]);

  // Query principal
  const { data: allProfessionals = [], isLoading } = useQuery({
    queryKey: ['professionals-base'],
    queryFn: async () => {
      const all = await Professional.list();
      // Filtro base: aprovados, não bloqueados, perfil completo
      return all.filter(prof => {
        if (!prof.is_approved || prof.is_blocked || !prof.profile_complete) return false;
        if (prof.plan_type !== 'free' && prof.plan_active) return true;
        if (prof.plan_type === 'free' && (prof.free_quotes_used || 0) < 3) return true;
        return false;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000,
  });

  // Aplicar filtros no cliente (memoizado)
  const filteredProfessionals = useMemo(() => {
    let results = [...allProfessionals];

    // Filtrar por profissão
    if (filters.profession !== 'all') {
      results = results.filter(p => p.profession === filters.profession);
    }

    if (searchMode === 'traditional') {
      // Filtrar por estado
      if (filters.state !== 'all') {
        results = results.filter(p => p.state === filters.state);
      }

      // Filtrar por cidade
      if (filters.city) {
        const cityLower = filters.city.toLowerCase();
        results = results.filter(p => p.city?.toLowerCase().includes(cityLower));
      }

      // Filtrar por rating
      if (filters.minRating && filters.minRating !== 'all') {
        const minRating = parseFloat(filters.minRating);
        results = results.filter(p => (p.rating || 0) >= minRating);
      }

      return results;
    } else {
      // Location-based search
      if (!userLocation) return results;

      // Calcular distâncias e filtrar por raio
      let withDistances = results
        .map(prof => {
          if (!prof.latitude || !prof.longitude) return null;
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            prof.latitude,
            prof.longitude
          );
          return { ...prof, distance };
        })
        .filter(prof => prof !== null && prof.distance <= searchRadius)
        .sort((a, b) => a.distance - b.distance);

      // Filtrar por rating
      if (filters.minRating && filters.minRating !== 'all') {
        const minRating = parseFloat(filters.minRating);
        withDistances = withDistances.filter(p => (p.rating || 0) >= minRating);
      }

      return withDistances;
    }
  }, [allProfessionals, filters, searchMode, userLocation, searchRadius]);

  // Profissionais visíveis (paginados)
  const visibleProfessionals = useMemo(() => {
    return filteredProfessionals.slice(0, visibleCount);
  }, [filteredProfessionals, visibleCount]);

  const hasMore = visibleCount < filteredProfessionals.length;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50">
      <PageHeader />

      {/* Saved Searches & Save Button */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <SavedSearches
            searches={savedSearches}
            onLoad={handleLoadSearch}
            onDelete={handleDeleteSearch}
          />
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="whitespace-nowrap"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Busca
            </Button>
          )}
        </div>
      </div>

      {/* Search Modes */}
      <div className="max-w-7xl mx-auto px-4">
        <Tabs value={searchMode} onValueChange={setSearchMode} className="space-y-6">
          <TabsList className="bg-white shadow-sm border p-1 h-auto">
            <TabsTrigger
              value="traditional"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white px-6 py-3 font-semibold"
            >
              <Search className="w-4 h-4 mr-2" />
              Busca Tradicional
            </TabsTrigger>
            <TabsTrigger
              value="location"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white px-6 py-3 font-semibold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Por Localização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="traditional">
            <SearchFilters filters={filters} onFilterChange={setFilters} />
            <div className="mt-4 flex justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-12 py-6 text-lg shadow-lg"
                onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Profissionais
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <LocationSearch
              onLocationSet={setUserLocation}
              currentRadius={searchRadius}
              onRadiusChange={setSearchRadius}
            />
            <SearchFilters
              filters={filters}
              onFilterChange={setFilters}
              hideLocationFields={true}
            />
            <div className="flex justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-12 py-6 text-lg shadow-lg"
                onClick={() => setVisibleCount(ITEMS_PER_PAGE)}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar Profissionais
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Search Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Busca</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nome da busca (ex: Pintores São Paulo)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveSearch} className="flex-1 bg-orange-500 hover:bg-orange-600">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-16 bg-white rounded-xl animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Nenhum profissional encontrado
            </h3>
            <p className="text-slate-600 max-w-md">
              {searchMode === 'location'
                ? 'Tente aumentar o raio de busca ou verificar sua localização.'
                : 'Tente ajustar os filtros ou buscar em outra região.'}
            </p>
          </div>
        ) : (
          <>
            <ResultsCounter
              total={filteredProfessionals.length}
              showing={visibleProfessionals.length}
              searchMode={searchMode}
              userLocation={userLocation}
              searchRadius={searchRadius}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProfessionals.map((professional) => (
                <MemoizedProfessionalCard
                  key={professional.id}
                  professional={professional}
                  distance={searchMode === 'location' ? professional.distance : null}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={loadMore}
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8"
                >
                  <ChevronDown className="w-5 h-5 mr-2" />
                  Carregar Mais ({filteredProfessionals.length - visibleCount} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

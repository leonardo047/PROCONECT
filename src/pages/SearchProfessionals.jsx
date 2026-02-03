import React, { useState, useEffect } from 'react';
import { useAuth } from "@/lib/AuthContext";
import { Professional, Availability, SavedSearch } from "@/lib/entities";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Sparkles, Trophy, TrendingUp, Save, Bookmark, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SearchFilters from "@/componentes/interface do usuário/SearchFilters";
import ProfessionalCard from "@/componentes/interface do usuário/ProfessionalCard";
import LocationSearch from "@/componentes/procurar/LocationSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/componentes/interface do usuário/tabs";
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/interface do usuário/dialog";
import { Badge } from "@/componentes/interface do usuário/badge";

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

  useEffect(() => {
    loadSavedSearches();
  }, [user]);

  const loadSavedSearches = async () => {
    if (isAuthenticated && user) {
      try {
        const searches = await SavedSearch.filter({ filters: { user_id: user.id } });
        setSavedSearches(searches);
      } catch (e) {
        // Visitante sem login
      }
    }
  };

  const handleSaveSearch = async () => {
    if (!user) {
      alert('Voce precisa estar logado para salvar buscas');
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

    await loadSavedSearches();
    setShowSaveDialog(false);
    setSearchName('');
  };

  const handleLoadSearch = (savedSearch) => {
    setFilters(savedSearch.filters);
  };

  const handleDeleteSearch = async (searchId) => {
    await SavedSearch.delete(searchId);
    await loadSavedSearches();
  };

  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ['professionals', filters, userLocation, searchRadius, searchMode],
    queryFn: async () => {
      // Filtrar profissionais: aprovados, nao bloqueados, perfil completo
      // E que ainda tenham creditos gratis OU plano pago ativo
      const allProfessionals = await Professional.list();

      let queryFilter = allProfessionals.filter(prof => {
        // Deve estar aprovado e nao bloqueado
        if (!prof.is_approved || prof.is_blocked || !prof.profile_complete) return false;

        // Se tem plano pago ativo, sempre mostra
        if (prof.plan_type !== 'free' && prof.plan_active) return true;

        // Se e plano free, so mostra se ainda tem creditos gratis
        if (prof.plan_type === 'free' && (prof.free_contacts_used || 0) < 3) return true;

        return false;
      });

      // Filtrar por profissao
      if (filters.profession !== 'all') {
        queryFilter = queryFilter.filter(p => p.profession === filters.profession);
      }

      if (searchMode === 'traditional') {
        // Filtrar por estado
        if (filters.state !== 'all') {
          queryFilter = queryFilter.filter(p => p.state === filters.state);
        }

        let results = queryFilter;

        if (filters.city) {
          results = results.filter(p =>
            p.city?.toLowerCase().includes(filters.city.toLowerCase())
          );
        }

        // Filter by rating
        if (filters.minRating && filters.minRating !== 'all') {
          const minRating = parseFloat(filters.minRating);
          results = results.filter(p => p.rating >= minRating);
        }

        // Filter by availability date
        if (filters.availableDate) {
          const dayOfWeek = filters.availableDate.getDay();
          const availabilities = await Availability.list();
          const availableProfIds = availabilities
            .filter(a => a.day_of_week === dayOfWeek && a.is_available)
            .map(a => a.professional_id);

          results = results.filter(p => availableProfIds.includes(p.id));
        }

        return results;
      } else {
        // Location-based search
        const results = queryFilter;

        if (!userLocation) return results;

        // Calculate distances and filter by radius
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

        // Filter by rating
        if (filters.minRating && filters.minRating !== 'all') {
          const minRating = parseFloat(filters.minRating);
          withDistances = withDistances.filter(p => p.rating >= minRating);
        }

        // Filter by availability date
        if (filters.availableDate) {
          const dayOfWeek = filters.availableDate.getDay();
          const availabilities = await Availability.list();
          const availableProfIds = availabilities
            .filter(a => a.day_of_week === dayOfWeek && a.is_available)
            .map(a => a.professional_id);

          withDistances = withDistances.filter(p => availableProfIds.includes(p.id));
        }

        return withDistances;
      }
    }
  });

  const filteredProfessionals = professionals;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-96 h-96 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Buscar Profissionais
              </h1>
              <p className="text-orange-200">
                Encontre os melhores profissionais perto de voce
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Saved Searches & Save Button */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-10 mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Saved Searches */}
          {savedSearches.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Bookmark className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-700">Buscas Salvas:</span>
              {savedSearches.map(search => (
                <Badge
                  key={search.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-50 flex items-center gap-1"
                >
                  <span onClick={() => handleLoadSearch(search)}>{search.name}</span>
                  <X
                    className="w-3 h-3 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSearch(search.id);
                    }}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Save Current Search Button */}
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
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <Tabs value={searchMode} onValueChange={setSearchMode} className="space-y-6">
          <TabsList className="bg-white shadow-lg border-2 border-orange-200 p-1 h-auto">
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
              Busca por Localizacao
            </TabsTrigger>
          </TabsList>

          <TabsContent value="traditional">
            <SearchFilters filters={filters} onFilterChange={setFilters} />
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
              placeholder="Nome da busca (ex: Pintores Sao Paulo)"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveSearch} className="flex-1 bg-blue-500 hover:bg-blue-600">
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
      <div className="max-w-7xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="relative"
            >
              <Loader2 className="w-16 h-16 text-orange-500" />
              <Sparkles className="w-6 h-6 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
            <p className="text-slate-600 font-medium mt-4">Buscando os melhores profissionais...</p>
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Search className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              Nenhum profissional encontrado
            </h3>
            <p className="text-slate-600 max-w-md">
              {searchMode === 'location'
                ? 'Tente aumentar o raio de busca ou verificar sua localizacao.'
                : 'Tente ajustar os filtros ou buscar em outra regiao.'}
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6 bg-white rounded-2xl p-6 shadow-lg border-2 border-orange-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredProfessionals.length}
                  </p>
                  <p className="text-sm text-slate-600">
                    {searchMode === 'location' && userLocation
                      ? `Em um raio de ${searchRadius} km`
                      : 'Profissionais disponiveis'}
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredProfessionals.map((professional, index) => (
                  <motion.div
                    key={professional.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProfessionalCard
                      professional={professional}
                      distance={searchMode === 'location' ? professional.distance : null}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

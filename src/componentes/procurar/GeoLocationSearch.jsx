import React, { useState } from 'react';
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import { Slider } from "@/componentes/interface do usuário/slider";
import { 
  MapPin, Navigation, Loader2, Search, Target,
  TrendingUp, Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { showToast } from "@/utils/showToast";

export default function GeoLocationSearch({ onLocationChange, maxRadius = 50 }) {
  const [loading, setLoading] = useState(false);
  const [locationMode, setLocationMode] = useState('current'); // 'current' or 'cep'
  const [cep, setCep] = useState('');
  const [radius, setRadius] = useState([10]);
  const [currentLocation, setCurrentLocation] = useState(null);

  const getCurrentLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      showToast.error('Geolocalização não suportada pelo seu navegador');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radius: radius[0]
        };
        setCurrentLocation(location);
        onLocationChange(location);
        setLoading(false);
      },
      (error) => {
        showToast.error('Não foi possível obter sua localização. Verifique as permissões.');
        setLoading(false);
      }
    );
  };

  const searchByCep = async () => {
    if (!cep || cep.length < 8) {
      showToast.warning('Digite um CEP válido');
      return;
    }

    setLoading(true);
    
    try {
      // Buscar coordenadas usando ViaCEP + Nominatim
      const cleanCep = cep.replace(/\D/g, '');
      const cepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const cepData = await cepResponse.json();
      
      if (cepData.erro) {
        showToast.warning('CEP não encontrado');
        setLoading(false);
        return;
      }

      // Usar Nominatim para geocodificação
      const address = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const geoData = await geoResponse.json();
      
      if (geoData.length > 0) {
        const location = {
          latitude: parseFloat(geoData[0].lat),
          longitude: parseFloat(geoData[0].lon),
          radius: radius[0],
          address: address
        };
        setCurrentLocation(location);
        onLocationChange(location);
      } else {
        showToast.warning('Não foi possível encontrar as coordenadas deste CEP');
      }
    } catch (error) {
      showToast.error('Erro ao buscar localização. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Buscar por Proximidade</h3>
              <p className="text-sm text-slate-600">Encontre profissionais perto de você</p>
            </div>
          </div>

          {/* Toggle Mode */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setLocationMode('current')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                locationMode === 'current'
                  ? 'bg-white shadow-md text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-4 h-4 inline mr-2" />
              Minha Localização
            </button>
            <button
              onClick={() => setLocationMode('cep')}
              className={`py-3 px-4 rounded-lg font-medium transition-all ${
                locationMode === 'cep'
                  ? 'bg-white shadow-md text-orange-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-4 h-4 inline mr-2" />
              Por CEP
            </button>
          </div>

          {locationMode === 'current' ? (
            <div className="space-y-4">
              <Button
                onClick={getCurrentLocation}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Zap className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Localizando...' : 'Usar Minha Localização'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Digite o CEP</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    maxLength={9}
                    className="h-12 text-lg"
                  />
                  <Button
                    onClick={searchByCep}
                    disabled={loading}
                    className="h-12 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Radius Slider */}
          {currentLocation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 pt-6 border-t border-orange-200"
            >
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Raio de Busca</Label>
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-orange-600">{radius[0]} km</span>
                </div>
              </div>
              <Slider
                value={radius}
                onValueChange={(value) => {
                  setRadius(value);
                  onLocationChange({ ...currentLocation, radius: value[0] });
                }}
                max={maxRadius}
                min={1}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 km</span>
                <span>{maxRadius} km</span>
              </div>
            </motion.div>
          )}

          {currentLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center gap-2 text-green-700">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Buscando em {radius[0]} km de raio
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
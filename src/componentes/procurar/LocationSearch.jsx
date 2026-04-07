import React, { useState } from 'react';
import { Button } from "@/componentes/interface do usuário/button";
import { Input } from "@/componentes/interface do usuário/input";
import { Label } from "@/componentes/interface do usuário/label";
import { Slider } from "@/componentes/interface do usuário/slider";
import { Card, CardContent } from "@/componentes/interface do usuário/card";
import {
  MapPin, Navigation, Loader2, Search, Target,
  CheckCircle, AlertCircle
} from "lucide-react";

export default function LocationSearch({ onLocationSet, currentRadius, onRadiusChange }) {
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState(null);

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada pelo seu navegador');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type: 'current'
        };
        onLocationSet(location);
        setLocationStatus({ type: 'success', message: 'Localização atual obtida!' });
        setLoading(false);
      },
      (error) => {
        setError('Não foi possível obter sua localização. Verifique as permissões.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchByAddress = async () => {
    if (!address.trim()) {
      setError('Digite um endereço ou CEP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // LLM integration not available - using fallback message
      setError('Busca por endereço temporariamente indisponível. Use sua localização atual.');
    } catch (err) {
      setError('Erro ao buscar o endereço. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Busca por Localização</h3>
            <p className="text-sm text-slate-600">Encontre profissionais próximos a você</p>
          </div>
        </div>

        {/* Location Status */}
        {locationStatus && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            locationStatus.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {locationStatus.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">{locationStatus.message}</span>
          </div>
        )}

        {/* Current Location Button */}
        <Button
          onClick={getCurrentLocation}
          disabled={loading}
          className="w-full mb-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold h-12 shadow-md"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Navigation className="w-5 h-5 mr-2" />
          )}
          Usar Minha Localização Atual
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-500 font-medium">OU</span>
          </div>
        </div>

        {/* Address Search */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Buscar por Endereço ou CEP</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Digite o endereço ou CEP..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchByAddress()}
              className="flex-1 h-12 border-slate-300 focus:border-orange-500 focus:ring-orange-500"
            />
            <Button
              onClick={searchByAddress}
              disabled={loading}
              variant="outline"
              className="h-12 border-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Distance Slider */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold">Raio de Busca</Label>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-bold text-orange-700">{currentRadius} km</span>
            </div>
          </div>
          <Slider
            value={[currentRadius]}
            onValueChange={([value]) => onRadiusChange(value)}
            min={5}
            max={100}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>5 km</span>
            <span>50 km</span>
            <span>100 km</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/interface do usuário/card";
import { MapPin, Navigation } from "lucide-react";

// Componente de mapa usando iframe do OpenStreetMap (sem dependencias extras)
export default function ServiceAreaMap({ professional }) {
  const [mapUrl, setMapUrl] = useState(null);

  const latitude = professional?.latitude;
  const longitude = professional?.longitude;
  const radius = professional?.service_radius_km || 30;
  const city = professional?.city || '';
  const state = professional?.state || '';

  useEffect(() => {
    if (latitude && longitude) {
      // Calcular zoom baseado no raio
      // zoom 13 ~ 5km, zoom 11 ~ 20km, zoom 10 ~ 40km, zoom 9 ~ 80km
      let zoom = 11;
      if (radius <= 5) zoom = 13;
      else if (radius <= 10) zoom = 12;
      else if (radius <= 20) zoom = 11;
      else if (radius <= 40) zoom = 10;
      else if (radius <= 80) zoom = 9;
      else zoom = 8;

      // URL do OpenStreetMap embed
      const url = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.3},${latitude - 0.2},${longitude + 0.3},${latitude + 0.2}&layer=mapnik&marker=${latitude},${longitude}`;
      setMapUrl(url);
    }
  }, [latitude, longitude, radius]);

  // Se não tem coordenadas, mostra apenas informação textual
  if (!latitude || !longitude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            Area de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Navigation className="w-4 h-4" />
              <span>
                Atende em <strong>{city}{state ? `, ${state}` : ''}</strong>
              </span>
            </div>
            {radius > 0 && (
              <p className="text-sm text-slate-500 mt-2">
                Raio de atendimento: {radius}km
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-500" />
          Area de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mapa */}
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200">
          {mapUrl ? (
            <iframe
              src={mapUrl}
              className="w-full h-full"
              style={{ border: 0 }}
              loading="lazy"
              title="Mapa da área de atendimento"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">Carregando mapa...</p>
              </div>
            </div>
          )}

          {/* Overlay circular para indicar o raio (visual apenas) */}
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
            style={{ opacity: 0.15 }}
          >
            <div
              className="rounded-full border-4 border-orange-500 bg-orange-500"
              style={{
                width: '60%',
                height: '80%'
              }}
            />
          </div>
        </div>

        {/* Informacao de raio */}
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-900">
                Atende em um raio de {radius}km
              </p>
              <p className="text-sm text-slate-600">
                {city}{state ? `, ${state}` : ''}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

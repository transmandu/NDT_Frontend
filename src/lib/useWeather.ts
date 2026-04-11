'use client';

import { useState, useEffect } from 'react';

/**
 * Open-Meteo API — 100% gratis, sin API key.
 * Coordenadas: Ciudad Guayana, Venezuela (8.3535, -62.6471)
 *
 * Docs: https://open-meteo.com/en/docs
 */
const CIUDAD_GUAYANA_LAT = 8.3535;
const CIUDAD_GUAYANA_LON = -62.6471;

const API_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${CIUDAD_GUAYANA_LAT}` +
  `&longitude=${CIUDAD_GUAYANA_LON}` +
  `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
  `&timezone=America%2FCaracas`;

/**
 * WMO Weather Codes → emoji/description mapping
 * https://open-meteo.com/en/docs#weathervariables
 */
const WMO_DESCRIPTIONS: Record<number, { label: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog' }> = {
  0:  { label: 'Despejado',          icon: 'sun' },
  1:  { label: 'Mayormente despejado', icon: 'sun' },
  2:  { label: 'Parcialmente nublado', icon: 'cloud-sun' },
  3:  { label: 'Nublado',             icon: 'cloud' },
  45: { label: 'Neblina',             icon: 'fog' },
  48: { label: 'Neblina helada',      icon: 'fog' },
  51: { label: 'Llovizna ligera',     icon: 'rain' },
  53: { label: 'Llovizna moderada',   icon: 'rain' },
  55: { label: 'Llovizna intensa',    icon: 'rain' },
  61: { label: 'Lluvia ligera',       icon: 'rain' },
  63: { label: 'Lluvia moderada',     icon: 'rain' },
  65: { label: 'Lluvia intensa',      icon: 'rain' },
  80: { label: 'Chubascos ligeros',   icon: 'rain' },
  81: { label: 'Chubascos moderados', icon: 'rain' },
  82: { label: 'Chubascos intensos',  icon: 'rain' },
  95: { label: 'Tormenta eléctrica',  icon: 'storm' },
  96: { label: 'Tormenta con granizo', icon: 'storm' },
  99: { label: 'Tormenta severa',     icon: 'storm' },
};

export interface WeatherData {
  temperature: number;       // °C
  humidity: number;          // %
  windSpeed: number;         // km/h
  weatherCode: number;       // WMO code
  description: string;       // e.g. "Parcialmente nublado"
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog';
  updatedAt: string;         // ISO timestamp
}

export function useWeather(refreshIntervalMs = 10 * 60 * 1000) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const res  = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const cur  = data.current;

        const code = cur.weather_code ?? 0;
        const wmo  = WMO_DESCRIPTIONS[code] ?? { label: 'Desconocido', icon: 'cloud-sun' as const };

        if (!cancelled) {
          setWeather({
            temperature:  Math.round(cur.temperature_2m),
            humidity:     Math.round(cur.relative_humidity_2m),
            windSpeed:    Math.round(cur.wind_speed_10m ?? 0),
            weatherCode:  code,
            description:  wmo.label,
            icon:         wmo.icon,
            updatedAt:    new Date().toISOString(),
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error de red');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, refreshIntervalMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [refreshIntervalMs]);

  return { weather, loading, error };
}

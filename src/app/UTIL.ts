import {IPoint} from './common/interfaces';
import mapboxgl, {
  Map,
  LngLat,
  LngLatBounds,
  NavigationControl, Marker,
} from "mapbox-gl";
import {GC} from "./common/GC";
import {degrees2radians, Position, radians2degrees} from "@turf/turf";
import {Geolocation} from "./classes/Geolocation";

// mapboxgl.map

export function initMap(options?: {lnglat: LngLat, zoom: number, container: string | HTMLElement}): Map {
  mapboxgl.accessToken = GC.config.api.mapbox;

  const style = GC.MAPBOX_STYLE;

  let map: Map
  try {
    map = new Map({
      container: options?.container || 'map',
      style: style,
      zoom: options?.zoom || GC.INIT_ZOOM,
      center: [options?.lnglat?.lng || GC.INIT_MAPCENTER.lng, options?.lnglat?.lat || GC.INIT_MAPCENTER.lat]
    });
  } catch (e) {
    console.log(e)
    return null;
  }
  map.addControl(new NavigationControl());
  return map;
}

export function setMarker(map: Map, location: Geolocation, draggable?: boolean): Marker {
  const el = document.createElement('div');
  el.className = 'marker m-blue';
  const marker = new Marker({
    element: el,
    draggable: true,
  }).setLngLat({lng: location.longitude, lat: location.latitude})
    .addTo(map);
  if (draggable) {
    marker.on('dragend', () => {
      location.latitude = marker.getLngLat().lat;
      location.longitude = marker.getLngLat().lng;
    });
  }
  return marker;
}

export function drawText(map: Map, text: string, position: Position) {
  map.addSource(text, {
      type: 'geojson',
      data: {
        type: "FeatureCollection",
        features: [feature({position: position, description: text})]
      }
    }
  );
  map.addLayer({
    id: text,
    type: 'symbol',
    source: text,
    layout: {
      'text-field': ['get', 'description'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-justify': 'auto',
    }
  });
}

export function feature(feature: {position: Position, description: string}): any {
  return {
    type: 'Feature',
    properties: {
      description: feature.description
    },
    geometry: {
      type: 'Point',
      coordinates: feature.position
    }
  }
}

// local storage

export function setItem<E>(key: string, item: E): E {
  localStorage.setItem(key, JSON.stringify(item));
  return item;
}

export function getItem<E>(key: string): E {
  const json = localStorage.getItem(key);
  try {
    return JSON.parse(json) as E;
  } catch (e) {
    return null;
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// UI

export function corners(positions: IPoint[]): LngLatBounds {
  return new LngLatBounds([
    [
      Math.max.apply(Math, positions.map(o => o.longitude)),
      Math.max.apply(Math, positions.map(o => o.latitude))
    ],
    [
      Math.min.apply(Math, positions.map(o => o.longitude)),
      Math.min.apply(Math, positions.map(o => o.latitude))
    ]
  ]);
}

// CALC

export function bearing(pos1: IPoint, pos2: IPoint): number {
  const lat1Rad = degrees2radians(pos1.latitude);
  const lat2Rad = degrees2radians(pos2.latitude);
  const deltaLonRad = degrees2radians(pos2.longitude - pos1.longitude);
  const y = Math.sin(deltaLonRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLonRad);
  return (radians2degrees(Math.atan2(y, x)) + 360) % 360;
}

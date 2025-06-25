import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import { geometricRoute } from './geometricRoute';
import { testpoly } from './testdata';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import './assets/style.css';
import * as turf from '@turf/turf';

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYXR0aWxhNTIiLCJhIjoiY2thOTE3N3l0MDZmczJxcjl6dzZoNDJsbiJ9.bzXjw1xzQcsIhjB_YoAuEw"  ;
const positionMap = { lng: -104.9889, lat: 39.7394 };

function safeGetAll(draw) {
  try {
    if (
      draw &&
      typeof draw.getAll === 'function' &&
      draw.ctx &&
      draw.ctx.store
    ) {
      return draw.getAll();
    }
  } catch (e) {}
  return null;
}

export default function MapboxMap({ baseHeight, topHeight, stepCount, toleranceWidth }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);

  // Helper for user input
  const fetchUserInput = () => ({
    inBaseHi: baseHeight,
    inTopHi: topHeight,
    inStepCount: stepCount,
    inToleranceWidth: toleranceWidth,
  });

  // Calculation helpers
  function roundByN(floatNum, numDecimals) {
    const tenExp = 10 ** numDecimals;
    return Math.round(floatNum * tenExp) / tenExp;
  }

  function getLoopLength(poly) {
    return geometricRoute(poly, fetchUserInput())
      .features.map((d) => d.properties.LOOPLENGTH)
      .reduce((acc, val) => val, 0);
  }
  function getRouteDistance(poly) {
    return geometricRoute(poly, fetchUserInput())
      .features.map((d) => d.properties.LOOPLENGTH + d.properties.STEPHEIGHT)
      .reduce((acc, val) => acc + val, 0);
  }

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    if (mapRef.current) return; // Only initialize once
    
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    console.log('--- MAP INITIALIZATION ---');
    console.log('Container element:', mapContainer.current);
    console.log(`Container dimensions: ${mapContainer.current.offsetWidth}px x ${mapContainer.current.offsetHeight}px`);

    if (mapContainer.current.offsetHeight === 0) {
      console.error("Map container has zero height. Aborting map initialization.");
      return;
    }

    let map; // define map here to be accessible in cleanup
    try {
      map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/standard',
        center: [positionMap.lng, positionMap.lat],
        zoom: 18.93,
        bearing: 150,
        pitch: 60,
        antialias: false,
      });

      console.log('Map object created:', map);
      mapRef.current = map;
    } catch (error) {
      console.error("Failed to create Mapbox map object:", error);
      return; // Stop execution if map creation fails
    }

    // Add error handling
    map.on('error', (e) => {
      console.error('Mapbox error:', e);
    });

    map.on('load', () => {
      console.log('Map loaded successfully');
    });

    // Add Draw
    const draw = new MapboxDraw({ displayControlsDefault: true });
    map.addControl(draw);
    drawRef.current = draw;

    map.on('style.load', () => {
      console.log('Style loaded successfully');
      const fetchData = () => {
        const all = safeGetAll(draw);
        return all && all.features.length ? all : testpoly;
      };
      map.addSource('user-extrude-src', {
        type: 'geojson',
        data: fetchData(),
      });
      map.addSource('line-src', {
        type: 'geojson',
        lineMetrics: true,
        data: geometricRoute(fetchData(), fetchUserInput()),
      });
      map.addLayer({
        id: 'user-extrude-layer',
        type: 'fill-extrusion',
        source: 'user-extrude-src',
        layout: { 'fill-extrusion-edge-radius': 0.0 },
        paint: {
          'fill-extrusion-height': fetchUserInput().inTopHi,
          'fill-extrusion-base': fetchUserInput().inBaseHi,
          'fill-extrusion-emissive-strength': 0.9,
          'fill-extrusion-color': 'SkyBlue',
          'fill-extrusion-flood-light-color': 'DarkTurquoise',
          'fill-extrusion-opacity': 0.5,
          'fill-extrusion-ambient-occlusion-wall-radius': 0,
          'fill-extrusion-ambient-occlusion-radius': 6.0,
          'fill-extrusion-ambient-occlusion-intensity': 0.9,
          'fill-extrusion-ambient-occlusion-ground-attenuation': 0.9,
          'fill-extrusion-vertical-gradient': false,
          'fill-extrusion-line-width': 0,
          'fill-extrusion-flood-light-wall-radius': 20,
          'fill-extrusion-flood-light-intensity': 0.9,
          'fill-extrusion-flood-light-ground-radius': 20,
          'fill-extrusion-cutoff-fade-range': 0,
          'fill-extrusion-rounded-roof': true,
          'fill-extrusion-cast-shadows': false,
        },
      });
      // Line layers
      const paintLine = {
        'line-emissive-strength': 1.0,
        'line-blur': 0.2,
        'line-width': 1.25,
        'line-color': 'limegreen',
      };
      let layoutLine = {
        'line-z-offset': [
          'at',
          ['*', ['line-progress'], ['-', ['length', ['get', 'elevation']], 1]],
          ['get', 'elevation'],
        ],
        'line-elevation-reference': 'sea',
        'line-cap': 'round',
      };
      layoutLine['line-cross-slope'] = 0;
      map.addLayer({
        id: 'elevated-line-horizontal',
        type: 'line',
        source: 'line-src',
        layout: layoutLine,
        paint: paintLine,
      });
      layoutLine['line-cross-slope'] = 1;
      map.addLayer({
        id: 'elevated-line-vertical',
        type: 'line',
        source: 'line-src',
        layout: layoutLine,
        paint: paintLine,
      });
    });

    // Update on draw
    map.on('draw.create', updateArea);
    map.on('draw.delete', updateArea);
    map.on('draw.update', updateArea);
    map.on('draw.combine', updateArea);
    map.on('draw.uncombine', updateArea);

    function updateArea() {
      const polygon = safeGetAll(draw) && safeGetAll(draw).features.length ? safeGetAll(draw) : testpoly;
      map.getSource('user-extrude-src').setData(polygon);
      map.getSource('line-src').setData(geometricRoute(polygon, fetchUserInput()));
    }

    console.log('--- END MAP INITIALIZATION ---');
    // Clean up
    return () => {
      if (mapRef.current) {
        console.log("Cleaning up map.")
        mapRef.current.remove();
        mapRef.current = null;
      }
    }
  }, []);

  // Update layers when props change
  useEffect(() => {
    const map = mapRef.current;
    const draw = drawRef.current;
    const polygon = safeGetAll(draw) && safeGetAll(draw).features.length ? safeGetAll(draw) : testpoly;
    if (!map || !draw) return;
    if (map.isStyleLoaded && map.isStyleLoaded()) {
      // Update extrude layer
      if (map.getLayer('user-extrude-layer')) {
        map.setPaintProperty('user-extrude-layer', 'fill-extrusion-base', baseHeight);
        map.setPaintProperty('user-extrude-layer', 'fill-extrusion-height', topHeight);
      }
      // Update line source
      if (map.getSource('line-src')) {
        map.getSource('line-src').setData(geometricRoute(polygon, fetchUserInput()));
      }
    }
  }, [baseHeight, topHeight, stepCount, toleranceWidth]);

  // Calculation values
  const draw = drawRef.current;
  const polygon = safeGetAll(draw) && safeGetAll(draw).features.length ? safeGetAll(draw) : testpoly;
  const loopLength = getLoopLength(polygon);
  const routeDistance = getRouteDistance(polygon);
  const area = turf.area(polygon);
  const perimeter = turf.length(polygon, { units: 'meters' });

  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', height: '100%' }}>
      <div className="calculation-box py-0" style={{ zIndex: 2, position: 'absolute' }}>
        <div className="list-group list-group-horizontal text-xl">
          <a href="#" className="text-success p-1 list-group-item list-group-item-action disabled">
            <i className="fas fa-circle-notch text-lg"></i>
            <span id="calc-loop-length">{roundByN(loopLength, 0)} m</span>
          </a>
          <a href="#" className="text-success p-1 list-group-item list-group-item-action disabled">
            <i className="fas fa-route fa-fw text-xl"></i>
            <span id="calc-route-dist">{roundByN(routeDistance, 0)}</span>
          </a>
        </div>
        <div className="list-group list-group-horizontal">
          <a href="#" className="text-info p-1 list-group-item list-group-item-action disabled">
            <i className="fas fa-draw-polygon fa-fw text-xl"></i>
            <span id="calculated-distance">{roundByN(perimeter, 0)}</span>m
          </a>
          <a href="#" className="text-info p-1 list-group-item list-group-item-action disabled">
            <i className="fas fa-cube fa-rotate-270 fa-fw text-xl"></i>
            <span id="calculated-area">{roundByN(area, 0)}</span>m<sup>2</sup>
          </a>
        </div>
      </div>
      <div ref={mapContainer} id="map-container" style={{ position: 'absolute', top: 0, bottom: 0, width: '100%', height: '100%' }}/>
    </div>
  );
} 
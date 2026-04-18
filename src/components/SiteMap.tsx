'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl, { Point } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const SITE_CENTER: [number, number] = [77.3190, 28.4065]

const ALERTS = [
  {
    id: '1',
    type: 'fence_alert',
    label: 'Fence Alert',
    zone: 'Gate 3 Perimeter',
    time: '02:14 AM',
    severity: 'medium',
    coords: [77.3178, 28.4089] as [number, number],
    color: '#f59e0b',
    description: 'Motion sensor triggered. Wind speed 18 kmph.'
  },
  {
    id: '2',
    type: 'vehicle_intrusion',
    label: 'Vehicle Intrusion',
    zone: 'Block C Storage Yard',
    time: '03:42 AM',
    severity: 'high',
    coords: [77.3201, 28.4051] as [number, number],
    color: '#ef4444',
    description: 'Unregistered vehicle detected near restricted storage yard.'
  },
  {
    id: '3',
    type: 'perimeter_breach',
    label: 'Perimeter Breach',
    zone: 'Gate 3 Perimeter',
    time: '03:55 AM',
    severity: 'high',
    coords: [77.3175, 28.4092] as [number, number],
    color: '#ef4444',
    description: 'Secondary perimeter sensor triggered near Gate 3.'
  },
  {
    id: '4',
    type: 'equipment_anomaly',
    label: 'Equipment Anomaly',
    zone: 'Block C Storage Yard',
    time: '04:30 AM',
    severity: 'low',
    coords: [77.3205, 28.4048] as [number, number],
    color: '#6b7280',
    description: 'Minor vibration sensor reading near storage unit C-7.'
  }
]

const VEHICLE_PATH: [number, number][] = [
  [77.3165, 28.4071], [77.3178, 28.4063], [77.3192, 28.4055],
  [77.3201, 28.4051], [77.3210, 28.4048], [77.3198, 28.4044], [77.3185, 28.4050]
]



const DRONE_PATH = [
  { coords: [77.3170, 28.4060] as [number, number], label: 'WP1 - Gate 3 North', observation: null },
  { coords: [77.3180, 28.4075] as [number, number], label: 'WP2 - Fence Line', observation: null },
  { coords: [77.3178, 28.4089] as [number, number], label: 'WP3 - Alert Zone', observation: 'No physical breach found. Sensor housing loose, consistent with wind.' },
  { coords: [77.3195, 28.4080] as [number, number], label: 'WP4 - Transition', observation: null },
  { coords: [77.3200, 28.4065] as [number, number], label: 'WP5 - Block C North', observation: null },
  { coords: [77.3201, 28.4051] as [number, number], label: 'WP6 - Storage Yard', observation: 'Tire tracks visible near C-7. Padlock intact. No forced entry.' },
  { coords: [77.3198, 28.4044] as [number, number], label: 'WP7 - Block C South', observation: 'Area clear. No personnel detected.' },
]

const ZONES = [
  {
    id: 'gate3',
    label: 'Gate 3 Perimeter',
    color: '#f59e0b',
    coords: [
      [77.3165, 28.4082], [77.3190, 28.4082], [77.3190, 28.4100],
      [77.3165, 28.4100], [77.3165, 28.4082]
    ]
  },
  {
    id: 'blockc',
    label: 'Block C Storage Yard',
    color: '#ef4444',
    coords: [
      [77.3190, 28.4038], [77.3220, 28.4038], [77.3220, 28.4062],
      [77.3190, 28.4062], [77.3190, 28.4038]
    ]
  },
  {
    id: 'accessdelta',
    label: 'Access Point Delta',
    color: '#f97316',
    coords: [
      [77.3155, 28.4055], [77.3170, 28.4055], [77.3170, 28.4068],
      [77.3155, 28.4068], [77.3155, 28.4055]
    ]
  }
]

interface Props {
  onAlertClick?: (alert: typeof ALERTS[0]) => void
}

export default function SiteMap({ onAlertClick }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const droneMarker = useRef<mapboxgl.Marker | null>(null)
  const animationRef = useRef<NodeJS.Timeout | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<typeof ALERTS[0] | null>(null)
const [isSimulating, setIsSimulating] = useState(false)
  const [currentWaypoint, setCurrentWaypoint] = useState<typeof DRONE_PATH[0] | null>(null)
  const [visitedWaypoints, setVisitedWaypoints] = useState<number[]>([])


  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: SITE_CENTER,
      zoom: 15.5,
      pitch: 30,
    })


    map.current.on('load', () => {

    const m = map.current!

      // Add zone overlays
      ZONES.forEach(zone => {
        m.addSource(`zone-${zone.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { label: zone.label },
            geometry: { type: 'Polygon', coordinates: [zone.coords] }
          }
        })

        m.addLayer({
          id: `zone-fill-${zone.id}`,
          type: 'fill',
          source: `zone-${zone.id}`,
          paint: { 'fill-color': zone.color, 'fill-opacity': 0.1 }
        })

        m.addLayer({
          id: `zone-border-${zone.id}`,
          type: 'line',
          source: `zone-${zone.id}`,
          paint: { 'line-color': zone.color, 'line-width': 1.5, 'line-dasharray': [2, 2] }
        })
      })

      // Add vehicle path
      m.addSource('vehicle-path', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: VEHICLE_PATH } }
      })

      m.addLayer({
        id: 'vehicle-path-line',
        type: 'line',
        source: 'vehicle-path',
        paint: { 'line-color': '#ef4444', 'line-width': 2, 'line-dasharray': [3, 2] }
      })

      // Add drone path
      m.addSource('drone-path', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: DRONE_PATH.map(Point=>Point.coords) } }
      })

      m.addLayer({
        id: 'drone-path-line',
        type: 'line',
        source: 'drone-path',
        paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 1] }
      })

   // Add alert markers with FIXED ANCHOR
ALERTS.forEach(alert => {
  // 1. The Outer Container (Mapbox manages this - NO HOVER EFFECTS HERE)
  const el = document.createElement('div');
  el.className = 'marker-container';
  el.style.width = '28px';
  el.style.height = '28px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.cursor = 'pointer';

  // 2. The Inner Circle (We apply the scale to THIS)
  const inner = document.createElement('div');
  inner.style.cssText = `
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: ${alert.color};
    border: 2px solid white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: white;
    box-shadow: 0 0 10px ${alert.color}88;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    will-change: transform;
  `;
  inner.innerHTML = alert.severity === 'high' ? '⚠' : alert.severity === 'medium' ? '!' : '·';

  el.appendChild(inner);

  // 3. Hover listeners scale the INNER div only
  el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.3)'; });
  el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
  
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    setSelectedAlert(alert);
    onAlertClick?.(alert);
    m.flyTo({ center: alert.coords, zoom: 16.5, duration: 1000 });
  });

  // 4. Create the marker with 'center' anchor
  new mapboxgl.Marker({ 
    element: el,
    anchor: 'center' 
  })
    .setLngLat(alert.coords)
    .addTo(m);
});

      // Add drone waypoint markers with FIXED ANCHOR
      DRONE_PATH.forEach((Point) => {
        const el = document.createElement('div')
        el.style.cssText = `
          width: 10px; height: 10px; border-radius: 50%;
          background: #3b82f6; border: 1px solid #93c5fd;
          opacity: 0.8; position: absolute; will-change: transform;
        `
        new mapboxgl.Marker({ 
          element: el,
          anchor: 'center' // FIX: Pins coordinate to the middle of the div
        })
          .setLngLat(Point.coords)
          .addTo(m)
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])


 const simulateDrone = () => {
    if (isSimulating || !map.current) return
    setIsSimulating(true)
    setVisitedWaypoints([])
    setCurrentWaypoint(null)

    // Create drone marker
    const el = document.createElement('div')
    el.style.cssText = `
      width: 32px; height: 32px; border-radius: 50%;
      background: #1d4ed8; border: 2px solid #60a5fa;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; box-shadow: 0 0 15px #3b82f688;
      animation: pulse 1s infinite;
    `
    el.innerHTML = '🚁'

    if (droneMarker.current) droneMarker.current.remove()
    droneMarker.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(DRONE_PATH[0].coords)
      .addTo(map.current)

    // Animate through waypoints
    let step = 0
    const fly = () => {
      if (step >= DRONE_PATH.length) {
        setIsSimulating(false)
        setCurrentWaypoint(null)
        setTimeout(() => {
          droneMarker.current?.remove()
        }, 2000)
        return
      }

      const wp = DRONE_PATH[step]
      setCurrentWaypoint(wp)
      setVisitedWaypoints(prev => [...prev, step])

      droneMarker.current?.setLngLat(wp.coords)
      map.current?.flyTo({
        center: wp.coords,
        zoom: 16,
        duration: 1500,
        essential: true
      })

      step++
      animationRef.current = setTimeout(fly, 2500)
    }

    fly()
  }

  const stopSimulation = () => {
    if (animationRef.current) clearTimeout(animationRef.current)
    droneMarker.current?.remove()
    setIsSimulating(false)
    setCurrentWaypoint(null)
    map.current?.flyTo({ center: SITE_CENTER, zoom: 15.5, duration: 1000 })
  }

 return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Drone Control Button */}
      <div className="absolute bottom-4 right-4 z-10 space-y-2">
        {!isSimulating ? (
          <button
            onClick={simulateDrone}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg border border-blue-500 shadow-lg transition-colors flex items-center gap-2"
          >
            🚁 Simulate Drone Patrol
          </button>
        ) : (
          <button
            onClick={stopSimulation}
            className="bg-red-900 hover:bg-red-800 text-red-300 text-xs font-medium px-4 py-2 rounded-lg border border-red-700 shadow-lg transition-colors flex items-center gap-2"
          >
            ⏹ Stop Simulation
          </button>
        )}
      </div>

      {/* Drone Status Panel */}
      {isSimulating && currentWaypoint && (
        <div className="absolute bottom-16 right-4 z-10 bg-slate-900 border border-blue-800 rounded-lg p-3 max-w-xs">
          <p className="text-blue-400 text-xs font-mono uppercase tracking-wide mb-1">
            🚁 Drone Active
          </p>
          <p className="text-slate-200 text-sm font-medium">{currentWaypoint.label}</p>
          {currentWaypoint.observation && (
            <p className="text-slate-300 text-xs mt-1 italic">"{currentWaypoint.observation}"</p>
          )}
          <div className="flex gap-1 mt-2">
            {DRONE_PATH.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${
                  visitedWaypoints.includes(i) ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-1">
            {visitedWaypoints.length}/{DRONE_PATH.length} waypoints
          </p>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900 bg-opacity-90 border border-slate-700 rounded-lg p-3 space-y-1.5 z-10">
        <p className="text-slate-400 text-xs font-mono uppercase tracking-wide mb-2">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-4 border-t-2 border-dashed border-red-500" />
          <span className="text-slate-300 text-xs">Vehicle Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 border-t-2 border-dashed border-blue-500" />
          <span className="text-slate-300 text-xs">Drone Patrol</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-slate-300 text-xs">High Alert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-300 text-xs">Medium Alert</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-slate-300 text-xs">Low Alert</span>
        </div>
      </div>

      {/* Selected Alert Popup */}
      {selectedAlert && (
        <div className="absolute top-4 left-4 bg-slate-900 border border-slate-700 rounded-lg p-3 max-w-xs z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-mono uppercase tracking-wide" style={{ color: selectedAlert.color }}>
              {selectedAlert.label}
            </span>
            <button onClick={() => setSelectedAlert(null)} className="text-slate-500 hover:text-slate-300 text-xs ml-4">✕</button>
          </div>
          <p className="text-slate-200 text-sm font-medium">{selectedAlert.zone}</p>
          <p className="text-slate-400 text-xs mt-1">{selectedAlert.time}</p>
          <p className="text-slate-300 text-xs mt-2">{selectedAlert.description}</p>
        </div>
      )}
    </div>
  )


  }
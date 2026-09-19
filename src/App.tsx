import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { LngLatBounds, type GeoJSONSource, type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import {
  ArrowLeft,
  Bell,
  Box,
  BriefcaseBusiness,
  Car,
  ChevronLeft,
  Clock3,
  Compass,
  Gift,
  Heart,
  History,
  Home,
  Layers3,
  LifeBuoy,
  LocateFixed,
  LogOut,
  MapPin,
  Minus,
  Navigation,
  Percent,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

type Tab = 'home' | 'trips' | 'offers' | 'profile';
type LocationStatus = 'locating' | 'ready' | 'denied' | 'error';
type MapMode = 'light' | 'dark' | 'satellite';
type PickerMode = 'pickup' | 'destination' | 'home' | 'work' | 'recent';
type MapCommand = { type: 'zoomIn' | 'zoomOut' | 'recenter' | 'resetBearing' | 'toggleTilt'; nonce: number } | null;
type Place = { name: string; detail: string; lat: number; lng: number };
type Provider = {
  id: string;
  name: string;
  mark: string;
  brand: string;
  minFare: number;
  maxFare: number;
  eta: string;
  packageName?: string;
  webUrl: string;
  logoDomain?: string;
  routePrefill?: boolean;
};
type Trip = { provider: string; route: string; price: number; date: string; saved: number };
type RouteMeta = { distanceKm: number; durationMin: number } | null;

const cairoFallback: Place = {
  name: 'حدد موقعك',
  detail: 'اسمح بالوصول للموقع أو اختاره يدويًا',
  lat: 30.0444,
  lng: 31.2357,
};

const places: Place[] = [
  { name: 'التجمع الخامس', detail: 'القاهرة الجديدة', lat: 30.0074, lng: 31.4913 },
  { name: 'مدينة نصر', detail: 'القاهرة', lat: 30.0511, lng: 31.3656 },
  { name: 'مصر الجديدة', detail: 'القاهرة', lat: 30.091, lng: 31.322 },
  { name: 'المعادي', detail: 'القاهرة', lat: 29.9602, lng: 31.2569 },
  { name: 'المهندسين', detail: 'الجيزة', lat: 30.058, lng: 31.2009 },
  { name: 'الزمالك', detail: 'القاهرة', lat: 30.0615, lng: 31.2197 },
  { name: 'الشيخ زايد', detail: 'الجيزة', lat: 30.049, lng: 30.9762 },
  { name: '6 أكتوبر', detail: 'الجيزة', lat: 29.9737, lng: 30.9447 },
  { name: 'الدقي', detail: 'الجيزة', lat: 30.0384, lng: 31.2122 },
  { name: 'وسط البلد', detail: 'القاهرة', lat: 30.0444, lng: 31.2357 },
  { name: 'العاصمة الإدارية', detail: 'شرق القاهرة', lat: 30.0131, lng: 31.7525 },
  { name: 'مطار القاهرة', detail: 'القاهرة', lat: 30.1219, lng: 31.4056 },
];

const providers: Provider[] = [
  { id: 'uber', name: 'Uber', mark: 'Uber', brand: '#111111', minFare: 230, maxFare: 255, eta: '3 دقائق', routePrefill: true, packageName: 'com.ubercab', webUrl: 'https://m.uber.com/', logoDomain: 'uber.com' },
  { id: 'careem', name: 'Careem', mark: 'C', brand: '#12b76a', minFare: 245, maxFare: 270, eta: '5 دقائق', packageName: 'com.careem.acma', webUrl: 'https://www.careem.com/', logoDomain: 'careem.com' },
  { id: 'didi', name: 'DiDi', mark: 'D', brand: '#ff6b21', minFare: 210, maxFare: 235, eta: '4 دقائق', packageName: 'com.didiglobal.passenger', webUrl: 'https://web.didiglobal.com/eg/rider/', logoDomain: 'didiglobal.com' },
  { id: 'indrive', name: 'inDrive', mark: 'iD', brand: '#98d91c', minFare: 195, maxFare: 225, eta: '6 دقائق', packageName: 'sinet.startup.inDriver', webUrl: 'https://play.google.com/store/apps/details?id=sinet.startup.inDriver', logoDomain: 'indrive.com' },
  { id: 'arrw', name: 'ARRW', mark: 'A', brand: '#1676ff', minFare: 205, maxFare: 220, eta: '6 دقائق', packageName: 'com.arrw.arrwClient', webUrl: 'https://www.arrw.com/', logoDomain: 'arrw.com' },
  { id: 'goway', name: 'Go Way', mark: 'GW', brand: '#7357ff', minFare: 215, maxFare: 245, eta: '7 دقائق', webUrl: 'https://www.gowayapps.com/', logoDomain: 'gowayapps.com' },
  { id: 'drivo', name: 'Drivo', mark: 'Dr', brand: '#1653d8', minFare: 220, maxFare: 250, eta: '7 دقائق', packageName: 'com.app.ts.drivo', webUrl: 'https://drivoeg.com/', logoDomain: 'drivoeg.com' },
  { id: 'pink', name: 'Pink Taxi', mark: 'P', brand: '#e64591', minFare: 225, maxFare: 255, eta: '8 دقائق', packageName: 'com.multibrains.taxi.passenger.pinktaxiegypt', webUrl: 'https://play.google.com/store/apps/details?id=com.multibrains.taxi.passenger.pinktaxiegypt' },
  { id: 'capital', name: 'New Capital Cab', mark: 'NC', brand: '#c59033', minFare: 240, maxFare: 280, eta: '8 دقائق', webUrl: 'https://apps.apple.com/eg/app/new-capital-cab/id6505035461' },
  { id: 'caroute', name: 'Caroute', mark: 'CR', brand: '#2f7b70', minFare: 200, maxFare: 235, eta: '6 دقائق', packageName: 'com.caroute.riderapp', webUrl: 'https://play.google.com/store/apps/details?id=com.caroute.riderapp' },
  { id: 'gomini', name: 'GoMini', mark: 'GM', brand: '#cf5137', minFare: 180, maxFare: 210, eta: '8 دقائق', packageName: 'com.gomini.gominipassenger', webUrl: 'https://play.google.com/store/apps/details?id=com.gomini.gominipassenger' },
  { id: 'swvl', name: 'Swvl', mark: 'S', brand: '#f05b39', minFare: 70, maxFare: 70, eta: 'موعد محدد', packageName: 'io.swvl.customer', webUrl: 'https://play.google.com/store/apps/details?id=io.swvl.customer', logoDomain: 'swvl.com' },
];

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

function loadTrips(): Trip[] {
  try { return JSON.parse(localStorage.getItem('rayeh-history') || '[]') as Trip[]; } catch { return []; }
}
function loadRecent(): Place[] {
  try { return JSON.parse(localStorage.getItem('rayeh-recent-places') || '[]') as Place[]; } catch { return []; }
}
function loadSaved(key: 'home' | 'work'): Place | null {
  try { return JSON.parse(localStorage.getItem(`rayeh-${key}`) || 'null') as Place | null; } catch { return null; }
}
function money(p: Provider) {
  return p.minFare === p.maxFare ? `${p.minFare} ج.م` : `${p.minFare}–${p.maxFare} ج.م`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [pickup, setPickup] = useState<Place>(cairoFallback);
  const [destination, setDestination] = useState<Place | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [allProvidersOpen, setAllProvidersOpen] = useState(false);
  const [history, setHistory] = useState<Trip[]>(loadTrips);
  const [recentPlaces, setRecentPlaces] = useState<Place[]>(loadRecent);
  const [savedHome, setSavedHome] = useState<Place | null>(() => loadSaved('home'));
  const [savedWork, setSavedWork] = useState<Place | null>(() => loadSaved('work'));
  const [toast, setToast] = useState('');

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  const locate = (announce = true) => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setPickup(cairoFallback);
      if (announce) notify('GPS غير متاح. اختار نقطة البداية يدويًا.');
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickup({ name: 'موقعي الحالي', detail: 'تم تحديده من GPS', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('ready');
        if (announce) notify('تم تحديد موقعك الحقيقي');
      },
      err => {
        setLocationStatus(err.code === 1 ? 'denied' : 'error');
        setPickup(cairoFallback);
        if (announce) notify(err.code === 1 ? 'فعّل إذن الموقع ثم حاول مرة أخرى.' : 'تعذر تحديد الموقع الآن.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => locate(false), []);

  const rememberDestination = (p: Place) => {
    const next = [p, ...recentPlaces.filter(x => x.name !== p.name)].slice(0, 6);
    setRecentPlaces(next);
    localStorage.setItem('rayeh-recent-places', JSON.stringify(next));
  };

  const choosePlace = (p: Place) => {
    if (picker === 'pickup') {
      setPickup(p);
      setLocationStatus('ready');
    } else if (picker === 'home') {
      setSavedHome(p);
      localStorage.setItem('rayeh-home', JSON.stringify(p));
      setDestination(p);
      rememberDestination(p);
      notify('تم حفظ البيت واختياره كوجهة');
    } else if (picker === 'work') {
      setSavedWork(p);
      localStorage.setItem('rayeh-work', JSON.stringify(p));
      setDestination(p);
      rememberDestination(p);
      notify('تم حفظ العمل واختياره كوجهة');
    } else {
      setDestination(p);
      rememberDestination(p);
    }
    setPicker(null);
  };

  const quickDestination = (type: 'home' | 'work') => {
    const saved = type === 'home' ? savedHome : savedWork;
    if (saved) {
      setDestination(saved);
      rememberDestination(saved);
      notify(type === 'home' ? 'الوجهة: البيت' : 'الوجهة: العمل');
    } else {
      setPicker(type);
    }
  };

  const openProvider = (provider: Provider) => {
    if (!destination) {
      notify('اختار وجهتك الأول');
      return;
    }
    const trip: Trip = {
      provider: provider.name,
      route: `${pickup.name} ← ${destination.name}`,
      price: provider.minFare,
      date: 'اليوم',
      saved: Math.max(0, 270 - provider.minFare),
    };
    const next = [trip, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem('rayeh-history', JSON.stringify(next));
    setSelectedProvider(null);

    if (provider.routePrefill) {
      window.location.href = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`;
      return;
    }
    if (/Android/i.test(navigator.userAgent) && provider.packageName) {
      window.location.href = `intent://#Intent;package=${provider.packageName};S.browser_fallback_url=${encodeURIComponent(provider.webUrl)};end`;
      return;
    }
    window.open(provider.webUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="app-shell" dir="rtl">
      <div className="phone-shell">
        {tab === 'home' && (
          <HomeScreen
            pickup={pickup}
            destination={destination}
            locationStatus={locationStatus}
            savedHome={savedHome}
            savedWork={savedWork}
            recentPlaces={recentPlaces}
            onLocate={() => locate(true)}
            onPick={setPicker}
            onQuickDestination={quickDestination}
            onSelectProvider={setSelectedProvider}
            onShowAll={() => setAllProvidersOpen(true)}
          />
        )}
        {tab === 'trips' && <TripsScreen history={history} />}
        {tab === 'offers' && <OffersScreen onAction={notify} />}
        {tab === 'profile' && <ProfileScreen history={history} onAction={notify} />}
        <BottomNav tab={tab} onTab={setTab} />
      </div>

      {picker && (
        <Picker
          mode={picker}
          recentPlaces={recentPlaces}
          onClose={() => setPicker(null)}
          onChoose={choosePlace}
          onLocate={() => { locate(true); setPicker(null); }}
        />
      )}
      {selectedProvider && destination && (
        <ProviderSheet provider={selectedProvider} onClose={() => setSelectedProvider(null)} onOpen={() => openProvider(selectedProvider)} />
      )}
      {allProvidersOpen && (
        <AllProvidersSheet onClose={() => setAllProvidersOpen(false)} onSelect={p => { setAllProvidersOpen(false); setSelectedProvider(p); }} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function HomeScreen({
  pickup,
  destination,
  locationStatus,
  savedHome,
  savedWork,
  recentPlaces,
  onLocate,
  onPick,
  onQuickDestination,
  onSelectProvider,
  onShowAll,
}: {
  pickup: Place;
  destination: Place | null;
  locationStatus: LocationStatus;
  savedHome: Place | null;
  savedWork: Place | null;
  recentPlaces: Place[];
  onLocate: () => void;
  onPick: (t: PickerMode) => void;
  onQuickDestination: (t: 'home' | 'work') => void;
  onSelectProvider: (p: Provider) => void;
  onShowAll: () => void;
}) {
  const [mapMode, setMapMode] = useState<MapMode>('light');
  const [labelsOn, setLabelsOn] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [command, setCommand] = useState<MapCommand>(null);
  const [routeMeta, setRouteMeta] = useState<RouteMeta>(null);
  const runCommand = (type: NonNullable<MapCommand>['type']) => setCommand({ type, nonce: Date.now() });

  return (
    <section className="screen home-screen">
      <MapView
        pickup={pickup}
        destination={destination}
        mapMode={mapMode}
        labelsOn={labelsOn}
        command={command}
        onRouteMeta={setRouteMeta}
      />
      <div className="map-fade" />
      <header className="map-header">
        <div className="brand-lockup"><span className="brand-mark">R</span><div><strong>RAYEH</strong><small>رايح</small></div></div>
        <button className="round-icon" aria-label="الإشعارات" onClick={() => alert('مفيش إشعارات جديدة دلوقتي')}><Bell size={20} /></button>
      </header>

      <div className="route-card">
        <button className="route-row" onClick={() => onPick('pickup')}>
          <span className="pin-dot blue" />
          <span><small>منين؟</small><strong>{pickup.name}</strong></span>
        </button>
        <div className="route-divider" />
        <button className="route-row" onClick={() => onPick('destination')}>
          <MapPin className="dest-pin" size={22} />
          <span><small>رايح فين؟</small><strong>{destination?.name ?? 'اختار وجهتك'}</strong></span>
        </button>
        <button className="locate-bubble" aria-label="حدد موقعي" onClick={onLocate}><Navigation size={20} /></button>
      </div>

      <div className="quick-left">
        <button onClick={() => onQuickDestination('home')} className={savedHome ? 'saved' : ''}><Home size={21}/><span>{savedHome ? 'البيت' : 'حفظ بيت'}</span></button>
        <button onClick={() => onQuickDestination('work')} className={savedWork ? 'saved' : ''}><BriefcaseBusiness size={21}/><span>{savedWork ? 'العمل' : 'حفظ عمل'}</span></button>
        <button onClick={() => onPick('recent')} disabled={!recentPlaces.length}><History size={21}/><span>حديثة</span></button>
      </div>

      <div className="map-controls">
        <button aria-label="موقعي" onClick={() => runCommand('recenter')}><LocateFixed size={20}/></button>
        <button aria-label="تكبير" onClick={() => runCommand('zoomIn')}><Plus size={20}/></button>
        <button aria-label="تصغير" onClick={() => runCommand('zoomOut')}><Minus size={20}/></button>
        <button aria-label="اتجاه الشمال" onClick={() => runCommand('resetBearing')}><Compass size={20}/></button>
        <button aria-label="منظور ثلاثي" className={tilted ? 'active' : ''} onClick={() => { setTilted(v => !v); runCommand('toggleTilt'); }}><Box size={19}/></button>
        <button aria-label="طبقات الخريطة" className={layersOpen ? 'active' : ''} onClick={() => setLayersOpen(v => !v)}><Layers3 size={20}/></button>
      </div>

      {layersOpen && (
        <div className="map-options-card">
          <div className="map-options-head"><strong>شكل الخريطة</strong><button onClick={() => setLayersOpen(false)}><X size={16}/></button></div>
          <div className="map-style-grid">
            <button className={mapMode === 'light' ? 'active' : ''} onClick={() => setMapMode('light')}><span className="style-preview light"/>عادية</button>
            <button className={mapMode === 'dark' ? 'active' : ''} onClick={() => setMapMode('dark')}><span className="style-preview dark"/>داكنة</button>
            <button className={mapMode === 'satellite' ? 'active' : ''} onClick={() => setMapMode('satellite')}><span className="style-preview satellite"/>قمر صناعي</button>
          </div>
          <label className="labels-toggle"><span>أسماء الشوارع والأماكن</span><input type="checkbox" checked={labelsOn} onChange={e => setLabelsOn(e.target.checked)} /><i/></label>
        </div>
      )}

      {locationStatus !== 'ready' && (
        <div className="gps-card">
          <LocateFixed size={20} />
          <span><strong>{locationStatus === 'locating' ? 'بنحدد موقعك…' : 'محتاجين موقعك الحقيقي'}</strong><small>{locationStatus === 'denied' ? 'فعّل إذن الموقع أو اختار نقطة البداية يدويًا' : 'اسمح بالوصول للموقع للحصول على نقطة بداية صحيحة'}</small></span>
          <button onClick={onLocate}>حدد موقعي</button>
        </div>
      )}

      <RideSheet destination={destination} routeMeta={routeMeta} onPickDestination={() => onPick('destination')} onSelect={onSelectProvider} onShowAll={onShowAll} />
    </section>
  );
}

function makeStyle(mode: MapMode, labelsOn: boolean): StyleSpecification {
  if (mode === 'satellite') {
    return {
      version: 8,
      sources: {
        base: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Esri' },
        labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256 },
      },
      layers: [
        { id: 'base', type: 'raster', source: 'base' },
        { id: 'labels', type: 'raster', source: 'labels', layout: { visibility: labelsOn ? 'visible' : 'none' } },
      ],
    };
  }
  const prefix = mode === 'dark' ? 'dark' : 'light';
  return {
    version: 8,
    sources: {
      base: { type: 'raster', tiles: [`https://a.basemaps.cartocdn.com/${prefix}_nolabels/{z}/{x}/{y}.png`], tileSize: 256, attribution: '© OpenStreetMap contributors © CARTO' },
      labels: { type: 'raster', tiles: [`https://a.basemaps.cartocdn.com/${prefix}_only_labels/{z}/{x}/{y}.png`], tileSize: 256 },
    },
    layers: [
      { id: 'base', type: 'raster', source: 'base' },
      { id: 'labels', type: 'raster', source: 'labels', layout: { visibility: labelsOn ? 'visible' : 'none' } },
    ],
  };
}

function MapView({ pickup, destination, mapMode, labelsOn, command, onRouteMeta }: { pickup: Place; destination: Place | null; mapMode: MapMode; labelsOn: boolean; command: MapCommand; onRouteMeta: (m: RouteMeta) => void }) {
  const node = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);
  const routeCoords = useRef<[number, number][]>([]);
  const tiltRef = useRef(false);

  const drawRoute = (map: MapLibreMap, coordinates: [number, number][]) => {
    if (!coordinates.length || !map.isStyleLoaded()) return;
    const data = { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates } };
    if (!map.getSource('route')) {
      map.addSource('route', { type: 'geojson', data });
      map.addLayer({ id: 'route-outline', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .92 } });
      map.addLayer({ id: 'route-main', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1577ff', 'line-width': 6 } });
    } else {
      (map.getSource('route') as GeoJSONSource).setData(data);
    }
  };

  useEffect(() => {
    if (!node.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: node.current,
      center: [pickup.lng, pickup.lat],
      zoom: 13,
      minZoom: 3,
      maxZoom: 19,
      maxPitch: 70,
      attributionControl: false,
      dragRotate: true,
      pitchWithRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      style: makeStyle('light', true),
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(makeStyle(mapMode, labelsOn));
    map.once('styledata', () => drawRoute(map, routeCoords.current));
  }, [mapMode, labelsOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickupMarker.current?.remove();
    pickupMarker.current = new maplibregl.Marker({ color: '#1577ff' }).setLngLat([pickup.lng, pickup.lat]).addTo(map);
    map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 15, duration: 650 });
  }, [pickup.lat, pickup.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !command) return;
    if (command.type === 'zoomIn') map.zoomIn({ duration: 260 });
    if (command.type === 'zoomOut') map.zoomOut({ duration: 260 });
    if (command.type === 'recenter') map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 16, duration: 500 });
    if (command.type === 'resetBearing') map.easeTo({ bearing: 0, duration: 400 });
    if (command.type === 'toggleTilt') {
      tiltRef.current = !tiltRef.current;
      map.easeTo({ pitch: tiltRef.current ? 55 : 0, duration: 500 });
    }
  }, [command?.nonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    destMarker.current?.remove();
    if (!destination) {
      routeCoords.current = [];
      onRouteMeta(null);
      if (map.getLayer('route-main')) map.removeLayer('route-main');
      if (map.getLayer('route-outline')) map.removeLayer('route-outline');
      if (map.getSource('route')) map.removeSource('route');
      return;
    }
    destMarker.current = new maplibregl.Marker({ color: '#eb3645' }).setLngLat([destination.lng, destination.lat]).addTo(map);
    const controller = new AbortController();
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&steps=false`;
    fetch(url, { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('route')))
      .then(data => {
        const route = data?.routes?.[0];
        const coordinates = route?.geometry?.coordinates as [number, number][] | undefined;
        if (!coordinates?.length) throw new Error('route');
        routeCoords.current = coordinates;
        onRouteMeta({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 });
        const draw = () => {
          drawRoute(map, coordinates);
          const bounds = new LngLatBounds();
          coordinates.forEach(c => bounds.extend(c));
          map.fitBounds(bounds, { padding: { top: 205, right: 65, bottom: 360, left: 65 }, maxZoom: 14.8, duration: 650 });
        };
        if (map.isStyleLoaded()) draw(); else map.once('styledata', draw);
      })
      .catch(() => {
        const fallback: [number, number][] = [[pickup.lng, pickup.lat], [destination.lng, destination.lat]];
        routeCoords.current = fallback;
        onRouteMeta(null);
        const draw = () => drawRoute(map, fallback);
        if (map.isStyleLoaded()) draw(); else map.once('styledata', draw);
      });
    return () => controller.abort();
  }, [destination?.lat, destination?.lng, pickup.lat, pickup.lng]);

  return <div ref={node} className="map" />;
}

function RideSheet({ destination, routeMeta, onPickDestination, onSelect, onShowAll }: { destination: Place | null; routeMeta: RouteMeta; onPickDestination: () => void; onSelect: (p: Provider) => void; onShowAll: () => void }) {
  if (!destination) {
    return (
      <section className="ride-sheet empty">
        <div className="sheet-handle" />
        <div className="empty-icon"><MapPin size={22}/></div>
        <h2>رايح فين؟</h2>
        <p>اختار وجهتك الأول وبعدها هنظهر لك المقارنة بين التطبيقات.</p>
        <button className="primary-cta" onClick={onPickDestination}>حدد رايح فين <ChevronLeft size={18}/></button>
      </section>
    );
  }
  const preview = providers.slice(0, 6);
  return (
    <section className="ride-sheet">
      <div className="sheet-handle" />
      <div className="sheet-title">
        <div><h2>اختر رحلتك الأنسب</h2><p>أسعار تقديرية للتجربة وليست Live</p></div>
        <button onClick={onShowAll}>عرض الكل ({providers.length})</button>
      </div>
      {routeMeta && <div className="route-meta"><span><Navigation size={14}/>{routeMeta.distanceKm.toFixed(1)} كم</span><span><Clock3 size={14}/>{Math.round(routeMeta.durationMin)} دقيقة</span></div>}
      <div className="provider-grid">
        {preview.map(p => (
          <button className="provider-card" key={p.id} onClick={() => onSelect(p)}>
            <ProviderLogo provider={p}/>
            <span className="provider-copy"><strong>{p.name}</strong><small>{p.eta}</small></span>
            <span className="provider-price">{money(p)}</span>
            <ChevronLeft size={17}/>
          </button>
        ))}
      </div>
      <button className="book-best" onClick={() => onSelect(providers.reduce((a,b)=>a.minFare < b.minFare ? a : b))}>
        <span>احجز الرحلة الأفضل الآن</span><b>Book Best Ride</b><ArrowLeft size={21}/>
      </button>
    </section>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="provider-logo" style={{ background: provider.brand }}>
      {provider.logoDomain && !failed ? <img src={favicon(provider.logoDomain)} alt="" onError={() => setFailed(true)} /> : <b>{provider.mark}</b>}
    </span>
  );
}

function Picker({ mode, recentPlaces, onClose, onChoose, onLocate }: { mode: PickerMode; recentPlaces: Place[]; onClose: () => void; onChoose: (p: Place) => void; onLocate: () => void }) {
  const [query, setQuery] = useState('');
  const base = mode === 'recent' ? recentPlaces : places;
  const filtered = useMemo(() => base.filter(p => `${p.name} ${p.detail}`.includes(query.trim())), [query, base]);
  const heading = mode === 'pickup' ? 'هتتحرك منين؟' : mode === 'home' ? 'احفظ مكان البيت' : mode === 'work' ? 'احفظ مكان العمل' : mode === 'recent' ? 'الوجهات الحديثة' : 'رايح فين؟';
  return (
    <div className="modal-layer">
      <section className="picker-sheet">
        <header><div><small>{mode === 'pickup' ? 'نقطة البداية' : 'اختيار مكان'}</small><h2>{heading}</h2></div><button onClick={onClose}><X size={20}/></button></header>
        <label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="دور على منطقة أو مكان"/></label>
        {mode === 'pickup' && <button className="current-location" onClick={onLocate}><LocateFixed size={19}/><span><strong>استخدم موقعي الحالي</strong><small>GPS</small></span><ChevronLeft size={18}/></button>}
        <div className="places-list">
          {filtered.length ? filtered.map(p => <button key={`${p.name}-${p.lat}`} onClick={()=>onChoose(p)}><span className="place-icon"><MapPin size={18}/></span><span><strong>{p.name}</strong><small>{p.detail}</small></span><ChevronLeft size={17}/></button>) : <div className="picker-empty">مفيش أماكن محفوظة هنا لسه</div>}
        </div>
      </section>
    </div>
  );
}

function ProviderSheet({ provider, onClose, onOpen }: { provider: Provider; onClose: () => void; onOpen: () => void }) {
  return (
    <div className="modal-layer">
      <section className="provider-sheet-modal">
        <button className="modal-close" onClick={onClose}><X size={20}/></button>
        <ProviderLogo provider={provider}/>
        <h2>{provider.name}</h2>
        <p>{provider.routePrefill ? 'يفتح بالمشوار المحدد' : provider.packageName ? 'يفتح التطبيق الأصلي' : 'يفتح المصدر الرسمي'}</p>
        <div className="offer-facts"><span><Clock3 size={17}/>{provider.eta}</span><span><WalletCards size={17}/>{money(provider)}</span></div>
        <button className="primary-cta" onClick={onOpen}>افتح {provider.name} <ChevronLeft size={18}/></button>
        <small className="legal-note">الحجز والدفع يتمان داخل تطبيق الشركة الأصلية. الأسعار المعروضة هنا تجريبية.</small>
      </section>
    </div>
  );
}

function AllProvidersSheet({ onClose, onSelect }: { onClose: () => void; onSelect: (p: Provider) => void }) {
  return (
    <div className="modal-layer">
      <section className="picker-sheet all-providers-sheet">
        <header><div><small>12 شركة متاحة</small><h2>كل تطبيقات الرحلات</h2></div><button onClick={onClose}><X size={20}/></button></header>
        <div className="all-provider-list">
          {providers.map(p => <button key={p.id} onClick={() => onSelect(p)}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>{p.routePrefill ? 'يفتح بالمشوار' : p.packageName ? 'يفتح التطبيق' : 'رابط رسمي'}</small></span><span className="provider-price">{money(p)}</span><ChevronLeft size={17}/></button>)}
        </div>
      </section>
    </div>
  );
}

function TripsScreen({ history }: { history: Trip[] }) {
  return <section className="page"><PageHeader title="رحلاتي" subtitle="كل رحلاتك السابقة في مكان واحد" />
    <div className="page-body">{history.length ? history.map((t,i)=><div className="trip-card" key={`${t.provider}-${i}`}><div className="trip-icon"><Car size={20}/></div><div><strong>{t.provider}</strong><p>{t.route}</p><small>{t.date}</small></div><div className="trip-money"><strong>{t.price} ج.م</strong><small>وفرت {t.saved} ج.م</small></div></div>) : <EmptyState icon={<Car/>} title="لسه مفيش رحلات" text="أول ما تفتح شركة من رايح، هتظهر الرحلة هنا."/>}</div>
  </section>;
}

function OffersScreen({ onAction }: { onAction: (s:string)=>void }) {
  const [code, setCode] = useState('');
  return <section className="page"><PageHeader title="العروض والتوفير" subtitle="مكافآت وعروض نموذجية داخل RAYEH" />
    <div className="page-body">
      <div className="points-card"><span><Gift size={26}/></span><div><small>تجريبي</small><h2>1,250 نقطة</h2><p>نقاطك الحالية</p></div><button onClick={()=>onAction('استبدال النقاط سيكون متاحًا بعد إطلاق برنامج المكافآت.')}>استبدال النقاط</button></div>
      <div className="promo-card"><Percent size={34}/><div><strong>خصم يصل إلى 50%</strong><p>عرض نموذجي على رحلتك القادمة</p><b>EGY50</b></div><button onClick={()=>navigator.clipboard?.writeText('EGY50').then(()=>onAction('تم نسخ الكود')).catch(()=>onAction('الكود: EGY50'))}>نسخ الكود</button></div>
      <h3 className="section-title">خصومات الشركاء المباشرة</h3>
      <div className="partner-offers">{providers.slice(0,4).map(p=><button key={p.id} onClick={()=>window.open(p.webUrl,'_blank','noopener,noreferrer')}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>عرض نموذجي — افتح المصدر الرسمي</small></span><ChevronLeft size={17}/></button>)}</div>
      <h3 className="section-title">إدخال الكود الترويجي</h3>
      <div className="promo-input"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="أدخل كود الخصم هنا..."/><button onClick={()=>onAction(code.trim() ? `تم تطبيق ${code.trim()} كتجربة` : 'اكتب كود الأول')}>تطبيق</button></div>
      <div className="daily-offer"><Sparkles/><div><strong>عرض يومي تجريبي</strong><small>شارك التطبيق مع صديق لتحصل على مكافأة عند إطلاق البرنامج.</small></div></div>
    </div>
  </section>;
}

function ProfileScreen({ history, onAction }: { history: Trip[]; onAction: (s:string)=>void }) {
  return <section className="page"><PageHeader title="الملف الشخصي" subtitle="حسابك وإعداداتك" />
    <div className="profile-head"><div className="avatar-ring"><div className="avatar">G</div></div><h2>Guest</h2><p>حساب ضيف — سجّل الدخول لاحقًا لمزامنة بياناتك</p><button onClick={()=>onAction('ربط الحساب سيُضاف مع نظام تسجيل الدخول')}>تعديل الحساب</button></div>
    <div className="profile-stats"><div><WalletCards/><span><strong>0 ج.م</strong><small>المحفظة</small></span></div><div><Car/><span><strong>{history.length}</strong><small>الرحلات</small></span></div><div><Sparkles/><span><strong>1,250</strong><small>النقاط التجريبية</small></span></div></div>
    <div className="profile-menu">
      <ProfileRow icon={<WalletCards/>} title="المحفظة وطرق الدفع" sub="إدارة وسائل الدفع" onClick={()=>onAction('قسم المحفظة جاهز للربط ببوابة الدفع')}/>
      <ProfileRow icon={<Clock3/>} title="تاريخ رحلاتي" sub={`${history.length} رحلة محفوظة`} onClick={()=>onAction('افتح تبويب رحلاتي من الشريط السفلي')}/>
      <ProfileRow icon={<MapPin/>} title="الأماكن المفضلة" sub="البيت والعمل والوجهات الحديثة" onClick={()=>onAction('تقدر تحفظ البيت والعمل من أزرار الخريطة')}/>
      <ProfileRow icon={<Gift/>} title="العروض والخصومات" sub="النقاط وأكواد التوفير" onClick={()=>onAction('افتح تبويب العروض من الشريط السفلي')}/>
      <ProfileRow icon={<Heart/>} title="تفضيل الشركاء" sub="Uber وCareem وDiDi والمزيد" onClick={()=>onAction(`متاح حاليًا ${providers.length} مزود`)}/>
      <ProfileRow icon={<LifeBuoy/>} title="الدعم والمساعدة" sub="مركز المساعدة" onClick={()=>onAction('الدعم داخل التطبيق قيد الربط')}/>
      <ProfileRow icon={<ShieldCheck/>} title="الأمان والطوارئ" sub="مشاركة الرحلة وجهات الاتصال" onClick={()=>onAction('ميزة الأمان تُفعل مع الرحلات الحية')}/>
      <ProfileRow icon={<Phone/>} title="دعوة الأصدقاء" sub="شارك RAYEH" onClick={()=>navigator.share?.({title:'RAYEH',text:'جرّب RAYEH لمقارنة الرحلات'}).catch(()=>onAction('انسخ رابط التطبيق وشاركه مع أصحابك'))}/>
    </div>
    <button className="logout" onClick={()=>onAction('أنت حاليًا تستخدم وضع Guest')}><LogOut size={20}/> تسجيل الخروج</button>
  </section>;
}

function ProfileRow({ icon, title, sub, onClick }: { icon: React.ReactNode; title:string; sub:string; onClick:()=>void }) {
  return <button onClick={onClick}><span className="profile-row-icon">{icon}</span><span><strong>{title}</strong><small>{sub}</small></span><ChevronLeft size={18}/></button>;
}
function PageHeader({ title, subtitle }: { title:string; subtitle:string }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="page-brand">R</div></header>;
}
function EmptyState({ icon, title, text }: { icon:React.ReactNode; title:string; text:string }) {
  return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{text}</p></div>;
}
function BottomNav({ tab, onTab }: { tab:Tab; onTab:(t:Tab)=>void }) {
  const items = [
    {id:'home' as Tab,label:'الرئيسية',icon:Home},
    {id:'trips' as Tab,label:'رحلاتي',icon:Car},
    {id:'offers' as Tab,label:'العروض',icon:Tag},
    {id:'profile' as Tab,label:'الملف الشخصي',icon:UserRound},
  ];
  return <nav className="bottom-nav">{items.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>onTab(id)}><Icon size={22}/><span>{label}</span></button>)}</nav>;
}

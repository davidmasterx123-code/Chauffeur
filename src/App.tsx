import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import maplibregl, { LngLatBounds, type GeoJSONSource, type Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import type { Session } from '@supabase/supabase-js';
import {
  Apple,
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Car,
  ChevronLeft,
  Clock3,
  Compass,
  Gift,
  History,
  Home,
  Layers3,
  LocateFixed,
  LogOut,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { authConfigured, supabase } from './lib/supabase';

type Tab = 'home' | 'trips' | 'offers' | 'profile';
type MapMode = 'light' | 'dark' | 'satellite';
type PickerMode = 'pickup' | 'destination' | 'home' | 'work' | 'recent';
type LocationStatus = 'locating' | 'ready' | 'denied' | 'error';
type Place = { name: string; detail: string; lat: number; lng: number };
type RouteMeta = { distanceKm: number; durationMin: number } | null;
type MapCommand = { type: 'zoomIn' | 'zoomOut' | 'recenter' | 'resetBearing' | 'toggleTilt'; nonce: number } | null;
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
  { id: 'indrive', name: 'inDrive', mark: 'iD', brand: '#91d400', minFare: 195, maxFare: 225, eta: '6 دقائق', packageName: 'sinet.startup.inDriver', webUrl: 'https://play.google.com/store/apps/details?id=sinet.startup.inDriver', logoDomain: 'indrive.com' },
  { id: 'arrw', name: 'ARRW', mark: 'A', brand: '#1676ff', minFare: 205, maxFare: 220, eta: '6 دقائق', packageName: 'com.arrw.arrwClient', webUrl: 'https://www.arrw.com/', logoDomain: 'arrw.com' },
  { id: 'goway', name: 'Go Way', mark: 'GW', brand: '#7357ff', minFare: 215, maxFare: 245, eta: '7 دقائق', webUrl: 'https://www.gowayapps.com/', logoDomain: 'gowayapps.com' },
  { id: 'drivo', name: 'Drivo', mark: 'Dr', brand: '#1653d8', minFare: 220, maxFare: 250, eta: '7 دقائق', packageName: 'com.app.ts.drivo', webUrl: 'https://drivoeg.com/', logoDomain: 'drivoeg.com' },
  { id: 'pink', name: 'Pink Taxi', mark: 'P', brand: '#e64591', minFare: 225, maxFare: 255, eta: '8 دقائق', packageName: 'com.multibrains.taxi.passenger.pinktaxiegypt', webUrl: 'https://play.google.com/store/apps/details?id=com.multibrains.taxi.passenger.pinktaxiegypt' },
  { id: 'capital', name: 'New Capital Cab', mark: 'NC', brand: '#b98a36', minFare: 240, maxFare: 280, eta: '8 دقائق', webUrl: 'https://apps.apple.com/eg/app/new-capital-cab/id6505035461' },
  { id: 'caroute', name: 'Caroute', mark: 'CR', brand: '#2f7b70', minFare: 200, maxFare: 235, eta: '6 دقائق', packageName: 'com.caroute.riderapp', webUrl: 'https://play.google.com/store/apps/details?id=com.caroute.riderapp' },
  { id: 'gomini', name: 'GoMini', mark: 'GM', brand: '#cf5137', minFare: 180, maxFare: 210, eta: '8 دقائق', packageName: 'com.gomini.gominipassenger', webUrl: 'https://play.google.com/store/apps/details?id=com.gomini.gominipassenger' },
  { id: 'swvl', name: 'Swvl', mark: 'S', brand: '#f05b39', minFare: 70, maxFare: 70, eta: 'موعد محدد', packageName: 'io.swvl.customer', webUrl: 'https://play.google.com/store/apps/details?id=io.swvl.customer', logoDomain: 'swvl.com' },
];

const favicon = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
const money = (p: Provider) => p.minFare === p.maxFare ? `${p.minFare} ج.م` : `${p.minFare}–${p.maxFare} ج.م`;

function loadJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [pickup, setPickup] = useState<Place>(cairoFallback);
  const [destination, setDestination] = useState<Place | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [allProvidersOpen, setAllProvidersOpen] = useState(false);
  const [history, setHistory] = useState<Trip[]>(() => loadJson('rayeh-history', []));
  const [recentPlaces, setRecentPlaces] = useState<Place[]>(() => loadJson('rayeh-recent-places', []));
  const [savedHome, setSavedHome] = useState<Place | null>(() => loadJson('rayeh-home', null));
  const [savedWork, setSavedWork] = useState<Place | null>(() => loadJson('rayeh-work', null));
  const [toast, setToast] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const locate = (announce = true) => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      if (announce) notify('GPS غير متاح على الجهاز. اختار نقطة البداية يدويًا.');
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPickup({ name: 'موقعي الحالي', detail: 'تم تحديده من GPS', lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('ready');
        if (announce) notify('تم تحديد موقعك');
      },
      err => {
        setLocationStatus(err.code === 1 ? 'denied' : 'error');
        if (announce) notify(err.code === 1 ? 'فعّل إذن الموقع للتطبيق ثم جرّب تاني.' : 'تعذر تحديد الموقع حاليًا.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => locate(false), []);

  const rememberDestination = (p: Place) => {
    const next = [p, ...recentPlaces.filter(x => x.name !== p.name)].slice(0, 8);
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
      notify('تم حفظ البيت');
    } else if (picker === 'work') {
      setSavedWork(p);
      localStorage.setItem('rayeh-work', JSON.stringify(p));
      setDestination(p);
      rememberDestination(p);
      notify('تم حفظ العمل');
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
    } else {
      setPicker(type);
    }
  };

  const openProvider = (provider: Provider) => {
    if (!destination) return notify('اختار وجهتك الأول');
    const trip: Trip = {
      provider: provider.name,
      route: `${pickup.name} ← ${destination.name}`,
      price: provider.minFare,
      saved: Math.max(0, Math.max(...providers.map(p => p.minFare)) - provider.minFare),
      date: new Date().toLocaleString('ar-EG'),
    };
    const next = [trip, ...history].slice(0, 20);
    setHistory(next);
    localStorage.setItem('rayeh-history', JSON.stringify(next));

    if (provider.id === 'uber') {
      const url = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(destination.name)}`;
      window.location.href = url;
      return;
    }

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid && provider.packageName) {
      const fallback = encodeURIComponent(provider.webUrl);
      window.location.href = `intent://#Intent;package=${provider.packageName};S.browser_fallback_url=${fallback};end`;
      return;
    }
    window.open(provider.webUrl, '_blank', 'noopener,noreferrer');
  };

  const signIn = async (provider: 'google' | 'apple' | 'x') => {
    if (!supabase) {
      notify('الواجهة جاهزة. الربط النهائي يحتاج مشروع Supabase ومفاتيح OAuth.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) notify(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('تم تسجيل الخروج');
  };

  return (
    <main className="app-shell">
      <div className="phone-shell">
        {tab === 'home' && (
          <HomeScreen
            pickup={pickup}
            destination={destination}
            locationStatus={locationStatus}
            savedHome={savedHome}
            savedWork={savedWork}
            recentPlaces={recentPlaces}
            session={session}
            onLocate={() => locate(true)}
            onPick={setPicker}
            onQuickDestination={quickDestination}
            onSelectProvider={setSelectedProvider}
            onShowAll={() => setAllProvidersOpen(true)}
            onAccount={() => session ? setTab('profile') : setAuthOpen(true)}
          />
        )}
        {tab === 'trips' && <TripsScreen history={history} />}
        {tab === 'offers' && <OffersScreen onAction={notify} />}
        {tab === 'profile' && <ProfileScreen session={session} history={history} onLogin={() => setAuthOpen(true)} onLogout={signOut} onAction={notify} />}

        <BottomNav tab={tab} onTab={setTab} />

        {picker && <Picker mode={picker} recentPlaces={recentPlaces} onClose={() => setPicker(null)} onChoose={choosePlace} onLocate={() => { locate(true); setPicker(null); }} />}
        {selectedProvider && <ProviderSheet provider={selectedProvider} onClose={() => setSelectedProvider(null)} onOpen={() => openProvider(selectedProvider)} />}
        {allProvidersOpen && <AllProvidersSheet onClose={() => setAllProvidersOpen(false)} onSelect={p => { setAllProvidersOpen(false); setSelectedProvider(p); }} />}
        {authOpen && <AuthSheet session={session} onClose={() => setAuthOpen(false)} onSignIn={signIn} onSignOut={signOut} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  );
}

function HomeScreen({
  pickup, destination, locationStatus, savedHome, savedWork, recentPlaces, session,
  onLocate, onPick, onQuickDestination, onSelectProvider, onShowAll, onAccount,
}: {
  pickup: Place;
  destination: Place | null;
  locationStatus: LocationStatus;
  savedHome: Place | null;
  savedWork: Place | null;
  recentPlaces: Place[];
  session: Session | null;
  onLocate: () => void;
  onPick: (t: PickerMode) => void;
  onQuickDestination: (t: 'home' | 'work') => void;
  onSelectProvider: (p: Provider) => void;
  onShowAll: () => void;
  onAccount: () => void;
}) {
  const [mapMode, setMapMode] = useState<MapMode>('light');
  const [labelsOn, setLabelsOn] = useState(true);
  const [tilted, setTilted] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [command, setCommand] = useState<MapCommand>(null);
  const [routeMeta, setRouteMeta] = useState<RouteMeta>(null);
  const run = (type: NonNullable<MapCommand>['type']) => setCommand({ type, nonce: Date.now() });
  const avatar = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture;

  return (
    <section className="screen home-screen">
      <MapView pickup={pickup} destination={destination} mapMode={mapMode} labelsOn={labelsOn} command={command} onRouteMeta={setRouteMeta} />
      <div className="map-fade" />

      <header className="map-header">
        <div className="brand-lockup"><span className="brand-mark">R</span><div><strong>RAYEH</strong><small>رايح</small></div></div>
        <div className="header-actions">
          <button className="round-icon" onClick={() => alert('مفيش إشعارات جديدة')} aria-label="الإشعارات"><Bell size={19}/></button>
          <button className="avatar-button" onClick={onAccount} aria-label="الحساب">
            {avatar ? <img src={avatar} alt=""/> : <UserRound size={19}/>}<span className={session ? 'online-dot' : 'guest-dot'} />
          </button>
        </div>
      </header>

      <div className="route-card">
        <button className="route-row" onClick={() => onPick('pickup')}><span className="pin-dot"/><span><small>منين؟</small><strong>{pickup.name}</strong></span></button>
        <div className="route-divider"/>
        <button className="route-row" onClick={() => onPick('destination')}><MapPin className="dest-pin" size={21}/><span><small>رايح فين؟</small><strong>{destination?.name ?? 'اختار وجهتك'}</strong></span></button>
      </div>

      <div className="quick-row">
        <button onClick={() => onQuickDestination('home')} className={savedHome ? 'saved' : ''}><Home size={18}/><span>{savedHome ? 'البيت' : 'حفظ البيت'}</span></button>
        <button onClick={() => onQuickDestination('work')} className={savedWork ? 'saved' : ''}><BriefcaseBusiness size={18}/><span>{savedWork ? 'العمل' : 'حفظ العمل'}</span></button>
        <button onClick={() => onPick('recent')} disabled={!recentPlaces.length}><History size={18}/><span>حديثة</span></button>
      </div>

      <div className="map-dock" dir="ltr">
        <button onClick={onLocate} aria-label="موقعي"><LocateFixed size={19}/></button>
        <span className="dock-separator"/>
        <button onClick={() => run('zoomIn')} aria-label="تكبير"><Plus size={19}/></button>
        <button onClick={() => run('zoomOut')} aria-label="تصغير"><Minus size={19}/></button>
        <span className="dock-separator"/>
        <button className={mapMenuOpen ? 'active' : ''} onClick={() => setMapMenuOpen(v => !v)} aria-label="خيارات الخريطة"><Layers3 size={19}/></button>
      </div>

      {mapMenuOpen && (
        <div className="map-panel">
          <div className="panel-head"><div><strong>خيارات الخريطة</strong><small>الشكل والتحكم</small></div><button onClick={() => setMapMenuOpen(false)}><X size={17}/></button></div>
          <div className="map-style-grid">
            <button className={mapMode === 'light' ? 'active' : ''} onClick={() => setMapMode('light')}><span className="style-preview light"/>عادية</button>
            <button className={mapMode === 'dark' ? 'active' : ''} onClick={() => setMapMode('dark')}><span className="style-preview dark"/>داكنة</button>
            <button className={mapMode === 'satellite' ? 'active' : ''} onClick={() => setMapMode('satellite')}><span className="style-preview satellite"/>قمر صناعي</button>
          </div>
          <button className="map-setting-row" onClick={() => setLabelsOn(v => !v)}><span><Layers3 size={17}/> أسماء الشوارع</span><b className={labelsOn ? 'toggle on' : 'toggle'}><i/></b></button>
          <button className="map-setting-row" onClick={() => { setTilted(v => !v); run('toggleTilt'); }}><span><Compass size={17}/> منظور 3D</span><b className={tilted ? 'toggle on' : 'toggle'}><i/></b></button>
          <button className="map-setting-row" onClick={() => run('resetBearing')}><span><RotateCcw size={17}/> إعادة اتجاه الشمال</span><ChevronLeft size={17}/></button>
          <button className="map-setting-row" onClick={() => run('recenter')}><span><Navigation size={17}/> توسيط على موقعي</span><ChevronLeft size={17}/></button>
        </div>
      )}

      {locationStatus !== 'ready' && (
        <button className="gps-pill" onClick={onLocate}>
          <LocateFixed size={17}/><span><strong>{locationStatus === 'locating' ? 'بنحدد موقعك…' : 'فعّل موقعك'}</strong><small>{locationStatus === 'denied' ? 'الإذن مقفول' : 'GPS'}</small></span><ChevronLeft size={16}/>
        </button>
      )}

      <RideSheet destination={destination} routeMeta={routeMeta} onPickDestination={() => onPick('destination')} onSelect={onSelectProvider} onShowAll={onShowAll}/>
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
      map.addLayer({ id: 'route-outline', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .94 } });
      map.addLayer({ id: 'route-main', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#176BFF', 'line-width': 5.5 } });
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
    pickupMarker.current = new maplibregl.Marker({ color: '#176BFF' }).setLngLat([pickup.lng, pickup.lat]).addTo(map);
    map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 15, duration: 550 });
  }, [pickup.lat, pickup.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !command) return;
    if (command.type === 'zoomIn') map.zoomIn({ duration: 220 });
    if (command.type === 'zoomOut') map.zoomOut({ duration: 220 });
    if (command.type === 'recenter') map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 16, duration: 450 });
    if (command.type === 'resetBearing') map.easeTo({ bearing: 0, duration: 350 });
    if (command.type === 'toggleTilt') {
      tiltRef.current = !tiltRef.current;
      map.easeTo({ pitch: tiltRef.current ? 55 : 0, duration: 450 });
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

    destMarker.current = new maplibregl.Marker({ color: '#EC334B' }).setLngLat([destination.lng, destination.lat]).addTo(map);
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
          map.fitBounds(bounds, { padding: { top: 210, right: 55, bottom: 315, left: 55 }, maxZoom: 14.8, duration: 600 });
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

  return <div ref={node} className="map"/>;
}

function RideSheet({ destination, routeMeta, onPickDestination, onSelect, onShowAll }: { destination: Place | null; routeMeta: RouteMeta; onPickDestination: () => void; onSelect: (p: Provider) => void; onShowAll: () => void }) {
  if (!destination) {
    return <section className="ride-sheet empty"><div className="sheet-handle"/><div className="empty-icon"><MapPin size={22}/></div><h2>رايح فين؟</h2><p>حدد وجهتك، وبعدها نقارن لك التطبيقات المتاحة.</p><button className="primary-cta" onClick={onPickDestination}>حدد وجهتك <ChevronLeft size={18}/></button></section>;
  }
  return (
    <section className="ride-sheet">
      <div className="sheet-handle"/>
      <div className="sheet-title"><div><h2>قارن الرحلات</h2><p>الأسعار الحالية تجريبية لحين الربط الرسمي</p></div><button onClick={onShowAll}>عرض الكل ({providers.length})</button></div>
      {routeMeta && <div className="route-meta"><span><Navigation size={14}/>{routeMeta.distanceKm.toFixed(1)} كم</span><span><Clock3 size={14}/>{Math.round(routeMeta.durationMin)} دقيقة</span></div>}
      <div className="provider-strip">{providers.slice(0, 5).map(p => <button className="provider-mini" key={p.id} onClick={() => onSelect(p)}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>{p.eta}</small></span><b>{money(p)}</b></button>)}</div>
      <button className="book-best" onClick={() => onSelect(providers.reduce((a,b) => a.minFare < b.minFare ? a : b))}><span>اختار أقل سعر</span><b>Best Price</b><ArrowLeft size={20}/></button>
    </section>
  );
}

function ProviderLogo({ provider }: { provider: Provider }) {
  const [failed, setFailed] = useState(false);
  return <span className="provider-logo" style={{ background: provider.brand }}>{provider.logoDomain && !failed ? <img src={favicon(provider.logoDomain)} alt="" onError={() => setFailed(true)}/> : <b>{provider.mark}</b>}</span>;
}

function Picker({ mode, recentPlaces, onClose, onChoose, onLocate }: { mode: PickerMode; recentPlaces: Place[]; onClose: () => void; onChoose: (p: Place) => void; onLocate: () => void }) {
  const [query, setQuery] = useState('');
  const base = mode === 'recent' ? recentPlaces : places;
  const filtered = useMemo(() => base.filter(p => `${p.name} ${p.detail}`.includes(query.trim())), [query, base]);
  const title = mode === 'pickup' ? 'هتتحرك منين؟' : mode === 'home' ? 'احفظ البيت' : mode === 'work' ? 'احفظ العمل' : mode === 'recent' ? 'الوجهات الحديثة' : 'رايح فين؟';
  return <Modal><section className="sheet-modal"><div className="modal-head"><div><small>اختيار مكان</small><h2>{title}</h2></div><button onClick={onClose}><X size={19}/></button></div><label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن منطقة أو مكان"/></label>{mode === 'pickup' && <button className="location-row" onClick={onLocate}><LocateFixed size={19}/><span><strong>استخدم موقعي الحالي</strong><small>GPS</small></span><ChevronLeft size={17}/></button>}<div className="places-list">{filtered.length ? filtered.map(p => <button key={`${p.name}-${p.lat}`} onClick={() => onChoose(p)}><span className="place-icon"><MapPin size={18}/></span><span><strong>{p.name}</strong><small>{p.detail}</small></span><ChevronLeft size={17}/></button>) : <div className="empty-list">مفيش نتائج</div>}</div></section></Modal>;
}

function ProviderSheet({ provider, onClose, onOpen }: { provider: Provider; onClose: () => void; onOpen: () => void }) {
  return <Modal><section className="provider-modal"><button className="modal-close" onClick={onClose}><X size={19}/></button><ProviderLogo provider={provider}/><h2>{provider.name}</h2><p>{provider.routePrefill ? 'المشوار هيتبعت جاهز للتطبيق' : provider.packageName ? 'هنحاول نفتح التطبيق مباشرة' : 'هنفتح المصدر الرسمي'}</p><div className="offer-facts"><span><Clock3 size={16}/>{provider.eta}</span><span><WalletCards size={16}/>{money(provider)}</span></div><button className="primary-cta" onClick={onOpen}>افتح {provider.name} <ChevronLeft size={18}/></button><small className="legal-note">الحجز والدفع داخل تطبيق الشركة الأصلية. الأسعار المعروضة تجريبية.</small></section></Modal>;
}

function AllProvidersSheet({ onClose, onSelect }: { onClose: () => void; onSelect: (p: Provider) => void }) {
  return <Modal><section className="sheet-modal all-providers"><div className="modal-head"><div><small>{providers.length} تطبيق</small><h2>كل تطبيقات الرحلات</h2></div><button onClick={onClose}><X size={19}/></button></div><div className="all-provider-list">{providers.map(p => <button key={p.id} onClick={() => onSelect(p)}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>{p.eta}</small></span><b>{money(p)}</b><ChevronLeft size={17}/></button>)}</div></section></Modal>;
}

function AuthSheet({ session, onClose, onSignIn, onSignOut }: { session: Session | null; onClose: () => void; onSignIn: (p: 'google'|'apple'|'x') => void; onSignOut: () => void }) {
  const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email || 'حسابك';
  return <Modal><section className="auth-sheet"><button className="modal-close" onClick={onClose}><X size={19}/></button><div className="auth-brand"><span>R</span><strong>RAYEH</strong><small>حساب واحد لكل رحلاتك</small></div>{session ? <div className="signed-card"><UserRound size={28}/><div><small>مسجل دخول</small><strong>{name}</strong></div><button onClick={onSignOut}><LogOut size={17}/> خروج</button></div> : <><h2>تسجيل الدخول</h2><p>ادخل بحسابك عشان تحفظ الرحلات والمفضلة وتزامن بياناتك.</p><div className="social-login"><button className="google" onClick={() => onSignIn('google')}><span className="google-g">G</span><b>المتابعة باستخدام Google</b><ChevronLeft size={17}/></button><button className="apple" onClick={() => onSignIn('apple')}><Apple size={21}/><b>المتابعة باستخدام Apple</b><ChevronLeft size={17}/></button><button className="x-login" onClick={() => onSignIn('x')}><span className="x-mark">X</span><b>المتابعة باستخدام X</b><ChevronLeft size={17}/></button></div>{!authConfigured && <div className="auth-dev-note">واجهة الدخول جاهزة — الربط النهائي يحتاج Supabase + مفاتيح Google / Apple / X.</div>}</>}</section></Modal>;
}

function TripsScreen({ history }: { history: Trip[] }) {
  return <section className="page"><PageHeader title="رحلاتي" subtitle="سجل الرحلات اللي فتحتها من رايح"/><div className="page-body">{history.length ? history.map((t,i)=><div className="trip-card" key={`${t.provider}-${i}`}><div className="trip-icon"><Car size={20}/></div><div><strong>{t.provider}</strong><p>{t.route}</p><small>{t.date}</small></div><div className="trip-money"><strong>{t.price} ج.م</strong><small>وفرت {t.saved} ج.م</small></div></div>) : <EmptyState icon={<Car/>} title="لسه مفيش رحلات" text="اختار رحلة من الرئيسية وهتظهر هنا."/>}</div></section>;
}

function OffersScreen({ onAction }: { onAction: (s:string)=>void }) {
  return <section className="page"><PageHeader title="العروض" subtitle="خصومات وتوفير في مكان واحد"/><div className="page-body"><div className="points-card"><Gift size={28}/><div><small>نقاط تجريبية</small><h2>1,250</h2><p>RAYEH Points</p></div><button onClick={()=>onAction('برنامج النقاط هيتفعل مع الحسابات')}>استبدال</button></div><div className="promo-card"><Sparkles size={30}/><div><strong>وفر في مشوارك</strong><p>قارن قبل ما تحجز</p></div><Tag size={30}/></div><h3 className="section-title">العروض المتاحة</h3><div className="partner-offers">{providers.slice(0,5).map(p=><button key={p.id} onClick={()=>window.open(p.webUrl,'_blank','noopener,noreferrer')}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>افتح المصدر الرسمي</small></span><ChevronLeft size={17}/></button>)}</div></div></section>;
}

function ProfileScreen({ session, history, onLogin, onLogout, onAction }: { session: Session | null; history: Trip[]; onLogin: () => void; onLogout: () => void; onAction:(s:string)=>void }) {
  const meta = session?.user?.user_metadata || {};
  const name = meta.full_name || meta.name || (session ? session.user.email : 'Guest');
  const avatar = meta.avatar_url || meta.picture;
  return <section className="page"><PageHeader title="الملف الشخصي" subtitle="حسابك وإعداداتك"/><div className="profile-head"><div className="avatar-ring"><div className="avatar">{avatar ? <img src={avatar} alt=""/> : <UserRound size={40}/>}</div></div><h2>{name}</h2><p>{session ? session.user.email : 'سجل دخول لمزامنة بياناتك'}</p><button onClick={session ? ()=>onAction('تعديل البيانات هنضيفه في النسخة القادمة') : onLogin}>{session ? 'تعديل الحساب' : 'تسجيل الدخول'}</button></div><div className="profile-stats"><div><WalletCards/><span><strong>0 ج.م</strong><small>المحفظة</small></span></div><div><Car/><span><strong>{history.length}</strong><small>الرحلات</small></span></div><div><ShieldCheck/><span><strong>{session ? 'مفعل' : 'ضيف'}</strong><small>الحساب</small></span></div></div><div className="profile-menu"><ProfileRow title="طرق الدفع" sub="إضافة وإدارة وسائل الدفع" icon={<WalletCards/>} onClick={()=>onAction('ربط الدفع لسه تحت التجهيز')}/><ProfileRow title="الأمان والخصوصية" sub="إعدادات الحساب والأمان" icon={<ShieldCheck/>} onClick={()=>onAction('إعدادات الأمان هتتوسع مع الحسابات')}/></div>{session ? <button className="logout" onClick={onLogout}><LogOut size={19}/> تسجيل الخروج</button> : <button className="login-wide" onClick={onLogin}><UserRound size={19}/> تسجيل الدخول</button>}</section>;
}

function ProfileRow({ title, sub, icon, onClick }: { title:string; sub:string; icon:ReactNode; onClick:()=>void }) {
  return <button onClick={onClick}><span className="profile-row-icon">{icon}</span><span><strong>{title}</strong><small>{sub}</small></span><ChevronLeft size={18}/></button>;
}

function BottomNav({ tab, onTab }: { tab:Tab; onTab:(t:Tab)=>void }) {
  const items = [{id:'home' as Tab,label:'الرئيسية',icon:Home},{id:'trips' as Tab,label:'رحلاتي',icon:Car},{id:'offers' as Tab,label:'العروض',icon:Tag},{id:'profile' as Tab,label:'حسابي',icon:UserRound}];
  return <nav className="bottom-nav">{items.map(({id,label,icon:Icon})=><button key={id} className={tab===id?'active':''} onClick={()=>onTab(id)}><Icon size={21}/><span>{label}</span></button>)}</nav>;
}

function PageHeader({ title, subtitle }: { title:string; subtitle:string }) { return <header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div><div className="page-brand">R</div></header>; }
function EmptyState({ icon, title, text }: { icon:ReactNode; title:string; text:string }) { return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{text}</p></div>; }
function Modal({ children }: { children: ReactNode }) { return <div className="modal-layer">{children}</div>; }

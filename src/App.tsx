import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { LngLatBounds, type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  Car,
  ChevronLeft,
  Clock3,
  Gift,
  Heart,
  History,
  Home,
  LifeBuoy,
  LocateFixed,
  LogOut,
  MapPin,
  Navigation,
  Percent,
  Phone,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

type Tab = 'home' | 'trips' | 'offers' | 'profile';
type LocationStatus = 'locating' | 'ready' | 'denied' | 'error';
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
  routePrefill?: boolean;
};

type Trip = { provider: string; route: string; price: number; date: string; saved: number };

const cairoFallback: Place = { name: 'حدد موقعك', detail: 'اسمح بالوصول للموقع أو اختاره يدويًا', lat: 30.0444, lng: 31.2357 };
const places: Place[] = [
  { name: 'التجمع الخامس', detail: 'القاهرة الجديدة', lat: 30.0074, lng: 31.4913 },
  { name: 'مدينة نصر', detail: 'القاهرة', lat: 30.0511, lng: 31.3656 },
  { name: 'مصر الجديدة', detail: 'القاهرة', lat: 30.091, lng: 31.322 },
  { name: 'المعادي', detail: 'القاهرة', lat: 29.9602, lng: 31.2569 },
  { name: 'المهندسين', detail: 'الجيزة', lat: 30.058, lng: 31.2009 },
  { name: 'الزمالك', detail: 'القاهرة', lat: 30.0615, lng: 31.2197 },
  { name: 'الشيخ زايد', detail: 'الجيزة', lat: 30.049, lng: 30.9762 },
  { name: 'العاصمة الإدارية', detail: 'شرق القاهرة', lat: 30.0131, lng: 31.7525 },
];

const providers: Provider[] = [
  { id: 'uber', name: 'Uber', mark: 'Uber', brand: '#111111', minFare: 230, maxFare: 255, eta: '3 دقائق', routePrefill: true, packageName: 'com.ubercab', webUrl: 'https://m.uber.com/' },
  { id: 'careem', name: 'Careem', mark: 'C', brand: '#13c56b', minFare: 245, maxFare: 270, eta: '5 دقائق', packageName: 'com.careem.acma', webUrl: 'https://www.careem.com/' },
  { id: 'didi', name: 'DiDi', mark: 'D', brand: '#ff6b21', minFare: 210, maxFare: 235, eta: '4 دقائق', packageName: 'com.didiglobal.passenger', webUrl: 'https://web.didiglobal.com/eg/rider/' },
  { id: 'indrive', name: 'inDrive', mark: 'iD', brand: '#93dc18', minFare: 195, maxFare: 225, eta: '6 دقائق', packageName: 'sinet.startup.inDriver', webUrl: 'https://play.google.com/store/apps/details?id=sinet.startup.inDriver' },
  { id: 'arrw', name: 'ARRW', mark: 'A', brand: '#1676ff', minFare: 205, maxFare: 220, eta: '6 دقائق', packageName: 'com.arrw.arrwClient', webUrl: 'https://www.arrw.com/' },
  { id: 'swvl', name: 'Swvl', mark: 'S', brand: '#f05b39', minFare: 70, maxFare: 70, eta: 'موعد محدد', packageName: 'io.swvl.customer', webUrl: 'https://play.google.com/store/apps/details?id=io.swvl.customer' },
];

function loadTrips(): Trip[] {
  try {
    return JSON.parse(localStorage.getItem('rayeh-history') || '[]') as Trip[];
  } catch {
    return [];
  }
}

function money(p: Provider) {
  return p.minFare === p.maxFare ? `${p.minFare} ج.م` : `${p.minFare}–${p.maxFare} ج.م`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [pickup, setPickup] = useState<Place>(cairoFallback);
  const [destination, setDestination] = useState<Place | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [picker, setPicker] = useState<'pickup' | 'destination' | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [history, setHistory] = useState<Trip[]>(loadTrips);
  const [toast, setToast] = useState('');

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
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

  const choosePlace = (p: Place) => {
    if (picker === 'pickup') {
      setPickup(p);
      setLocationStatus('ready');
    } else if (picker === 'destination') {
      setDestination(p);
    }
    setPicker(null);
  };

  const openProvider = (provider: Provider) => {
    if (!destination) return;
    const trip: Trip = {
      provider: provider.name,
      route: `${pickup.name} ← ${destination.name}`,
      price: provider.minFare,
      date: 'اليوم',
      saved: Math.max(0, 270 - provider.minFare),
    };
    const next = [trip, ...history].slice(0, 15);
    setHistory(next);
    localStorage.setItem('rayeh-history', JSON.stringify(next));
    setSelectedProvider(null);

    if (provider.routePrefill) {
      const url = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickup.lat}&pickup[longitude]=${pickup.lng}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`;
      window.location.href = url;
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
            onLocate={() => locate(true)}
            onPick={setPicker}
            onSelectProvider={setSelectedProvider}
          />
        )}
        {tab === 'trips' && <TripsScreen history={history} />}
        {tab === 'offers' && <OffersScreen onAction={notify} />}
        {tab === 'profile' && <ProfileScreen history={history} onAction={notify} />}
        <BottomNav tab={tab} onTab={setTab} />
      </div>

      {picker && <Picker target={picker} onClose={() => setPicker(null)} onChoose={choosePlace} onLocate={() => locate(true)} />}
      {selectedProvider && destination && (
        <ProviderSheet provider={selectedProvider} onClose={() => setSelectedProvider(null)} onOpen={() => openProvider(selectedProvider)} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function HomeScreen({
  pickup,
  destination,
  locationStatus,
  onLocate,
  onPick,
  onSelectProvider,
}: {
  pickup: Place;
  destination: Place | null;
  locationStatus: LocationStatus;
  onLocate: () => void;
  onPick: (t: 'pickup' | 'destination') => void;
  onSelectProvider: (p: Provider) => void;
}) {
  return (
    <section className="screen home-screen">
      <MapView pickup={pickup} destination={destination} locateToken={`${pickup.lat},${pickup.lng}`} />
      <div className="map-fade" />
      <header className="map-header">
        <div className="brand-lockup"><span className="brand-mark">R</span><div><strong>RAYEH</strong><small>رايح</small></div></div>
        <button className="round-icon" aria-label="الإشعارات"><Bell size={20} /></button>
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
        <button onClick={() => onPick('destination')}><Home size={21}/><span>البيت</span></button>
        <button onClick={() => onPick('destination')}><BriefcaseBusiness size={21}/><span>العمل</span></button>
        <button onClick={() => onPick('destination')}><History size={21}/><span>حديثة</span></button>
      </div>

      <div className="map-controls">
        <button onClick={onLocate}><LocateFixed size={21}/></button>
      </div>

      {locationStatus !== 'ready' && (
        <div className="gps-card">
          <LocateFixed size={20} />
          <span><strong>{locationStatus === 'locating' ? 'بنحدد موقعك…' : 'محتاجين موقعك الحقيقي'}</strong><small>{locationStatus === 'denied' ? 'فعّل إذن الموقع أو اختار نقطة البداية يدويًا' : 'اسمح بالوصول للموقع للحصول على نقطة بداية صحيحة'}</small></span>
          <button onClick={onLocate}>حدد موقعي</button>
        </div>
      )}

      <RideSheet destination={destination} onPickDestination={() => onPick('destination')} onSelect={onSelectProvider} />
    </section>
  );
}

function MapView({ pickup, destination, locateToken }: { pickup: Place; destination: Place | null; locateToken: string }) {
  const node = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pickupMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!node.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: node.current,
      center: [pickup.lng, pickup.lat],
      zoom: 13,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: true,
      touchZoomRotate: true,
      style: {
        version: 8,
        sources: {
          streets: {
            type: 'raster',
            tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [{ id: 'streets', type: 'raster', source: 'streets' }],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: false }), 'bottom-left');
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickupMarker.current?.remove();
    pickupMarker.current = new maplibregl.Marker({ color: '#1577ff' }).setLngLat([pickup.lng, pickup.lat]).addTo(map);
    map.easeTo({ center: [pickup.lng, pickup.lat], zoom: 15, duration: 700 });
  }, [locateToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    destMarker.current?.remove();
    if (!destination) return;
    destMarker.current = new maplibregl.Marker({ color: '#eb3645' }).setLngLat([destination.lng, destination.lat]).addTo(map);

    const coordinates: [number, number][] = [
      [pickup.lng, pickup.lat],
      [(pickup.lng * 2 + destination.lng) / 3, (pickup.lat * 2 + destination.lat) / 3 + 0.005],
      [(pickup.lng + destination.lng * 2) / 3, (pickup.lat + destination.lat * 2) / 3 - 0.003],
      [destination.lng, destination.lat],
    ];

    const draw = () => {
      if (!map.getSource('route')) {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } });
        map.addLayer({ id: 'route-outline', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': .92 } });
        map.addLayer({ id: 'route-main', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#1577ff', 'line-width': 6 } });
      } else {
        (map.getSource('route') as GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
      }
      const bounds = new LngLatBounds();
      coordinates.forEach(c => bounds.extend(c));
      map.fitBounds(bounds, { padding: { top: 190, right: 55, bottom: 330, left: 55 }, maxZoom: 14.8, duration: 700 });
    };
    if (map.loaded()) draw(); else map.once('load', draw);
  }, [destination?.lat, destination?.lng, pickup.lat, pickup.lng]);

  return <div ref={node} className="map" />;
}

function RideSheet({ destination, onPickDestination, onSelect }: { destination: Place | null; onPickDestination: () => void; onSelect: (p: Provider) => void }) {
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
  return (
    <section className="ride-sheet">
      <div className="sheet-handle" />
      <div className="sheet-title"><div><h2>اختر رحلتك الأنسب</h2><p>أسعار تقديرية للتجربة وليست Live</p></div><button>عرض الكل</button></div>
      <div className="provider-grid">
        {providers.slice(0, 6).map(p => (
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
  return <span className="provider-logo" style={{ background: provider.brand }}>{provider.mark}</span>;
}

function Picker({ target, onClose, onChoose, onLocate }: { target: 'pickup' | 'destination'; onClose: () => void; onChoose: (p: Place) => void; onLocate: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => places.filter(p => `${p.name} ${p.detail}`.includes(query.trim())), [query]);
  return (
    <div className="modal-layer">
      <section className="picker-sheet">
        <header><div><small>{target === 'pickup' ? 'نقطة البداية' : 'الوجهة'}</small><h2>{target === 'pickup' ? 'هتتحرك منين؟' : 'رايح فين؟'}</h2></div><button onClick={onClose}><X size={20}/></button></header>
        <label className="search-field"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="دور على منطقة أو مكان"/></label>
        {target === 'pickup' && <button className="current-location" onClick={onLocate}><LocateFixed size={19}/><span><strong>استخدم موقعي الحالي</strong><small>GPS</small></span><ChevronLeft size={18}/></button>}
        <div className="places-list">
          {filtered.map(p => <button key={p.name} onClick={()=>onChoose(p)}><span className="place-icon"><MapPin size={18}/></span><span><strong>{p.name}</strong><small>{p.detail}</small></span><ChevronLeft size={17}/></button>)}
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

function TripsScreen({ history }: { history: Trip[] }) {
  return <section className="page"><PageHeader title="رحلاتي" subtitle="كل رحلاتك السابقة في مكان واحد" />
    <div className="page-body">{history.length ? history.map((t,i)=><div className="trip-card" key={`${t.provider}-${i}`}><div className="trip-icon"><Car size={20}/></div><div><strong>{t.provider}</strong><p>{t.route}</p><small>{t.date}</small></div><div className="trip-money"><strong>{t.price} ج.م</strong><small>وفرت {t.saved} ج.م</small></div></div>) : <EmptyState icon={<Car/>} title="لسه مفيش رحلات" text="أول ما تفتح شركة من رايح، هتظهر الرحلة هنا."/>}</div>
  </section>;
}

function OffersScreen({ onAction }: { onAction: (s:string)=>void }) {
  return <section className="page"><PageHeader title="العروض والتوفير" subtitle="مكافآت وعروض نموذجية داخل RAYEH" />
    <div className="page-body">
      <div className="points-card"><span><Gift size={26}/></span><div><small>تجريبي</small><h2>1,250 نقطة</h2><p>نقاطك الحالية</p></div><button onClick={()=>onAction('استبدال النقاط سيكون متاحًا بعد إطلاق برنامج المكافآت.')}>استبدال النقاط</button></div>
      <div className="promo-card"><Percent size={34}/><div><strong>خصم يصل إلى 50%</strong><p>عرض نموذجي على رحلتك القادمة</p><b>EGY50</b></div><button onClick={()=>navigator.clipboard?.writeText('EGY50').then(()=>onAction('تم نسخ الكود'))}>نسخ الكود</button></div>
      <h3 className="section-title">خصومات الشركاء المباشرة</h3>
      <div className="partner-offers">{providers.slice(0,4).map(p=><button key={p.id} onClick={()=>onAction('هذا عرض نموذجي لحين تفعيل عروض الشريك رسميًا.')}><ProviderLogo provider={p}/><span><strong>{p.name}</strong><small>عرض نموذجي · التفاصيل داخل التطبيق الأصلي</small></span><Tag size={20}/></button>)}</div>
      <h3 className="section-title">إدخال الكود الترويجي</h3>
      <div className="promo-input"><input placeholder="أدخل كود الخصم هنا…"/><button onClick={()=>onAction('تم فحص الكود التجريبي')}>تطبيق</button></div>
      <div className="daily-offer"><Gift size={24}/><span><strong>عرض يومي</strong><small>شارك RAYEH مع صديق واحصل على مكافأة عند تفعيل برنامج الإحالة.</small></span></div>
    </div>
  </section>;
}

function ProfileScreen({ history, onAction }: { history: Trip[]; onAction: (s:string)=>void }) {
  const saved = history.reduce((s,t)=>s+t.saved,0);
  return <section className="page"><PageHeader title="الملف الشخصي" subtitle="حسابك وإعداداتك" />
    <div className="profile-head"><div className="avatar-ring"><div className="avatar">G</div></div><h2>Guest</h2><p>سجّل دخولك لإدارة بيانات حسابك</p><button onClick={()=>onAction('تسجيل الدخول سيكون متاحًا عند ربط نظام الحسابات.')}>تسجيل الدخول</button></div>
    <div className="profile-stats"><div><WalletCards/><span><strong>{saved} ج.م</strong><small>التوفير</small></span></div><div><Car/><span><strong>{history.length}</strong><small>الرحلات</small></span></div><div><Gift/><span><strong>1,250</strong><small>النقاط · تجريبي</small></span></div></div>
    <div className="profile-menu">
      <ProfileRow icon={<WalletCards/>} title="المحفظة وطرق الدفع" sub="إدارة طرق الدفع المفضلة" onClick={()=>onAction('المحفظة قيد التفعيل')}/>
      <ProfileRow icon={<History/>} title="تاريخ رحلاتي" sub="رحلاتك السابقة واختياراتك" onClick={()=>onAction('افتح تبويب رحلاتي من الشريط السفلي')}/>
      <ProfileRow icon={<Heart/>} title="الأماكن المفضلة" sub="المنزل، العمل، أماكن أخرى" onClick={()=>onAction('الأماكن المفضلة قيد التفعيل')}/>
      <ProfileRow icon={<Gift/>} title="العروض والخصومات" sub="أكواد التوفير والعروض" onClick={()=>onAction('افتح تبويب العروض')}/>
      <ProfileRow icon={<Navigation/>} title="ربط وتفضيل الشركاء" sub="Uber، Careem، DiDi والمزيد" onClick={()=>onAction('إعدادات الشركاء قيد التفعيل')}/>
      <ProfileRow icon={<LifeBuoy/>} title="الدعم والمساعدة" sub="خدمة عملاء ومساعدة" onClick={()=>onAction('مركز الدعم قيد التفعيل')}/>
      <ProfileRow icon={<ShieldCheck/>} title="الأمان والطوارئ" sub="مشاركة الرحلات وجهات الطوارئ" onClick={()=>onAction('مزايا الأمان ستتفعّل مع الرحلات الحية')}/>
      <ProfileRow icon={<Phone/>} title="دعوة الأصدقاء" sub="شارك RAYEH" onClick={()=>navigator.share?.({title:'RAYEH',text:'جرّب RAYEH لمقارنة الرحلات'}).catch(()=>null)}/>
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

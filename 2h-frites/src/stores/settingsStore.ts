import { BusinessSettings, BusinessHours, DeliveryZone } from '@/types/settings';

let counter = 600;
function genId() { return `zone-${Date.now()}-${++counter}`; }

const DEFAULT_HOURS: BusinessHours[] = [
  { day: 0, open: '11:30', close: '21:30', closed: false }, // Dimanche
  { day: 1, open: '11:00', close: '22:00', closed: false }, // Lundi
  { day: 2, open: '11:00', close: '22:00', closed: false }, // Mardi
  { day: 3, open: '11:00', close: '22:00', closed: false }, // Mercredi
  { day: 4, open: '11:00', close: '22:00', closed: false }, // Jeudi
  { day: 5, open: '11:00', close: '23:00', closed: false }, // Vendredi
  { day: 6, open: '11:00', close: '23:00', closed: false }, // Samedi
];

const DEFAULT_ZONES: DeliveryZone[] = [];

const DEFAULT_SETTINGS: BusinessSettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  vatNumber: '',
  currency: '€',
  vatRate: 0.06,
  vatRateDrinks: 0.21,
  defaultDeliveryFee: 2.50,
  minOrderDelivery: 12,
  maxOrdersPerHour: 30,
  acceptingOrders: true,
  hours: DEFAULT_HOURS,
  deliveryZones: DEFAULT_ZONES,
  closedDates: [],
};

let settings: BusinessSettings = { ...DEFAULT_SETTINGS };
let loaded = false;
let listeners: (() => void)[] = [];
function notify() { listeners.forEach((l) => l()); }

// Persist to API (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistToApi() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {});
  }, 300);
}

// Load from API on first access
function loadFromApi() {
  if (loaded) return;
  loaded = true;
  fetch('/api/settings')
    .then((r) => r.json())
    .then((data: any) => {
      if (data && data.name) {
        settings = { ...DEFAULT_SETTINGS, ...data };
        notify();
      }
    })
    .catch((err) => { console.warn('settingsStore: failed to load from API', err); });
}

export const settingsStore = {
  subscribe(listener: () => void) {
    loadFromApi();
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },

  get: () => { loadFromApi(); return settings; },

  update(data: Partial<BusinessSettings>) {
    settings = { ...settings, ...data };
    notify();
    persistToApi();
  },

  updateHours(day: number, data: Partial<BusinessHours>) {
    settings = {
      ...settings,
      hours: settings.hours.map((h) => (h.day === day ? { ...h, ...data } : h)),
    };
    notify();
    persistToApi();
  },

  toggleAcceptingOrders() {
    settings = { ...settings, acceptingOrders: !settings.acceptingOrders };
    notify();
    persistToApi();
  },

  // Delivery zones
  addZone(data: Omit<DeliveryZone, 'id'>): DeliveryZone {
    const zone: DeliveryZone = { ...data, id: genId() };
    settings = { ...settings, deliveryZones: [...settings.deliveryZones, zone] };
    notify();
    persistToApi();
    return zone;
  },

  updateZone(id: string, data: Partial<DeliveryZone>) {
    settings = {
      ...settings,
      deliveryZones: settings.deliveryZones.map((z) => (z.id === id ? { ...z, ...data } : z)),
    };
    notify();
    persistToApi();
  },

  toggleZone(id: string) {
    settings = {
      ...settings,
      deliveryZones: settings.deliveryZones.map((z) => (z.id === id ? { ...z, active: !z.active } : z)),
    };
    notify();
    persistToApi();
  },

  deleteZone(id: string) {
    settings = { ...settings, deliveryZones: settings.deliveryZones.filter((z) => z.id !== id) };
    notify();
    persistToApi();
  },

  // Closed dates
  addClosedDate(date: string) {
    if (!settings.closedDates.includes(date)) {
      settings = { ...settings, closedDates: [...settings.closedDates, date].sort() };
      notify();
      persistToApi();
    }
  },

  removeClosedDate(date: string) {
    settings = { ...settings, closedDates: settings.closedDates.filter((d) => d !== date) };
    notify();
    persistToApi();
  },

  // Helpers
  isOpen(): boolean {
    if (!settings.acceptingOrders) return false;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (settings.closedDates.includes(todayStr)) return false;
    const dayHours = settings.hours.find((h) => h.day === now.getDay());
    if (!dayHours || dayHours.closed) return false;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return time >= dayHours.open && time <= dayHours.close;
  },

  getDeliveryFee(postalCode: string): number {
    const zone = settings.deliveryZones.find((z) => z.active && z.postalCodes.includes(postalCode));
    return zone ? zone.fee : settings.defaultDeliveryFee;
  },
};

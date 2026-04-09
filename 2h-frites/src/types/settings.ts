export interface BusinessHours {
  day: number; // 0=Sunday, 1=Monday...6=Saturday
  open: string; // "11:00"
  close: string; // "22:00"
  closed: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  postalCodes: string[];
  fee: number;
  minOrder: number;
  active: boolean;
}

export interface BusinessSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  currency: string;
  vatRate: number; // 0.06 for food in Belgium
  vatRateDrinks: number; // 0.21 for alcohol
  defaultDeliveryFee: number;
  minOrderDelivery: number;
  maxOrdersPerHour: number;
  acceptingOrders: boolean;
  hours: BusinessHours[];
  deliveryZones: DeliveryZone[];
  closedDates: string[]; // ["2026-12-25", ...]
}

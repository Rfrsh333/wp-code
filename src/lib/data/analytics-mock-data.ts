// Mock data for the live analytics demo page

export interface LocationData {
  city: string;
  country: string;
  lat: number;
  lng: number;
  visitors: number;
  flag: string;
}

export interface PageData {
  page: string;
  visitors: number;
  percentage: number;
}

export interface DeviceData {
  device: string;
  percentage: number;
  icon: "monitor" | "smartphone" | "tablet";
}

export const activeLocation: LocationData = {
  city: "Utrecht",
  country: "Netherlands",
  lat: 52.0907,
  lng: 5.1214,
  visitors: 1,
  flag: "🇳🇱",
};

export const countriesData: LocationData[] = [
  { city: "Utrecht", country: "Netherlands", lat: 52.0907, lng: 5.1214, visitors: 1, flag: "🇳🇱" },
];

export const pagesData: PageData[] = [
  { page: "/", visitors: 1, percentage: 100 },
];

export const devicesData: DeviceData[] = [
  { device: "Desktop", percentage: 100, icon: "monitor" },
  { device: "Mobile", percentage: 0, icon: "smartphone" },
  { device: "Tablet", percentage: 0, icon: "tablet" },
];

export const tabs = [
  { id: "pages", label: "Pages", icon: "file-text" },
  { id: "countries", label: "Countries", icon: "globe" },
  { id: "devices", label: "Devices", icon: "monitor" },
] as const;

export type TabId = (typeof tabs)[number]["id"];

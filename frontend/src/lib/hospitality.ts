export type FloorTable = {
  id: number;
  name: string;
  zone_id?: number | null;
  zone?: string | null;
  capacity_min: number;
  capacity_max: number;
  shape: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  rotation: number;
  public_state: string;
  status?: string | null;
  is_active?: boolean;
  is_reservable?: boolean;
  is_orderable?: boolean;
  features?: { id: number; name: string; slug: string }[];
  qr_token?: string | null;
};

export type FloorPlanPayload = {
  floor_plan: { id: number; name: string; background_url: string | null; canvas_width: number; canvas_height: number; version: number | null };
  tables: FloorTable[];
  zones: { id: number; name: string; color: string }[];
  features: { id: number; name: string; slug: string }[];
  settings: ReservationSettings;
  combinations: { id: number; name: string; capacity_min: number; capacity_max: number; tables?: { id: number; name: string }[] }[];
  closures: { id: number; starts_at: string; ends_at: string; reason: string }[];
  following: boolean;
};

export type ReservationSettings = {
  enabled: boolean;
  min_advance_minutes: number;
  max_advance_days: number;
  duration_minutes: number;
  buffer_minutes: number;
  min_party_size: number;
  max_party_size: number;
  cancellation_deadline_minutes: number;
  auto_confirm: boolean;
  allow_table_selection: boolean;
  auto_assign: boolean;
  allow_larger_tables: boolean;
  waitlist_enabled: boolean;
};

export type VenueContentItem = {
  id: number;
  type: string;
  title: string;
  slug: string;
  body: string | null;
  cover_url: string | null;
  video_url: string | null;
  status: string;
  priority: number;
  scheduled_at: string | null;
  published_at: string | null;
  expires_at: string | null;
  event_start_at: string | null;
  event_end_at: string | null;
  event_category: string | null;
  price: number | null;
  capacity: number | null;
  registration_mode: string;
  organizer: string | null;
  valid_from: string | null;
  valid_until: string | null;
  daily_start: string | null;
  daily_end: string | null;
  days_of_week: number[] | null;
  terms: string | null;
  source?: { title?: string; body?: string | null; terms?: string | null; event_category?: string | null };
  translations?: Record<string, Record<string, string>>;
  venue?: { id: number; name: string; slug: string; city: string } | null;
};

export const tableStateLabel: Record<string, string> = {
  available: "Slobodan",
  selected: "Odabran",
  reserved: "Rezervisan",
  occupied: "Zauzet",
  unavailable: "Nedostupan",
};

export const orderStatusLabel: Record<string, string> = {
  pending: "Primljena",
  confirmed: "Prihvaćena",
  preparing: "U pripremi",
  served: "Poslužena",
  cancelled: "Otkazana",
};

export const orderSteps = ["pending", "confirmed", "preparing", "served"] as const;

export const tableShapeLabel: Record<string, string> = {
  round: "Okrugli",
  square: "Kvadrat",
  rectangle: "Pravougaonik",
  oval: "Oval",
  custom: "Poseban",
};

export const reservationStatusLabel: Record<string, string> = {
  pending: "Na čekanju",
  confirmed: "Potvrđena",
  seated: "Smještena",
  completed: "Završena",
  cancelled: "Otkazana",
  no_show: "Nije došao",
  rejected: "Odbijena",
  expired: "Istekla",
};

export const contentTypeLabel: Record<string, string> = {
  event: "Događaj",
  post: "Objava",
  announcement: "Obavještenje",
  promotion: "Promocija",
  special_offer: "Posebna ponuda",
};

export const contentStatusLabel: Record<string, string> = {
  draft: "Nacrt",
  scheduled: "Zakazano",
  published: "Objavljeno",
  cancelled: "Otkazano",
  completed: "Isteklo",
  archived: "Arhiva",
  hidden: "Sakriveno",
};

export function seatsLabel(min: number, max: number) {
  return min === max ? `${max} mjesta` : `${min}–${max} mjesta`;
}

export function when(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sr-Latn-ME", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

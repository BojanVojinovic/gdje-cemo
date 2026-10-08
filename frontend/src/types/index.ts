export type Role = "customer" | "business" | "admin";

export type Category = {
  id: number;
  parent_id: number | null;
  name: string;
  label?: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  children?: Category[];
};

export type Amenity = {
  id: number;
  name: string;
  label?: string;
  slug: string;
  icon: string | null;
};

export type OpeningInterval = { opens_at: string; closes_at: string };

export type OpeningDay = {
  day: number;
  label: string;
  closed: boolean;
  intervals: OpeningInterval[];
};

export type VenueImage = {
  id: number;
  url: string | null;
  thumb_url: string | null;
  alt: string | null;
  sort_order: number;
};

export type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  source_name?: string;
  source_description?: string | null;
  translations?: Record<string, Record<string, string>>;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  category_id: number;
};

export type MenuCategory = {
  id: number;
  name: string;
  source_name?: string;
  translations?: Record<string, Record<string, string>>;
  station?: "kitchen" | "bar";
  sort_order: number;
  items?: MenuItem[];
};

export type Menu = {
  id: number;
  name: string;
  is_active: boolean;
  categories?: MenuCategory[];
};

export type Venue = {
  id: number;
  name: string;
  slug: string;
  description: string;
  excerpt: string;
  category?: Category | null;
  subcategory?: Category | null;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  socials: { instagram: string | null; facebook: string | null; tiktok: string | null };
  price_level: number;
  price_label: string;
  cover_url: string | null;
  thumb_url: string | null;
  logo_url?: string | null;
  tagline?: string | null;
  source?: { description?: string; tagline?: string | null };
  translations?: Record<string, Record<string, string>>;
  brand_color?: string | null;
  brand_ink?: string | null;
  rating_avg: number;
  reviews_count: number;
  status: string;
  verification_status: string;
  is_featured: boolean;
  offers_delivery?: boolean;
  delivery_eta_minutes?: number | null;
  timezone: string;
  is_open: boolean;
  is_saved: boolean;
  distance_km: number | null;
  opening_hours?: OpeningDay[];
  amenities?: Amenity[];
  images?: VenueImage[];
  menu?: Menu | null;
  business?: { id: number; name: string; status: string } | null;
  created_at?: string;
};

export type Review = {
  id: number;
  rating: number;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  user?: { id: number; name: string; username: string; avatar_url: string | null };
  venue?: { id: number; name: string; slug: string; city: string };
  response?: {
    id: number;
    body: string;
    created_at: string;
    user?: { id: number; name: string } | null;
  } | null;
};

export type BusinessMembership = {
  id: number;
  name: string;
  slug: string;
  status: string;
  pivot_role?: string;
};

export type User = {
  id: number;
  first_name: string;
  last_name: string;
  name: string;
  username: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  email_verified_at: string | null;
  locale?: "en" | "cnr";
  created_at: string;
  businesses?: BusinessMembership[];
  staff?: StaffAssignment[];
};

export type StaffAssignment = {
  venue_id: number;
  venue_name: string;
  venue_slug: string;
  business_id: number;
  roles: Array<"waiter" | "bar" | "kitchen" | "delivery">;
};

export type Promotion = {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Report = {
  id: number;
  reason: string;
  description: string | null;
  status: string;
  reportable_type: string;
  reportable_id: number;
  created_at: string;
  reporter?: { id: number; name: string; email: string };
  administrator?: { id: number; name: string } | null;
};

export type PageMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string | null;
  meta?: PageMeta;
};

export type HomePayload = {
  featured: Venue[];
  popular: Venue[];
  recent: Venue[];
  top_rated: Venue[];
  nearby: Venue[];
  categories: Category[];
  promotions: Promotion[];
  settings: {
    site_name: string;
    tagline: string;
    default_city: string;
    support_email: string;
  };
};

export type VenueDetail = {
  venue: Venue;
  rating_distribution: Record<string, number>;
  similar: Venue[];
};

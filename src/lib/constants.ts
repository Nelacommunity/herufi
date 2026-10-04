import type { DeliveryMethod, OrderStatus } from "@/lib/types";

export const SITE = {
  name: "Herufi",
  tagline: "Factory prices. Delivered to Tanzania.",
  description:
    "Buy direct from verified factories in China and get it delivered across Tanzania. Customs handled, pay in shillings with M-Pesa or card.",
  email: "hello@herufi.co.tz",
  phone: "+255 754 000 123",
};

export const PAGE_SIZE = 24;

export const SORT_OPTIONS = ["recommended", "newest", "price-asc", "price-desc", "popular", "rating"] as const;
export type SortValue = (typeof SORT_OPTIONS)[number];

/** Keys match the delivery_method values accepted by place_order. Labels live in the dictionaries. */
export const DELIVERY_METHODS: DeliveryMethod[] = ["standard", "express", "sea"];

export const MOBILE_MONEY = ["M-Pesa", "Tigo Pesa", "Airtel Money", "HaloPesa"] as const;

export const TZ_REGIONS = [
  "Dar es Salaam", "Arusha", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara",
  "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora",
  "Tanga", "Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi", "Kaskazini Pemba", "Kusini Pemba",
];

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
/** English labels for the admin dashboard; the storefront uses the dictionaries. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const POPULAR_SEARCHES = ["Headphones", "Boots", "Running shoes", "Vitamin C", "Candle", "Leather bag"];

export const NAV_CATEGORIES = ["fashion", "electronics", "home", "beauty"];

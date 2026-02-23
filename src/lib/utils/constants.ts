export const BUSINESS_TIMEZONE = "America/New_York";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://nailsbynatalia.com";

export type ServiceCategory = "nails" | "babysitting";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type SlotStatus = "available" | "booked" | "blocked";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-gold/20 text-gold-dark",
  confirmed: "bg-palm/20 text-palm",
  declined: "bg-terracotta/20 text-terracotta",
  cancelled: "bg-warm-gray/20 text-warm-gray",
  completed: "bg-palm-light/30 text-palm",
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  nails: "Nails",
  babysitting: "Babysitting",
};

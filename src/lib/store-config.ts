/**
 * Business settings. Edit here and the storefront, checkout, server-side
 * pricing and invoices all follow.
 */
export const BRAND = {
  name: "Modern Bella Design",
  legalName: "Modern Bella Design LLC",
  tagline: "Kitchen and bath cabinetry",
  city: "Beltsville, MD",
  serviceArea: [
    "Columbia", "Silver Spring", "Bethesda", "Bowie", "North Bethesda",
    "College Park", "Laurel", "South Laurel", "Fairland", "Greenbelt",
    "Hyattsville", "Langley Park", "Beltsville", "Maryland City", "Calverton",
    "Takoma Park", "Adelphi", "Cloverly", "White Oak", "Colesville",
    "New Carrollton", "Fort Meade", "Burtonsville", "North Kensington",
    "South Kensington", "Four Corners", "Goddard", "Hillandale", "West Laurel",
    "Berwyn Heights", "Spencerville", "Washington DC",
  ],
};

/** Browser chrome colour (the logo's ink). */
export const THEME_COLOR = "#0e0e0f";

/** Installation, per cabinet by type, in dollars. */
export const INSTALL: Record<string, number> = {
  base: 95,
  wall: 85,
  tall: 145,
  vanity: 165,
  storage: 45,
  trim: 22,
};
export const INSTALL_MINIMUM = 650;
export const HAUL_PER_CABINET = 55;

/** Delivery: flat fee, waived over the threshold (merchandise subtotal). */
export const DELIVERY = { flat: 249, freeOver: 6000 };

/** Maryland sales tax, applied to merchandise only (labour is stated separately). */
export const TAX_RATE = 0.06;

/** Days until an invoice is due, by default. */
export const INVOICE_TERMS_DAYS = 14;

export const SERVICES: [string, string][] = [
  ["Kitchen remodeling", "Layout, cabinetry, surfaces and finish work, from a straight cabinet swap to moving walls."],
  ["Bathroom remodeling", "Vanities, tile, fixtures and waterproofing, from powder rooms to primary baths."],
  ["Basement remodeling", "Finishing raw basement space: framing, egress, storage and the trades around them."],
  ["Home remodeling", "Whole-house and multi-room renovation run as one project, on one schedule."],
  ["Countertop installation", "Templating, fabrication and fitting for the tops that land on your cabinets."],
  ["Stone installation", "Natural and engineered stone for counters, islands, vanities and backsplashes."],
  ["General contracting", "We run the trades, the sequence and the permits, so you deal with one contact."],
  ["Custom homes", "Purpose-built houses taken from drawings through to finish carpentry."],
];

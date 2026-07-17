import { useEffect, useState } from "react";

/**
 * Public holidays for a country + year as a map of ISO date → holiday name.
 * `date-holidays` ships data for every country and is heavy, so it's loaded
 * lazily — the chunk is only fetched once a country is selected.
 */
export function useHolidays(
  country: string,
  year: number,
): Record<string, string> {
  const [holidays, setHolidays] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!country) {
      setHolidays({});
      return;
    }
    let cancelled = false;
    import("date-holidays")
      .then(({ default: Holidays }) => {
        if (cancelled) return;
        const hd = new Holidays(country);
        const map: Record<string, string> = {};
        for (const h of hd.getHolidays(year)) {
          if (h.type !== "public") continue;
          const iso = h.date.slice(0, 10);
          if (!map[iso]) map[iso] = h.name;
        }
        setHolidays(map);
      })
      .catch(() => {
        if (!cancelled) setHolidays({});
      });
    return () => {
      cancelled = true;
    };
  }, [country, year]);

  return holidays;
}

/** Countries offered in Display Options (ISO 3166-1 alpha-2 → label). */
export const HOLIDAY_COUNTRIES: { code: string; label: string }[] = [
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgium" },
  { code: "BR", label: "Brazil" },
  { code: "CA", label: "Canada" },
  { code: "CN", label: "China" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "DE", label: "Germany" },
  { code: "IN", label: "India" },
  { code: "IE", label: "Ireland" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JP", label: "Japan" },
  { code: "MX", label: "Mexico" },
  { code: "NL", label: "Netherlands" },
  { code: "NZ", label: "New Zealand" },
  { code: "NO", label: "Norway" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "SG", label: "Singapore" },
  { code: "ZA", label: "South Africa" },
  { code: "KR", label: "South Korea" },
  { code: "ES", label: "Spain" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
];

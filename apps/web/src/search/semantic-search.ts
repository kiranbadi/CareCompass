import {
  demoProviders,
  type Availability,
  type CareNeed,
  type DemoProvider,
} from "./providers";

type Concept<T extends string> = {
  id: T;
  label: string;
  terms: readonly string[];
};
const careConcepts: readonly Concept<CareNeed>[] = [
  {
    id: "children",
    label: "Child support",
    terms: [
      "child",
      "children",
      "childcare",
      "child care",
      "kid",
      "kids",
      "pediatric",
      "paediatric",
      "daughter",
      "son",
      "toddler",
      "after school",
    ],
  },
  {
    id: "older-adults",
    label: "Older adult care",
    terms: [
      "elderly",
      "senior",
      "older adult",
      "older adults",
      "aging parent",
      "ageing parent",
      "dad",
      "mom",
      "mum",
      "father",
      "mother",
      "grandparent",
      "grandparents",
      "grandma",
      "grandfather",
    ],
  },
  {
    id: "autism",
    label: "Autism support",
    terms: ["autism", "autistic", "asd", "sensory", "sensory friendly"],
  },
  {
    id: "memory",
    label: "Memory care",
    terms: [
      "memory",
      "memory loss",
      "forgetful",
      "dementia",
      "alzheimer",
      "alzheimers",
    ],
  },
  {
    id: "mobility",
    label: "Mobility support",
    terms: [
      "mobility",
      "walking",
      "wheelchair",
      "getting around",
      "physical disability",
      "physical disabilities",
    ],
  },
  {
    id: "companionship",
    label: "Companionship",
    terms: [
      "companion",
      "companionship",
      "company",
      "lonely",
      "loneliness",
      "social connection",
    ],
  },
  {
    id: "respite",
    label: "Family respite",
    terms: ["respite", "a break", "recharge", "relief", "time off"],
  },
  {
    id: "developmental",
    label: "Developmental support",
    terms: [
      "developmental",
      "development",
      "adhd",
      "learning disability",
      "learning disabilities",
      "special needs",
    ],
  },
];
const scheduleConcepts: readonly Concept<Availability>[] = [
  {
    id: "weekdays",
    label: "Weekdays",
    terms: [
      "weekday",
      "weekdays",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
    ],
  },
  {
    id: "weekends",
    label: "Weekends",
    terms: ["weekend", "weekends", "saturday", "sunday"],
  },
  {
    id: "mornings",
    label: "Mornings",
    terms: ["morning", "mornings", "early day"],
  },
  {
    id: "afternoons",
    label: "Afternoons",
    terms: ["afternoon", "afternoons", "after school"],
  },
  {
    id: "evenings",
    label: "Evenings",
    terms: ["evening", "evenings", "after work"],
  },
  {
    id: "overnight",
    label: "Overnight",
    terms: ["overnight", "night", "nights", "nighttime"],
  },
];
const cities = [
  { name: "Austin", terms: ["austin"] },
  { name: "Seattle", terms: ["seattle"] },
  { name: "New York", terms: ["new york", "nyc", "brooklyn"] },
  { name: "Boston", terms: ["boston"] },
];

export interface SearchInterpretation {
  needs: string[];
  schedule: string[];
  city: string | null;
  maxRate: number | null;
  exclusiveBudget: boolean;
  unsupportedLocation: string | null;
}
export interface ProviderMatch {
  provider: DemoProvider;
  reasons: string[];
}
export interface SearchResults {
  matches: ProviderMatch[];
  interpretation: SearchInterpretation;
  understood: boolean;
}

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9$\.\s]/g, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function hasTerm(text: string, term: string): boolean {
  return ` ${text} `.includes(` ${term} `);
}
function recognized<T extends string>(
  text: string,
  concepts: readonly Concept<T>[],
): Concept<T>[] {
  return concepts.filter((concept) =>
    concept.terms.some((term) => hasTerm(text, term)),
  );
}

/** MVP semantic approximation: curated care concepts/synonyms plus strict structured filters.
 * No learned embeddings, network requests, real health information or provider verification.
 */
export function searchProviders(query: string): SearchResults {
  const text = normalize(query.slice(0, 500));
  const needs = recognized(text, careConcepts);
  const schedule = recognized(text, scheduleConcepts);
  const city =
    cities.find((city) => city.terms.some((term) => hasTerm(text, term)))
      ?.name ?? null;
  const budget =
    text.match(
      /\b(under|below|up to|at most|less than|no more than|maximum|max|budget(?: of)?)\s*\$\s*(\d+(?:\.\d{1,2})?)/,
    ) ??
    text.match(
      /\b(under|below|up to|at most|less than|no more than|maximum|max)\s*(\d+(?:\.\d{1,2})?)\s*(?:dollars?\b|an?\s+hour\b|per\s+hour\b|hr\b)/,
    ) ??
    text.match(
      /\b(budget(?: of)?|hourly budget|maximum rate|max rate)\s*\$?\s*(\d+(?:\.\d{1,2})?)/,
    ) ??
    text.match(/(\$)\s*(\d+(?:\.\d{1,2})?)/);
  const maxRate = budget ? Number(budget[2]) : null;
  const exclusiveBudget =
    !!budget && ["under", "below", "less than"].includes(budget[1]);
  // Never silently discard a location we cannot search in the demo catalog.
  const locationPhrase = text
    .match(/\b(?:in|near|around)\s+(.+)/)?.[1]
    .split(
      /\b(?:under|below|up to|at most|less than|with|for|on|and|available|during)\b/,
    )[0]
    .trim();
  const isSchedulePhrase =
    locationPhrase &&
    /^(?:the\s+)?(?:morning|afternoon|evening|night|weekday|weekend)s?$/.test(
      locationPhrase,
    );
  const unsupportedLocation =
    !city && locationPhrase && !isSchedulePhrase
      ? locationPhrase.charAt(0).toUpperCase() + locationPhrase.slice(1)
      : null;
  const interpretation: SearchInterpretation = {
    needs: needs.map((item) => item.label),
    schedule: schedule.map((item) => item.label),
    city,
    maxRate,
    exclusiveBudget,
    unsupportedLocation,
  };
  const understood = !!(
    needs.length ||
    schedule.length ||
    city ||
    maxRate !== null ||
    unsupportedLocation ||
    /\b(care|caregiver|caregivers|provider|providers)\b/.test(text)
  );
  if (!text || !understood || unsupportedLocation)
    return { matches: [], interpretation, understood };
  const matches = demoProviders
    .filter(
      (provider) =>
        needs.every((need) => provider.needs.includes(need.id)) &&
        schedule.every((item) => provider.availability.includes(item.id)) &&
        (!city || provider.city === city) &&
        (maxRate === null ||
          (exclusiveBudget
            ? provider.hourlyRate < maxRate
            : provider.hourlyRate <= maxRate)),
    )
    .map((provider) => ({
      provider,
      reasons: [
        ...interpretation.needs,
        ...interpretation.schedule,
        ...(city ? [city] : []),
        ...(maxRate !== null
          ? [`${exclusiveBudget ? "Under" : "Up to"} $${maxRate}/hr`]
          : []),
      ],
    }));
  return {
    matches: matches.sort(
      (a, b) =>
        a.provider.hourlyRate - b.provider.hourlyRate ||
        a.provider.name.localeCompare(b.provider.name),
    ),
    interpretation,
    understood,
  };
}

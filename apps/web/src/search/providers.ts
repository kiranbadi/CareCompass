export type CareNeed =
  | "children"
  | "older-adults"
  | "autism"
  | "memory"
  | "mobility"
  | "companionship"
  | "respite"
  | "developmental";
export type Availability =
  | "weekdays"
  | "weekends"
  | "mornings"
  | "afternoons"
  | "evenings"
  | "overnight";

export interface DemoProvider {
  id: string;
  name: string;
  initials: string;
  city: string;
  title: string;
  description: string;
  hourlyRate: number;
  needs: CareNeed[];
  availability: Availability[];
  color: "sage" | "peach" | "lavender";
}

// Fictional sample people, services and schedules. This is not a verified directory.
export const demoProviders: readonly DemoProvider[] = [
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    city: "Austin",
    title: "Child & family support",
    description:
      "Patient, playful support for children, with sensory-friendly routines and time for families to recharge.",
    hourlyRate: 28,
    needs: ["children", "autism", "developmental", "respite"],
    availability: ["weekends", "mornings", "afternoons"],
    color: "sage",
  },
  {
    id: "jordan",
    name: "Jordan Ellis",
    initials: "JE",
    city: "Austin",
    title: "Older adult & memory care",
    description:
      "A calm companion for everyday routines, memory support, and getting around with confidence.",
    hourlyRate: 26,
    needs: ["older-adults", "memory", "mobility", "companionship"],
    availability: ["weekdays", "mornings", "afternoons"],
    color: "peach",
  },
  {
    id: "elena",
    name: "Elena Brooks",
    initials: "EB",
    city: "Seattle",
    title: "Developmental & sensory support",
    description:
      "Creative, reassuring care for children with sensory and developmental support needs.",
    hourlyRate: 32,
    needs: ["children", "autism", "developmental"],
    availability: ["weekends", "evenings"],
    color: "lavender",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    initials: "SR",
    city: "Seattle",
    title: "Memory care & family respite",
    description:
      "Gentle memory-care routines and companionship, with overnight support for older adults.",
    hourlyRate: 30,
    needs: ["older-adults", "memory", "companionship", "respite"],
    availability: ["weekends", "evenings", "overnight"],
    color: "sage",
  },
  {
    id: "avery",
    name: "Avery Morgan",
    initials: "AM",
    city: "New York",
    title: "Mobility & everyday companionship",
    description:
      "A friendly helping hand with walking, daily routines, and meaningful time together.",
    hourlyRate: 24,
    needs: ["older-adults", "mobility", "companionship", "respite"],
    availability: ["weekends", "afternoons", "evenings"],
    color: "peach",
  },
  {
    id: "robin",
    name: "Robin Patel",
    initials: "RP",
    city: "Boston",
    title: "Child & developmental support",
    description:
      "Thoughtful after-school routines and individual support for children with developmental differences.",
    hourlyRate: 27,
    needs: ["children", "autism", "developmental"],
    availability: ["weekdays", "afternoons"],
    color: "lavender",
  },
];

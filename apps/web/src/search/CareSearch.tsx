import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { searchProviders, type SearchResults } from "./semantic-search";

const examples = [
  {
    label: "Weekend support for a child",
    query: "Weekend care for a child with autism under $30 an hour",
  },
  {
    label: "A companion for my parent",
    query: "A companion for my dad in Austin on weekdays",
  },
  {
    label: "Evening care in Seattle",
    query: "Autism support in Seattle on weekend evenings",
  },
];

export function CareSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (results) resultsRef.current?.focus({ preventScroll: true });
  }, [results]);

  function search(value: string): void {
    if (!value.trim()) {
      setError("Describe a care need, schedule, location, or budget.");
      setResults(null);
      return;
    }
    setError(null);
    setResults(searchProviders(value));
  }
  function submit(event: FormEvent): void {
    event.preventDefault();
    search(query);
  }

  return (
    <section
      className="care-search-section"
      aria-labelledby="search-title"
      id="find-care"
    >
      <div className="search-intro">
        <span className="home-kicker">
          <Sparkles size={15} aria-hidden="true" />
          CARE, IN YOUR OWN WORDS
        </span>
        <h2 id="search-title">What would a little support look like?</h2>
        <p>
          No need to know the right categories. Tell us what you have in mind.
        </p>
      </div>
      <div className="care-search-box">
        <form
          role="search"
          aria-label="Find sample care providers"
          onSubmit={submit}
        >
          <label htmlFor="care-query" className="visually-hidden">
            Describe the care you need
          </label>
          <Search size={22} aria-hidden="true" />
          <input
            id="care-query"
            type="search"
            maxLength={500}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Weekend care for a child with autism under $30 an hour"
            aria-describedby="search-demo-note"
          />
          <button className="home-button" type="submit">
            Find care
            <ArrowUpRight size={18} aria-hidden="true" />
          </button>
        </form>
        <div className="search-examples">
          <span>Try asking:</span>
          {examples.map((example) => (
            <button
              key={example.label}
              onClick={() => {
                setQuery(example.query);
                search(example.query);
              }}
            >
              {example.label}
              <ArrowUpRight size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
      <p className="search-demo-note" id="search-demo-note">
        Natural-language demo · Matches care concepts, location, schedule, and
        budget in static sample data.
      </p>
      {error && (
        <p className="search-error" role="alert">
          {error}
        </p>
      )}
      {results && (
        <div
          className="care-search-results"
          ref={resultsRef}
          tabIndex={-1}
          aria-label="Search results"
        >
          <div className="search-results-header">
            <div>
              <h3>Care to explore</h3>
              <p role="status">
                {results.matches.length} sample{" "}
                {results.matches.length === 1
                  ? "profile matches"
                  : "profiles match"}{" "}
                your request.
              </p>
            </div>
            <span className="demo-pill">DEMO PROFILES</span>
          </div>
          <div className="search-understanding">
            <SlidersHorizontal size={15} aria-hidden="true" />
            <span>Interpreted:</span>
            {[
              ...results.interpretation.needs,
              ...results.interpretation.schedule,
              ...(results.interpretation.city
                ? [results.interpretation.city]
                : []),
              ...(results.interpretation.maxRate !== null
                ? [
                    `${results.interpretation.exclusiveBudget ? "Under" : "Up to"} $${results.interpretation.maxRate}/hr`,
                  ]
                : []),
            ].map((label) => (
              <span className="search-tag" key={label}>
                {label}
              </span>
            ))}
          </div>
          {results.matches.length ? (
            <div className="provider-results-grid">
              {results.matches.map(({ provider, reasons }) => (
                <article className="demo-provider-card" key={provider.id}>
                  <div className="provider-card-top">
                    <span className={`demo-avatar ${provider.color}`}>
                      {provider.initials}
                    </span>
                    <span className="provider-rate">
                      ${provider.hourlyRate}
                      <small>/ hour</small>
                    </span>
                  </div>
                  <h3>{provider.name}</h3>
                  <p className="provider-specialty">{provider.title}</p>
                  <span className="provider-location">
                    <MapPin size={14} aria-hidden="true" />
                    {provider.city}
                  </span>
                  <p className="provider-bio">{provider.description}</p>
                  <div className="provider-reasons">
                    {reasons.slice(0, 4).map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                  <p className="provider-schedule">
                    <Clock size={14} aria-hidden="true" />
                    {provider.availability.join(" · ")}
                  </p>
                  <a href="#/register?role=care_seeker">
                    Continue as a care seeker
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="search-empty">
              <Search size={25} aria-hidden="true" />
              <h3>
                {results.interpretation.unsupportedLocation
                  ? `No demo profiles in ${results.interpretation.unsupportedLocation}.`
                  : results.understood
                    ? "No sample profile fits all those details."
                    : "Let’s make your search a little more specific."}
              </h3>
              <p>
                Try a care need such as memory, mobility, autism support, or
                companionship. Demo locations are Austin, Seattle, New York, and
                Boston. You can also adjust the schedule or budget.
              </p>
            </div>
          )}
          <p className="search-results-disclaimer">
            Fictional profiles. No live availability or booking.
          </p>
        </div>
      )}
    </section>
  );
}

import { describe, expect, it } from "vitest";
import { searchProviders } from "./semantic-search";

describe("local natural-language provider search", () => {
  it("does not interpret a child's age as an hourly budget", () => {
    const result = searchProviders(
      "Weekend care for a child under 10 years old",
    );
    expect(result.interpretation.maxRate).toBeNull();
    expect(result.matches.map((match) => match.provider.id)).toEqual([
      "maya",
      "elena",
    ]);
  });
  it("accepts ordinary sentence punctuation while preserving decimal budgets", () => {
    expect(
      searchProviders("Companionship in Austin.").matches.map(
        (match) => match.provider.id,
      ),
    ).toEqual(["jordan"]);
    expect(
      searchProviders("Weekend autism care under $28.50.").matches.map(
        (match) => match.provider.id,
      ),
    ).toEqual(["maya"]);
  });
  it("interprets care synonyms, city, schedule, and budget together", () => {
    const result = searchProviders(
      "Someone to help my dad with memory loss in Austin on weekdays under $30 an hour",
    );
    expect(result.matches.map((match) => match.provider.id)).toEqual([
      "jordan",
    ]);
    expect(result.interpretation.maxRate).toBe(30);
    expect(result.matches[0].reasons).toContain("Memory care");
  });
  it("matches autism and child support for a weekend request without exact profile wording", () => {
    const result = searchProviders(
      "Weekend care for a child with autism under $30 an hour",
    );
    expect(result.matches.map((match) => match.provider.id)).toEqual(["maya"]);
  });
  it("honors a New York alias and an hourly dollar amount", () => {
    const result = searchProviders("Help with walking in NYC for $25 an hour");
    expect(result.matches.map((match) => match.provider.id)).toEqual(["avery"]);
  });
  it("does not replace an impossible budget with unrelated results", () => {
    expect(
      searchProviders("Dementia care on weekends under $10").matches,
    ).toEqual([]);
  });
  it("reports an unsupported city rather than ignoring it", () => {
    const result = searchProviders("Childcare in Denver under $50");
    expect(result.matches).toEqual([]);
    expect(result.interpretation.unsupportedLocation).toBe("Denver");
  });
  it("keeps unrelated or empty requests from matching every profile", () => {
    expect(searchProviders("quantum computers").understood).toBe(false);
    expect(searchProviders("   ").matches).toEqual([]);
  });
  it("recognizes evening support and uses all requested availability filters", () => {
    const result = searchProviders(
      "autism support in Seattle on weekend evenings",
    );
    expect(result.matches.map((match) => match.provider.id)).toEqual(["elena"]);
  });
});

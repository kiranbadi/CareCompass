import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { authClient } from "../auth/client";

vi.mock("../auth/client", () => ({
  authClient: {
    restoreSession: vi.fn(),
    onSessionExpired: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getAudit: vi.fn(),
  },
}));

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.mocked(authClient.restoreSession).mockResolvedValue(null);
  vi.mocked(authClient.onSessionExpired).mockReturnValue(() => {});
});

describe("public home and shared auth entry points", () => {
  it("keeps the shared auth form open when using its skip link", async () => {
    window.history.replaceState(null, "", "/#/login");
    render(<App />);
    await screen.findByLabelText("Email address");
    await userEvent.click(
      screen.getByRole("link", { name: "Skip to sign in" }),
    );
    expect(window.location.hash).toBe("#/login");
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("keeps the module preview open when skipping to content", async () => {
    window.history.replaceState(null, "", "/#/care-provider");
    render(<App />);
    await userEvent.click(
      screen.getByRole("link", { name: "Skip to content" }),
    );
    expect(window.location.hash).toBe("#/care-provider");
    expect(
      screen.getByRole("heading", { name: "Make your care count." }),
    ).toBeInTheDocument();
  });

  it("renders home and About Us even while the API is unavailable", async () => {
    vi.mocked(authClient.restoreSession).mockRejectedValue(
      new Error("Cannot connect"),
    );
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: /Good care starts with connection/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "About Us" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore care seeker module" }),
    ).toHaveAttribute("href", "#/care-seeker");
    expect(
      screen.getByRole("link", { name: "Explore care provider module" }),
    ).toHaveAttribute("href", "#/care-provider");
  });
  it("offers one registration form for both roles through the home Register link", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("link", { name: "Register" }));
    expect(
      await screen.findByRole("radio", { name: /I need care/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /I provide care/ }),
    ).toBeInTheDocument();
  });
  it("shows the shared login form when using the home Login link", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("link", { name: "Log in" }));
    expect(await screen.findByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
  it("searches static care profiles using a natural-language request", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", { name: "Describe the care you need" }),
      "Weekend care for a child with autism under $30 an hour",
    );
    await user.click(screen.getByRole("button", { name: "Find care" }));
    expect(
      await screen.findByRole("heading", { name: "Maya Chen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fictional profiles. No live availability or booking."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Sam Rivera" }),
    ).not.toBeInTheDocument();
  });
  it("links module previews back to the shared registration with a role preselected", async () => {
    render(<App />);
    await userEvent.click(
      screen.getByRole("link", { name: "Explore care provider module" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Make your care count." }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("link", { name: "Join as a care provider" }),
    );
    expect(
      await screen.findByRole("radio", { name: /I provide care/ }),
    ).toBeChecked();
    await waitFor(() => expect(window.location.hash).toContain("/register"));
  });
});

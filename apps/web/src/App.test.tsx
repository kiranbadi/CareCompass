import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { authClient } from "./auth/client";

vi.mock("./auth/client", () => ({
  authClient: {
    restoreSession: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getAudit: vi.fn(),
    onSessionExpired: vi.fn(),
  },
}));

const guardian = {
  id: "user-1",
  email: "guardian@example.com",
  phone_number: "+14155550123",
  role: "care_seeker" as const,
  is_active: true,
  is_verified: false,
  phone_verified: false,
  navigation: [
    { id: "overview", label: "Overview" },
    { id: "recipients", label: "Care recipients" },
  ],
};

describe("CareBridge authentication", () => {
  beforeEach(() => {
    vi.mocked(authClient.restoreSession).mockResolvedValue(null);
    vi.mocked(authClient.onSessionExpired).mockReturnValue(() => {});
  });

  it("returns to login and removes the workspace when the session expires", async () => {
    let expire: () => void = () => {};
    vi.mocked(authClient.onSessionExpired).mockImplementation((listener) => {
      expire = listener;
      return () => {};
    });
    vi.mocked(authClient.restoreSession).mockResolvedValue(guardian);
    render(<App />);
    await screen.findByRole("heading", { name: "Your care, connected." });
    act(() => expire());
    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Main navigation" }),
    ).not.toBeInTheDocument();
  });

  it("renders an accessible login form and signs in with email and password", async () => {
    vi.mocked(authClient.login).mockResolvedValue(guardian);
    render(<App />);
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Email address"),
      "guardian@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "A-long-demo-password!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", { name: "Your care, connected." });
    expect(authClient.login).toHaveBeenCalledWith(
      "guardian@example.com",
      "A-long-demo-password!",
    );
    expect(
      screen.getByRole("button", { name: "Care recipients" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Audit log" }),
    ).not.toBeInTheDocument();
  });

  it("shows a sanitized login error and keeps the user on the form", async () => {
    vi.mocked(authClient.login).mockRejectedValue(
      new Error("Invalid credentials"),
    );
    render(<App />);
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Email address"),
      "unknown@example.com",
    );
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials",
    );
  });

  it("offers only seeker and provider registration and confirms successful registration", async () => {
    vi.mocked(authClient.register).mockResolvedValue(guardian);
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create an account" }),
    );
    expect(screen.getByRole("radio", { name: /I need care/ })).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /admin/i }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /I provide care/ }));
    await user.type(
      screen.getByLabelText("Email address"),
      "provider@example.com",
    );
    await user.type(screen.getByLabelText("Phone number"), "+14155550123");
    await user.type(screen.getByLabelText("Password"), "A-long-demo-password!");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "A-long-demo-password!",
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      expect(authClient.register).toHaveBeenCalledWith({
        email: "provider@example.com",
        password: "A-long-demo-password!",
        phone_number: "+14155550123",
        role: "care_provider",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Account created",
    );
  });

  it("does not submit registration with mismatching passwords", async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Create an account" }),
    );
    await user.type(
      screen.getByLabelText("Email address"),
      "guardian@example.com",
    );
    await user.type(screen.getByLabelText("Phone number"), "+14155550123");
    await user.type(screen.getByLabelText("Password"), "A-long-demo-password!");
    await user.type(
      screen.getByLabelText("Confirm password"),
      "A-different-password!",
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
    expect(authClient.register).not.toHaveBeenCalled();
  });

  it("restores an existing session and signs out through the backend", async () => {
    vi.mocked(authClient.restoreSession).mockResolvedValue(guardian);
    vi.mocked(authClient.logout).mockResolvedValue(undefined);
    render(<App />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Sign out" }),
    );
    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(authClient.logout).toHaveBeenCalledOnce();
  });

  it("distinguishes a connection failure during session restore from being signed out", async () => {
    vi.mocked(authClient.restoreSession).mockRejectedValue(
      new Error("Cannot connect to CareBridge. Please try again."),
    );
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Cannot connect",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });
});

import { useState, type ReactNode } from "react";
import { ArrowRight, Heart, Menu, X } from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "../auth/AuthContext";
import { skipToContent } from "../navigation";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="public-site">
      <a className="skip-link" href="#page-content" onClick={skipToContent}>
        Skip to content
      </a>
      <header className="public-header">
        <div className="public-header-inner">
          <a className="brand-home" href="#/" aria-label="CareBridge home">
            <Brand />
          </a>
          <button
            className="public-menu-button"
            aria-label="Toggle main menu"
            aria-expanded={open}
            aria-controls="public-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={23} /> : <Menu size={23} />}
          </button>
          <nav
            id="public-navigation"
            className={open ? "public-nav open" : "public-nav"}
            aria-label="Public navigation"
            onClick={() => setOpen(false)}
          >
            <a href="#care-seekers">For care seekers</a>
            <a href="#care-providers">For care providers</a>
            <a href="#about-us">About Us</a>
            {user ? (
              <a className="home-button small" href="#/workspace">
                My workspace
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            ) : (
              <>
                <a className="public-login" href="#/login">
                  Log in
                </a>
                <a className="home-button small" href="#/register">
                  Register
                  <ArrowRight size={15} aria-hidden="true" />
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="public-footer">
        <div>
          <a className="brand-home" href="#/" aria-label="CareBridge home">
            <Brand />
          </a>
          <p>A little support. A world of difference.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#/care-seeker">Care seeker module</a>
          <a href="#/care-provider">Care provider module</a>
          <a href="#about-us">About Us</a>
        </nav>
        <div className="public-footer-bottom">
          <span>
            © {new Date().getFullYear()} CareBridge. People first, always.
          </span>
          <span>
            Made with care
            <Heart size={13} aria-hidden="true" />
          </span>
        </div>
      </footer>
    </div>
  );
}

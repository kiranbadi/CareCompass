import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Heart,
  HeartHandshake,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PublicLayout } from "../components/PublicLayout";
import { CareSearch } from "../search/CareSearch";

export function LandingPage() {
  return (
    <PublicLayout>
      <main id="page-content" tabIndex={-1}>
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="home-kicker">
              <span className="home-dot" />A COMMUNITY BUILT AROUND CARE
            </span>
            <h1>
              Good care starts <br />
              with <em>connection.</em>
            </h1>
            <p>
              For the people you love. For the work you love.
              <br />A thoughtful space where care seekers and care providers
              find their next step, together.
            </p>
            <div className="hero-actions">
              <a className="home-button" href="#/register">
                Find your place
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="home-secondary-link" href="#find-care">
                Explore care
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="hero-note">
              <Heart size={15} aria-hidden="true" />
              <span>Every age. Every ability. Every kind of family.</span>
            </div>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            <div className="hero-art-ring outer" />
            <div className="hero-art-ring inner" />
            <span className="hero-art-leaf">
              <Leaf size={42} strokeWidth={1.2} />
            </span>
            <div className="hero-art-caption">
              A little support.
              <br />
              <em>A world of difference.</em>
            </div>
            <div className="hero-person-card family">
              <span className="hero-person-icon">
                <Users size={28} strokeWidth={1.6} />
              </span>
              <div>
                <span>FOR FAMILIES & GUARDIANS</span>
                <strong>A helping hand.</strong>
                <small>Care that fits your everyday.</small>
              </div>
            </div>
            <div className="hero-art-heart">
              <HeartHandshake size={35} strokeWidth={1.3} />
            </div>
            <div className="hero-person-card professional">
              <span className="hero-person-icon">
                <Heart size={29} strokeWidth={1.6} />
              </span>
              <div>
                <span>FOR CARE PROFESSIONALS</span>
                <strong>A caring heart.</strong>
                <small>Work with a little more meaning.</small>
              </div>
            </div>
            <div className="hero-art-bottom">
              <span />
              <span>BETTER, TOGETHER</span>
              <span />
            </div>
          </div>
        </section>
        <div className="home-values-bar">
          <span>
            <Users size={18} aria-hidden="true" />
            People before everything
          </span>
          <span>
            <Leaf size={18} aria-hidden="true" />
            Room for every care journey
          </span>
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
            Thoughtful about your privacy
          </span>
        </div>
        <CareSearch />
        <section
          className="home-role-section"
          id="care-seekers"
          aria-labelledby="seeker-title"
        >
          <div className="role-visual seeker-visual">
            <span className="role-visual-label">A LITTLE ROOM TO BREATHE</span>
            <div className="sample-planner">
              <div>
                <span className="planner-symbol">
                  <CalendarDays size={21} />
                </span>
                <strong>A little more support.</strong>
                <span className="static-label">PREVIEW</span>
              </div>
              <p>Care, around your life.</p>
              <div className="planner-row">
                <span className="planner-day">
                  SAT<big>16</big>
                </span>
                <div>
                  <strong>Time for connection</strong>
                  <small>Companionship & everyday support</small>
                </div>
                <Heart size={16} />
              </div>
              <div className="planner-row">
                <span className="planner-day">
                  SUN<big>17</big>
                </span>
                <div>
                  <strong>A moment to recharge</strong>
                  <small>Family respite & a helping hand</small>
                </div>
                <Leaf size={16} />
              </div>
              <div className="planner-bottom">
                <span className="home-dot" />A glimpse of what’s ahead · Sample
                content
              </div>
            </div>
            <Leaf className="role-decoration" size={60} strokeWidth={0.8} />
          </div>
          <div className="home-role-copy">
            <span className="home-kicker">FOR CARE SEEKERS & GUARDIANS</span>
            <h2 id="seeker-title">
              You don’t have to
              <br />
              do it all <em>alone.</em>
            </h2>
            <p>
              Finding support can feel like a lot. Start with a space that sees
              the person behind every care need, from childhood through later
              life.
            </p>
            <ul>
              <li>
                <Check size={17} />
                Explore support for different ages and abilities.
              </li>
              <li>
                <Check size={17} />
                Bring care profiles, plans, and conversations together.
              </li>
              <li>
                <Check size={17} />
                Take the next step at a pace that feels right.
              </li>
            </ul>
            <a className="home-button" href="#/care-seeker">
              Explore care seeker module
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
        </section>
        <section
          className="home-role-section provider-section"
          id="care-providers"
          aria-labelledby="provider-title"
        >
          <div className="home-role-copy">
            <span className="home-kicker">FOR CARE PROVIDERS</span>
            <h2 id="provider-title">
              Your care makes
              <br />a <em>difference.</em>
            </h2>
            <p>
              Your experience, patience, and kindness matter. Find a place to
              introduce your skills and build connections around the care you
              want to provide.
            </p>
            <ul>
              <li>
                <Check size={17} />
                Create a professional presence that reflects you.
              </li>
              <li>
                <Check size={17} />
                Explore a workspace for credentials and availability.
              </li>
              <li>
                <Check size={17} />
                See how clear rates can set better expectations.
              </li>
            </ul>
            <a className="home-button" href="#/care-provider">
              Explore care provider module
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="role-visual provider-visual">
            <span className="role-visual-label">
              MEANINGFUL WORK. HUMAN CONNECTION.
            </span>
            <div className="provider-mini-profile">
              <span className="large-profile-avatar">
                <HeartHandshake size={39} strokeWidth={1.2} />
              </span>
              <span className="static-label">WORKSPACE PREVIEW</span>
              <h3>A place for your strengths.</h3>
              <p>Make room for care that matters.</p>
              <div className="mini-profile-grid">
                <span>
                  <CalendarDays size={18} />
                  Your schedule
                </span>
                <span>
                  <ShieldCheck size={18} />
                  Your credentials
                </span>
                <span>
                  <Heart size={18} />
                  Your services
                </span>
              </div>
            </div>
            <Leaf className="role-decoration" size={65} strokeWidth={0.8} />
          </div>
        </section>
        <section className="home-how" aria-labelledby="how-title">
          <span className="home-kicker">
            LITTLE STEPS. MEANINGFUL CONNECTIONS.
          </span>
          <h2 id="how-title">A good place to start.</h2>
          <div className="home-steps">
            {[
              {
                icon: Users,
                title: "Find your place",
                text: "One registration. Choose whether you’re looking for care or providing it.",
              },
              {
                icon: HeartHandshake,
                title: "Explore your community",
                text: "Describe your care needs or introduce the support you can offer.",
              },
              {
                icon: MessageCircle,
                title: "Build a connection",
                text: "Preview a workspace designed for care, conversation, and everyday coordination.",
              },
            ].map((step, index) => (
              <article key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <step.icon size={27} strokeWidth={1.4} aria-hidden="true" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className="home-about"
          id="about-us"
          aria-labelledby="about-title"
        >
          <span className="about-icon">
            <Leaf size={35} strokeWidth={1.2} aria-hidden="true" />
          </span>
          <span className="home-kicker">PEOPLE FIRST, ALWAYS</span>
          <h2 id="about-title">About Us</h2>
          <p className="about-lead">
            We believe good care begins with seeing the whole person.
          </p>
          <p>
            CareBridge is a caregiving platform concept bringing care seekers,
            guardians, and care professionals into one welcoming community. Our
            goal is to make the first step toward support feel clearer, kinder,
            and a little less overwhelming.
          </p>
          <p className="about-mvp">
            We’re building this experience as a hackathon MVP. Provider search
            uses fictional profiles, and care-management screens are previews.
            Real booking, messaging, and professional verification are not
            available yet.
          </p>
        </section>
        <section className="home-closing">
          <div>
            <span className="home-kicker">THERE’S A PLACE FOR YOU HERE</span>
            <h2>A little care can change an everyday.</h2>
            <p>
              Start as a care seeker or a care provider. One community, one
              shared sign-up.
            </p>
          </div>
          <a className="home-button" href="#/register">
            Join CareBridge
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>
      </main>
    </PublicLayout>
  );
}

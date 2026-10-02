import Image from "next/image";
import Link from "next/link";
import MotionController from "./ui/motion-controller";

const series = [
  { name: "Formula 1", logo: "/series/f1.svg", live: true },
  { name: "MotoGP", logo: "/series/motogp.svg" },
  { name: "WEC", logo: "/series/wec.svg" },
  { name: "NASCAR", logo: "/series/nascar.svg" },
  { name: "GT", logo: "/series/gt.svg" },
  { name: "WRC", logo: "/series/wrc.svg" },
];

const features = [
  {
    index: "01",
    eyebrow: "Race weekends",
    title: "Every session.\nRight on time.",
    description:
      "Move from the season calendar to a complete weekend in one tap. See practice, qualifying, sprint and race sessions in your local time — or switch to the circuit's host time.",
    bullets: ["Local & host time", "Session-by-session results", "Circuit details"],
    screen: "/screens/calendar.png",
    alt: "Racera race calendar showing upcoming Formula 1 events",
    accent: "red",
  },
  {
    index: "02",
    eyebrow: "Championship picture",
    title: "Know who's fast.\nKnow who leads.",
    description:
      "Follow drivers and constructors through the season. Open any profile for points, wins, podiums, poles, fastest laps and a race-by-race performance history.",
    bullets: ["Driver standings", "Team standings", "Deep season stats"],
    screen: "/screens/drivers.png",
    alt: "Racera Formula 1 driver standings",
    secondaryScreen: "/screens/team-standings.png",
    secondaryAlt: "Racera Formula 1 team standings",
    accent: "teal",
  },
  {
    index: "03",
    eyebrow: "Race intelligence",
    title: "Results without\nthe noise.",
    description:
      "Catch the latest session winner, podium and complete classification from the home screen. Race time, finishing position and points stay clear at a glance.",
    bullets: ["Session winners", "Full classification", "Race-by-race points"],
    screen: "/screens/home.png",
    alt: "Racera home screen showing the next race and latest race results",
    accent: "blue",
  },
];

const widgetTypes = [
  "Driver Standings",
  "Team Standings",
  "Driver Profile",
  "Team Profile",
  "Session Calendar",
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 20V10m7 10V4m7 16v-7" />
    </svg>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand-link" href="#top" aria-label="Racera home">
        <Image src="/brand/racera.svg" width={148} height={31} alt="Racera" priority />
      </a>
      <nav aria-label="Primary navigation">
        <a href="#features">Features</a>
        <a href="#series">Series</a>
        <a href="#widgets">Widgets</a>
        <a href="#roadmap">Roadmap</a>
      </nav>
      <a className="header-cta" href="#download">
        Get Racera
        <ArrowIcon />
      </a>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-glow hero-glow-one" aria-hidden="true" />
      <div className="hero-glow hero-glow-two" aria-hidden="true" />
      <div className="hero-copy">
        <p className="eyebrow reveal-item">
          <span /> Your race weekend, organized
        </p>
        <h1 className="hero-title reveal-item">
          Motorsport,
          <br />
          <em>in motion.</em>
        </h1>
        <p className="hero-lede reveal-item">
          Calendars, session results, standings and the stories behind every driver and team — one focused companion for race fans.
        </p>
        <div className="hero-actions reveal-item">
          <a className="button button-primary" href="#download">
            <DownloadIcon />
            Download the app
          </a>
          <a className="text-link" href="#features">
            Explore features <ArrowIcon />
          </a>
        </div>
        <div className="hero-meta reveal-item">
          <div><strong>01</strong><span>Series live</span></div>
          <div><strong>06</strong><span>Series planned</span></div>
          <div><strong>05</strong><span>Home widgets</span></div>
        </div>
      </div>

      <div className="hero-stage" aria-label="Racera app preview">
        <div className="hero-orbit" aria-hidden="true">
          <span>CALENDAR</span><span>STANDINGS</span><span>RESULTS</span><span>WIDGETS</span>
        </div>
        <div className="phone phone-back">
          <Image
            src="/screens/drivers.png"
            alt="Racera driver standings screen"
            fill
            sizes="(max-width: 800px) 44vw, 280px"
            className="phone-image"
            priority
          />
        </div>
        <div className="phone phone-front">
          <Image
            src="/screens/home.png"
            alt="Racera home screen"
            fill
            sizes="(max-width: 800px) 52vw, 320px"
            className="phone-image"
            priority
          />
        </div>
        <div className="next-race-card floating-card">
          <div className="flag-dot" />
          <div>
            <span>Next up</span>
            <strong>Azerbaijan GP</strong>
          </div>
          <time>00:16:42</time>
        </div>
        <div className="live-pill floating-card"><span /> F1 is live</div>
      </div>

      <div className="hero-scroll" aria-hidden="true">
        <span>Scroll to explore</span><i />
      </div>
    </section>
  );
}

function SeriesStrip() {
  return (
    <section className="series-section section-shell" id="series">
      <div className="section-heading compact reveal-section">
        <p className="eyebrow"><span /> Built to grow</p>
        <div>
          <h2>One paddock.<br /><em>Every series.</em></h2>
          <p>Formula 1 is live now. The next championship is in the hands of the community.</p>
        </div>
      </div>
      <div className="series-grid reveal-grid">
        {series.map((item) => (
          <article className={`series-card ${item.live ? "is-live" : ""}`} key={item.name}>
            <div className="series-status">
              {item.live ? <><span /> Live now</> : <>Community vote</>}
            </div>
            <Image src={item.logo} alt={`${item.name} logo`} width={180} height={60} />
            <p>{item.name}</p>
            {!item.live && <span className="lock-mark">Coming soon</span>}
          </article>
        ))}
      </div>
    </section>
  );
}

function FeatureSections() {
  return (
    <section className="features" id="features">
      <div className="feature-intro section-shell reveal-section">
        <p className="eyebrow"><span /> Built for race day</p>
        <h2>Less searching.<br /><em>More racing.</em></h2>
        <p>Racera turns a crowded race weekend into a clear, fast and personal experience.</p>
      </div>
      {features.map((feature, index) => (
        <article className={`feature-story feature-${feature.accent}`} key={feature.index}>
          <div className="feature-sticky section-shell">
            <div className="feature-copy reveal-section">
              <span className="feature-number">{feature.index}</span>
              <p className="eyebrow"><span /> {feature.eyebrow}</p>
              <h3>{feature.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h3>
              <p className="feature-description">{feature.description}</p>
              <ul>
                {feature.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </div>
            <div className={`feature-visual ${feature.secondaryScreen ? "feature-visual-pair" : ""}`}>
              <div className="data-rings" aria-hidden="true"><i /><i /><i /></div>
              <div className="feature-phone feature-phone-primary">
                <Image
                  src={feature.screen}
                  alt={feature.alt}
                  fill
                  sizes="(max-width: 900px) 72vw, 380px"
                  className="phone-image"
                />
              </div>
              {feature.secondaryScreen && (
                <div className="feature-phone feature-phone-secondary">
                  <Image
                    src={feature.secondaryScreen}
                    alt={feature.secondaryAlt}
                    fill
                    sizes="(max-width: 900px) 54vw, 320px"
                    className="phone-image"
                  />
                </div>
              )}
              {index === 0 && (
                <div className="feature-float time-card">
                  <ClockIcon /><span>Local time</span><strong>ON</strong>
                </div>
              )}
              {index === 1 && (
                <div className="feature-float points-card">
                  <ChartIcon /><span>Season lead</span><strong>292 PTS</strong>
                </div>
              )}
              {index === 2 && (
                <div className="feature-float alert-card">
                  <BellIcon /><span>Race starts</span><strong>IN 15 MIN</strong>
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function Widgets() {
  return (
    <section className="widgets-section section-shell" id="widgets">
      <div className="widgets-copy reveal-section">
        <p className="eyebrow"><span /> At a glance</p>
        <h2>Race data,<br /><em>without opening the app.</em></h2>
        <p>Keep the championship on your home screen with five purpose-built widgets for the data you check most.</p>
        <div className="widget-count"><strong>05</strong><span>Home-screen<br />widgets</span></div>
      </div>
      <div className="widget-stage widget-platforms reveal-grid">
        <article className="widget-platform widget-platform-android">
          <div className="platform-label"><span>Android</span><b>Home screen</b></div>
          <div className="platform-screen">
            <Image
              src="/screens/widgets-android.png"
              alt="Racera widgets arranged on an Android home screen"
              fill
              sizes="(max-width: 820px) 44vw, 300px"
              className="platform-image"
            />
          </div>
        </article>
        <article className="widget-platform widget-platform-ios">
          <div className="platform-label"><span>iOS</span><b>Home screen</b></div>
          <div className="platform-screen">
            <Image
              src="/screens/widgets-ios.png"
              alt="Racera widgets arranged on an iOS home screen"
              fill
              sizes="(max-width: 820px) 44vw, 300px"
              className="platform-image"
            />
          </div>
        </article>
      </div>
      <div className="widget-catalog reveal-section" aria-label="Available Racera widgets">
        <p>Built for the glance — from the next session to the championship picture.</p>
        <ul>
          {widgetTypes.map((widget, index) => (
            <li key={widget}><span>{String(index + 1).padStart(2, "0")}</span>{widget}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Notifications() {
  return (
    <section className="notification-section section-shell reveal-section">
      <div className="notification-card">
        <div className="notification-visual" aria-hidden="true">
          <div className="signal signal-one" /><div className="signal signal-two" /><div className="signal signal-three" />
          <BellIcon />
        </div>
        <div className="notification-copy">
          <p className="eyebrow"><span /> Never miss lights out</p>
          <h2>Your race.<br /><em>Your reminder.</em></h2>
          <p>Choose exactly when Racera should notify you before every session.</p>
          <div className="time-options">
            {["1 hour", "30 min", "15 min", "5 min", "At start"].map((time, index) => (
              <span className={index === 2 ? "selected" : ""} key={time}>{time}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  return (
    <section className="roadmap section-shell" id="roadmap">
      <div className="section-heading reveal-section">
        <p className="eyebrow"><span /> The road ahead</p>
        <div>
          <h2>Built in public.<br /><em>Shaped by fans.</em></h2>
          <p>Vote for the next racing series and follow the features arriving after the MVP.</p>
        </div>
      </div>
      <div className="roadmap-grid reveal-grid">
        <article className="roadmap-card roadmap-vote">
          <span className="roadmap-index">01</span>
          <p>Community vote</p>
          <h3>Choose the next championship</h3>
          <div className="vote-bars">
            <div><span>WEC</span><i style={{ "--vote": "78%" }} /></div>
            <div><span>MotoGP</span><i style={{ "--vote": "64%" }} /></div>
            <div><span>WRC</span><i style={{ "--vote": "42%" }} /></div>
          </div>
          <span className="status-chip">Voting soon</span>
        </article>
        <article className="roadmap-card roadmap-theme">
          <span className="roadmap-index">02</span>
          <p>Visual styles</p>
          <h3>Dark now. Light and glass next.</h3>
          <div className="theme-samples" aria-hidden="true">
            <div className="theme-dark"><span /><i /></div>
            <div className="theme-light"><span /><i /></div>
            <div className="theme-glass"><span /><i /></div>
          </div>
          <span className="status-chip">In development</span>
        </article>
        <article className="roadmap-card roadmap-platform">
          <span className="roadmap-index">03</span>
          <p>Platform launch</p>
          <h3>Direct today. Stores tomorrow.</h3>
          <div className="platform-lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <span className="status-chip">Post-MVP</span>
        </article>
      </div>
    </section>
  );
}

function DownloadSection() {
  return (
    <section className="download-section" id="download">
      <div className="download-grid" aria-hidden="true" />
      <div className="track-line" aria-hidden="true">
        <svg viewBox="0 0 560 230">
          <path d="M32 173C109 194 116 74 190 93c63 16 82 108 153 84 51-17 25-104 84-125 37-13 73 9 101-20" />
        </svg>
      </div>
      <div className="download-content section-shell reveal-section">
        <Image src="/brand/app-icon.png" alt="Racera app icon" width={112} height={112} className="download-icon" />
        <p className="eyebrow"><span /> MVP access</p>
        <h2>The grid is ready.<br /><em>Are you?</em></h2>
        <p>Racera is available here first as a direct download for Android and iOS.</p>
        <div className="download-actions">
          <a className="store-button" href="/download/android" aria-describedby="latest-release-note">
            <DownloadIcon />
            <span><small>Download for</small>Android</span>
            <b>DIRECT</b>
          </a>
          <a className="store-button" href="/download/ios" aria-describedby="latest-release-note ios-note">
            <DownloadIcon />
            <span><small>Download for</small>iOS</span>
            <b>DIRECT</b>
          </a>
        </div>
        <p className="download-note" id="latest-release-note">Both buttons always download the latest published Racera release.</p>
        <span className="sr-only" id="ios-note">The iOS download requires signing or sideloading after download.</span>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer section-shell">
      <div className="footer-top">
        <div>
          <Image src="/brand/racera.svg" alt="Racera" width={178} height={38} />
          <p>Motorsport, in motion.</p>
        </div>
        <div className="footer-contact">
          <span>Questions, ideas, feedback?</span>
          <a href="mailto:racera.support@gmail.com">racera.support@gmail.com <ArrowIcon /></a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Racera. All rights reserved.</p>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/license">License</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </nav>
        <p className="unofficial-note">Racera is an independent app and is not affiliated with Formula 1 or the championships shown.</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <MotionController />
      <Header />
      <main id="main">
        <Hero />
        <SeriesStrip />
        <FeatureSections />
        <Widgets />
        <Notifications />
        <Roadmap />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}

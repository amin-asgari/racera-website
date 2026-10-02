import Image from "next/image";
import Link from "next/link";

const legalContent = {
  privacy: {
    title: "Privacy policy",
    eyebrow: "Your data, clearly handled",
    intro: "This page will explain what information Racera collects, why it is used, and how users can manage or remove it.",
    sections: ["Information we collect", "How information is used", "Data retention", "Your choices"],
  },
  terms: {
    title: "Terms of use",
    eyebrow: "The rules of the road",
    intro: "This page will contain the terms that apply when downloading, installing, and using Racera.",
    sections: ["Using Racera", "Acceptable use", "Availability and updates", "Limitation of liability"],
  },
  license: {
    title: "App license",
    eyebrow: "Permission to use Racera",
    intro: "This page will describe the license granted to users of the Racera application and website.",
    sections: ["License grant", "Restrictions", "Ownership", "Termination"],
  },
  disclaimer: {
    title: "Disclaimer",
    eyebrow: "Independent motorsport companion",
    intro: "Racera is an independent application and is not affiliated with, endorsed by, or sponsored by Formula 1, the FIA, or the racing series and teams shown.",
    sections: ["Unofficial product", "Trademarks", "Timing and results data", "Installation responsibility"],
  },
};

export default function LegalPage({ type }) {
  const content = legalContent[type];

  return (
    <div className="legal-page">
      <header className="site-header legal-header">
        <Link className="brand-link" href="/" aria-label="Back to Racera home">
          <Image src="/brand/racera.svg" width={148} height={31} alt="Racera" priority />
        </Link>
        <span />
        <Link className="header-cta" href="/">Back home</Link>
      </header>
      <main className="legal-main">
        <div className="legal-hero">
          <p className="eyebrow"><span /> {content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
        <div className="legal-content">
          <p className="legal-placeholder">
            This document is a structured placeholder and is not yet the final legal text. It will be replaced before the public release of Racera.
          </p>
          {content.sections.map((section) => (
            <section key={section}>
              <h2>{section}</h2>
              <p>Final content will be added here before release.</p>
            </section>
          ))}
          <section>
            <h2>Contact</h2>
            <p>Questions can be sent to <a href="mailto:racera.support@gmail.com">racera.support@gmail.com</a>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

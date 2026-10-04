import Image from "next/image";
import Link from "next/link";

const effectiveDate = "October 4, 2026";

const legalContent = {
  privacy: {
    title: "Privacy policy",
    eyebrow: "Your data, clearly handled",
    intro:
      "This Privacy Policy explains how Racera, operated by Amin Asgari, handles information when you use the website, Android app, or installable Web App.",
    sections: [
      {
        title: "Information we process",
        paragraphs: [
          "Racera does not require an account. The app may process technical details such as platform, browser or operating-system version, device model, language, approximate region derived from an IP address, time zone, app version, session duration, and feature interactions.",
          "Your selected series, theme, intro status, notification choices, and cached motorsport data are stored locally on your device or browser. When you vote for a future racing series, Racera sends an anonymous installation identifier, your choices, and limited device metadata to the voting service to prevent duplicate votes.",
        ],
      },
      {
        title: "Notifications and analytics",
        paragraphs: [
          "If you enable Web Push, the browser provides a push-subscription endpoint and cryptographic keys. Racera stores these with your reminder schedule so Cloudflare Workers can deliver alerts. The subscription is not used for advertising and can be disabled through Racera or your browser settings.",
          "Racera uses Amplitude to understand Web App and app usage, including opens, feature engagement, notification-permission status, Web App install state, and anonymous device or regional context. The Amplitude project API key embedded in the client is an identifier, not a password.",
        ],
      },
      {
        title: "How information is used",
        items: [
          "Provide calendars, results, standings, profiles, voting, and reminders.",
          "Maintain performance, diagnose failures, and improve Racera.",
          "Measure anonymous usage and understand which features are useful.",
          "Respond when you contact support by email.",
        ],
      },
      {
        title: "Service providers and sharing",
        paragraphs: [
          "Racera may rely on Cloudflare for hosting, security, databases, and push scheduling; Amplitude for analytics; GitHub for Android release files; and Gmail when you contact support. These providers process information under their own terms and privacy policies. Racera does not sell personal information or use it for targeted advertising.",
        ],
      },
      {
        title: "Retention and your choices",
        paragraphs: [
          "Local data remains until you clear site or app storage. Push subscriptions and pending schedules are retained while notifications are enabled or until the browser subscription expires. Vote and analytics records are kept only as reasonably needed to operate, secure, and improve the service.",
          "You may revoke notification permission, clear local storage, reset the application, or ask about access or deletion by contacting support. Clearing browser data can create a new anonymous installation identifier.",
        ],
      },
      {
        title: "Children, transfers, and changes",
        paragraphs: [
          "Racera is not directed to children under 13 and does not knowingly collect their personal information. Service providers may process data in countries other than your own. This policy may change as Racera adds features; the effective date will be updated when it does.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    eyebrow: "The rules of the road",
    intro:
      "These Terms govern your use of the Racera website, Android app, and Web App. By using Racera, you agree to them.",
    sections: [
      {
        title: "Using Racera",
        paragraphs: [
          "Racera is a motorsport information companion provided by Amin Asgari. You may use it for lawful, personal, non-commercial purposes. You are responsible for your device, connectivity, browser permissions, and any costs charged by your network provider.",
        ],
      },
      {
        title: "Acceptable use",
        items: [
          "Do not interfere with, overload, scrape, reverse engineer, or bypass security or rate limits of Racera or its APIs except where applicable law expressly permits it.",
          "Do not use Racera to violate law, third-party rights, or platform rules.",
          "Do not submit malicious content, manipulate community voting, or impersonate another person.",
        ],
      },
      {
        title: "Data, availability, and updates",
        paragraphs: [
          "Schedules, results, standings, and notifications can be delayed, incomplete, changed, or unavailable. Racera may add, remove, or modify features and supported racing series, suspend the service, or release updates without guaranteeing continuous availability.",
          "The Web App updates when a new site build is deployed. Android releases may be delivered through a direct download until an official store release is available.",
        ],
      },
      {
        title: "Third-party services and links",
        paragraphs: [
          "Racera may display third-party data, names, marks, or links and may depend on hosting, analytics, release, and email providers. Racera is not responsible for third-party services, content, terms, security, or availability.",
        ],
      },
      {
        title: "Warranty and liability",
        paragraphs: [
          "To the fullest extent permitted by law, Racera is provided “as is” and “as available,” without warranties of accuracy, fitness, merchantability, non-infringement, or uninterrupted operation. Racera and Amin Asgari will not be liable for indirect, incidental, special, consequential, or data-loss damages arising from your use or inability to use the service.",
          "Nothing in these Terms excludes rights or liability that cannot legally be excluded. If any provision is unenforceable, the remaining provisions continue in effect.",
        ],
      },
      {
        title: "Termination and changes",
        paragraphs: [
          "You may stop using Racera at any time. Access may be limited for abuse, security risk, or violation of these Terms. Updated Terms become effective when posted with a revised date; continued use after that date means you accept the update.",
        ],
      },
    ],
  },
  license: {
    title: "App license",
    eyebrow: "Permission to use Racera",
    intro:
      "This license describes the limited permission granted to use Racera. It does not transfer ownership of the app, website, brand, or source code.",
    sections: [
      {
        title: "License grant",
        paragraphs: [
          "Subject to these terms, Amin Asgari grants you a limited, revocable, non-exclusive, non-transferable, non-sublicensable license to install and use Racera on devices you control for personal, non-commercial purposes.",
        ],
      },
      {
        title: "Restrictions",
        items: [
          "Do not copy, redistribute, sell, rent, sublicense, or commercially exploit Racera or any substantial part of it.",
          "Do not remove proprietary notices or misrepresent Racera as your own product.",
          "Do not modify, decompile, or reverse engineer Racera except to the limited extent that applicable law expressly allows.",
          "Do not use Racera assets, interfaces, or data to build a competing service without written permission.",
        ],
      },
      {
        title: "Ownership",
        paragraphs: [
          "Racera, its original code, design, logo, and original content are owned by Amin Asgari or licensed to him. Motorsport series, team, driver, manufacturer, sponsor, and platform names and marks belong to their respective owners. No trademark license is granted.",
        ],
      },
      {
        title: "Open-source software",
        paragraphs: [
          "Racera includes open-source libraries. Those components remain governed by their respective licenses and notices. Where an open-source license conflicts with this license for that component, the open-source license controls.",
        ],
      },
      {
        title: "Updates and termination",
        paragraphs: [
          "Updates may replace or modify earlier versions. This license ends automatically if you materially breach it. On termination, stop using and remove copies of Racera under your control. Ownership, disclaimer, and limitation provisions survive termination.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    eyebrow: "Independent motorsport companion",
    intro:
      "Racera is an unofficial, independent fan-made product developed by Amin Asgari. It is not an official timing or safety service.",
    sections: [
      {
        title: "No affiliation or endorsement",
        paragraphs: [
          "Racera is not affiliated with, endorsed by, licensed by, or sponsored by Formula 1, Formula One Management, the FIA, MotoGP, WEC, NASCAR, WRC, GT organizations, any team, driver, circuit, broadcaster, manufacturer, sponsor, Apple, or Google unless expressly stated otherwise.",
        ],
      },
      {
        title: "Trademarks and media",
        paragraphs: [
          "All third-party names, logos, vehicle images, driver images, flags, and trademarks are the property of their respective owners and are used for identification and informational purposes. Their appearance does not imply association with Racera.",
        ],
      },
      {
        title: "Accuracy and notifications",
        paragraphs: [
          "Motorsport schedules and results can change without notice. Data may be delayed, incomplete, provisional, or incorrect because of upstream sources, connectivity, time-zone handling, browser restrictions, or service outages. Push notifications are a convenience and are not guaranteed to arrive, arrive on time, or remain enabled.",
        ],
      },
      {
        title: "Not for safety, betting, or professional reliance",
        paragraphs: [
          "Do not rely on Racera for emergency, safety-critical, operational, wagering, financial, legal, or professional decisions. Confirm important schedules, classifications, and event information with the relevant official organizer or broadcaster.",
        ],
      },
      {
        title: "Installation responsibility",
        paragraphs: [
          "You are responsible for deciding whether to install the Android package or Web App and for keeping your device, browser, permissions, and backups secure. Directly distributed Android builds may trigger platform security warnings. Download only from racera.online and verify that the release source is the official Racera repository.",
        ],
      },
    ],
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
          <p className="legal-effective">Effective: {effectiveDate}</p>
        </div>
        <div className="legal-content">
          {content.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
          <section>
            <h2>Contact</h2>
            <p>
              Questions, privacy requests, or legal notices can be sent to{" "}
              <a href="mailto:racera.support@gmail.com">racera.support@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

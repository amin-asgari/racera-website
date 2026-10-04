import type { ReactNode } from "react";
import { assetUrl } from "../lib/racera-data";
import styles from "../racera-app.module.css";
import { Icon } from "./icons";

export function Asset({
  src,
  alt,
  className,
  eager = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  if (!src) return null;
  return (
    // The source asset dimensions vary by driver/circuit. CSS reserves each slot.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(src)}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export function AppHeader({
  title,
  back,
  action,
}: {
  title: ReactNode;
  back?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className={styles.appHeader}>
      <h1>{title}</h1>
      <div className={styles.headerActions}>
        {action}
        {back && (
          <button className={styles.iconButton} type="button" onClick={back} aria-label="Go back">
            <Icon name="arrow-left" />
          </button>
        )}
      </div>
    </header>
  );
}

export function LoadingState({ label = "Loading race data" }: { label?: string }) {
  return (
    <div className={styles.centerState} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className={styles.centerState} role="alert">
      <span className={styles.stateIcon}><Icon name="info" /></span>
      <h2>Race data is unavailable</h2>
      <p>{message}</p>
      {retry && (
        <button className={styles.primaryButton} type="button" onClick={retry}>
          <Icon name="refresh" /> Retry
        </button>
      )}
    </div>
  );
}

export function SectionLabel({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <div className={styles.sectionLabel}>
      {icon && (
        <span className={styles.sectionLabelIcon}>
          <Asset src={icon} alt="" />
        </span>
      )}
      <span>{children}</span>
    </div>
  );
}

export function SettingsPanel({ children, raised = false }: { children: ReactNode; raised?: boolean }) {
  return <div className={`${styles.settingsPanel} ${raised ? styles.settingsPanelRaised : ""}`}>{children}</div>;
}

export function SettingsRow({
  title,
  description,
  trailing,
  onClick,
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className={styles.settingsRowCopy}>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      {trailing || <Icon name="chevron" className={styles.chevron} />}
    </>
  );
  return onClick ? (
    <button className={styles.settingsRow} type="button" onClick={onClick}>{content}</button>
  ) : (
    <div className={styles.settingsRow}>{content}</div>
  );
}

export function AvailabilityBanner({
  icon,
  title,
  message,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  message: string;
}) {
  return (
    <SettingsPanel raised>
      <div className={styles.availabilityBanner}>
        <span><Icon name={icon} /></span>
        <div><strong>{title}</strong><p>{message}</p></div>
      </div>
    </SettingsPanel>
  );
}

export function Modal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <h2 id="modal-title">{title}</h2>
        <div className={styles.modalContent}>{children}</div>
        <div className={styles.modalActions}>{actions}</div>
      </section>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return <div className={styles.toast} role="status" aria-live="polite">{message}</div>;
}

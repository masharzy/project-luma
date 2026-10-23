import Link from "next/link";
import { Icon } from "./ui/icon";
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="page-breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>{eyebrow}</span>
        </div>
        <h1>{title}</h1>
        <p lang="bn">{description}</p>
      </div>
      {children}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
  href,
  icon = "book",
}: {
  title: string;
  description: string;
  action?: string;
  href?: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <Icon name={icon} size={29} />
        <span>+</span>
      </div>
      <h3>{title}</h3>
      <p lang="bn">{description}</p>
      {href && action && (
        <Link className="text-link" href={href}>
          {action} ↗
        </Link>
      )}
    </div>
  );
}
export function FeatureNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="feature-note">
      <Icon name="clock" size={17} />
      <p lang="bn">{children}</p>
    </div>
  );
}
export function PageWrap({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className={`feature-page ${tone}`}>
      <div className="feature-container">{children}</div>
    </div>
  );
}
export function WorkspaceHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p lang="bn">{description}</p>}
      </div>
      {children}
    </div>
  );
}

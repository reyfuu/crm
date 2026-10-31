import { cn, initials } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card shadow-(--shadow-card)", className)}
      {...props}
    />
  );
}

const tones = {
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  sky: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  green: "bg-green-500/10 text-green-600 dark:text-green-300",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  red: "bg-red-500/10 text-red-600 dark:text-red-300",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  zinc: "bg-zinc-500/10 text-zinc-500",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ tone = "slate", className, ...props }: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded-sm px-1.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

const avatarColors = ["bg-indigo-500", "bg-pink-500", "bg-teal-500", "bg-amber-500", "bg-sky-500", "bg-violet-500"];

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const color = avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <span
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-card", color)}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, actions, children }: { title: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-md text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}

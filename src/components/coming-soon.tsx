import type { ReactNode } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  phase,
  children,
}: {
  title: string;
  description: string;
  phase: number;
  children?: ReactNode;
}) {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title={title}
          description={description}
          action={<Badge variant="secondary">Phase {phase}</Badge>}
        />
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto max-w-md">
              <div className="text-lg font-semibold">Coming in Phase {phase}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {children ?? "This module is part of the next build phase. We'll wire it up soon."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

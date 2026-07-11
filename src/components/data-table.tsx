import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DataTable<T extends { id: string }>(props: {
  columns: { key: string; label: string; render?: (row: T) => ReactNode; className?: string }[];
  rows: T[];
  isLoading?: boolean;
  emptyLabel?: string;
  actions?: (row: T) => ReactNode;
}) {
  const { columns, rows, isLoading, emptyLabel = "No records yet.", actions } = props;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 text-left font-medium ${c.className ?? ""}`}>
                  {c.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="p-6">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="p-8 text-center text-muted-foreground"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ""}`}>
                      {c.render ? c.render(r) : (r as any)[c.key]}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right">{actions(r)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

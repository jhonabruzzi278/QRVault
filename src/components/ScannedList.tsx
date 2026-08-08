export interface ScannedItem {
  code: string;
  name: string;
  found: boolean;
}

interface ScannedListProps {
  items: ScannedItem[];
}

export function ScannedList({ items }: ScannedListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no escaneaste ningún producto.</p>;
  }

  return (
    <ul data-testid="scanned-list" className="max-h-[40vh] space-y-2 overflow-y-auto">
      {items
        .slice()
        .reverse()
        .map((item) => (
          <li
            key={item.code}
            data-testid="scanned-item"
            className="flex items-center gap-3 bg-secondary px-3 py-2 text-sm"
          >
            <span className="font-semibold text-brand" data-testid="scanned-item-code">
              {item.code}
            </span>
            <span className="flex-1 truncate text-muted-foreground">{item.name}</span>
            <span
              data-testid="scanned-item-status"
              className={item.found ? 'text-success' : 'text-destructive'}
            >
              {item.found ? '✔ Encontrado' : '✖ No registrado'}
            </span>
          </li>
        ))}
    </ul>
  );
}

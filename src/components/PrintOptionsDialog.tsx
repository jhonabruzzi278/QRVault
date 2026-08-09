import { PrinterIcon } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLUMN_OPTIONS = [2, 3, 4, 5, 6, 8] as const;

interface PrintOptionsDialogProps {
  open: boolean;
  labelCount: number;
  columns: number;
  onColumnsChange: (columns: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PrintOptionsDialog({
  open,
  labelCount,
  columns,
  onColumnsChange,
  onCancel,
  onConfirm,
}: PrintOptionsDialogProps) {
  const rows = Math.ceil(labelCount / columns);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent data-testid="print-options-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar impresión</DialogTitle>
          <DialogDescription>Elegí cuántas etiquetas entran por fila en la hoja.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            Etiquetas por fila
          </span>
          <div className="flex flex-wrap gap-2" data-testid="print-columns-options">
            {COLUMN_OPTIONS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={option === columns ? 'default' : 'outline'}
                className={cn('w-12')}
                aria-pressed={option === columns}
                data-testid={`print-columns-${option}`}
                onClick={() => onColumnsChange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground" data-testid="print-options-summary">
            {labelCount} {labelCount === 1 ? 'etiqueta' : 'etiquetas'} · {rows} {rows === 1 ? 'fila' : 'filas'} aprox.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="print-options-cancel">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={onConfirm} data-testid="print-options-confirm">
            <PrinterIcon />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

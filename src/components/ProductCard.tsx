import { useMemo } from 'react';
import qrcodeGenerator from 'qrcode-generator';
import { PrinterIcon, Trash2Icon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/db';

export interface CatalogProduct extends Product {
  isRegistered: boolean;
}

interface ProductCardProps {
  product: CatalogProduct;
  onDelete: (code: string) => void;
  onPrint: (product: CatalogProduct) => void;
}

export function ProductCard({ product, onDelete, onPrint }: ProductCardProps) {
  const qrSvg = useMemo(() => {
    const qr = qrcodeGenerator(0, 'M');
    qr.addData(product.code);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2 });
  }, [product.code]);

  const isLowStock = product.minStock != null && product.stock != null && product.stock <= product.minStock;

  return (
    <Card
      data-testid="product-card"
      data-code={product.code}
      className={cn(!product.isRegistered && 'ring-2 ring-warning ring-dashed')}
    >
      <CardContent className="text-center">
        {/* qrSvg viene de qrcode-generator a partir de product.code (código interno), no de HTML/input de usuario. */}
        <div
          data-testid="product-card-qr"
          className="mx-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full [&_svg]:max-w-28"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="mt-2 font-bold" data-testid="product-card-code">
          {product.code}
        </div>
        <div className="text-sm text-muted-foreground">
          {product.name}
          {!product.isRegistered && ' (no registrado)'}
        </div>
        {isLowStock && (
          <Badge variant="outline" className="mt-2 text-warning" data-testid="product-card-badge">
            Stock bajo
          </Badge>
        )}
      </CardContent>
      {product.isRegistered && (
        <CardFooter className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onPrint(product)}
            data-testid="product-card-print"
          >
            <PrinterIcon />
            Imprimir etiqueta
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive"
            onClick={() => onDelete(product.code)}
            data-testid="product-card-delete"
          >
            <Trash2Icon />
            Quitar del inventario
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

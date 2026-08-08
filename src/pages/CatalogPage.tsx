import { useEffect, useRef, useState } from 'react';
import { PlusIcon, PrinterIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductFormDialog } from '@/components/ProductFormDialog';
import { LabelPreviewDialog } from '@/components/LabelPreviewDialog';
import { usePrintLabels } from '@/components/PrintLabelsProvider';
import type { CatalogProduct } from '@/components/ProductCard';
import { FULL_CATALOG } from '@/lib/catalog-data';
import { buildLabelUnits, type LabelUnit } from '@/lib/labels';
import { deleteProduct, getAllProducts, initInventoryDb, productCodeExists, putProduct, type Product } from '@/lib/db';

export function CatalogPage() {
  const dbRef = useRef<IDBDatabase | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [previewUnits, setPreviewUnits] = useState<LabelUnit[] | null>(null);
  const printLabels = usePrintLabels();

  async function loadProducts(db: IDBDatabase) {
    const dbProducts = await getAllProducts(db);
    const dbCodes = new Set(dbProducts.map((p) => p.code));

    const fromCatalog: CatalogProduct[] = FULL_CATALOG.map((product) => ({
      ...product,
      isRegistered: dbCodes.has(product.code),
    }));
    const customOnly: CatalogProduct[] = dbProducts
      .filter((p) => !FULL_CATALOG.some((c) => c.code === p.code))
      .map((product) => ({ ...product, isRegistered: true }));

    setProducts([...fromCatalog, ...customOnly].sort((a, b) => a.code.localeCompare(b.code)));
  }

  useEffect(() => {
    let cancelled = false;
    initInventoryDb().then((db) => {
      if (cancelled) return;
      dbRef.current = db;
      loadProducts(db);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(code: string) {
    const db = dbRef.current;
    if (!db) return;
    await deleteProduct(db, code);
    await loadProducts(db);
  }

  async function handleCreate(product: Product): Promise<{ duplicateCode?: boolean }> {
    const db = dbRef.current;
    if (!db) return {};

    if (await productCodeExists(db, product.code)) {
      return { duplicateCode: true };
    }

    await putProduct(db, product);
    await loadProducts(db);
    setPreviewUnits(buildLabelUnits(product));
    return {};
  }

  function handlePrintAll() {
    const units = products.filter((p) => p.isRegistered).flatMap((p) => buildLabelUnits(p));
    printLabels(units);
  }

  const normalizedFilter = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      !normalizedFilter ||
      p.code.toLowerCase().includes(normalizedFilter) ||
      p.name.toLowerCase().includes(normalizedFilter),
  );
  const registeredCount = products.filter((p) => p.isRegistered).length;
  const unregisteredCount = products.length - registeredCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-success" data-testid="registered-count">
              {registeredCount}
            </p>
            <p className="text-sm text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-warning" data-testid="unregistered-count">
              {unregisteredCount}
            </p>
            <p className="text-sm text-muted-foreground">No registrados</p>
          </CardContent>
        </Card>
        <Card className="flex flex-col justify-center gap-2 p-6">
          <Button data-testid="new-product-btn" onClick={() => setFormOpen(true)}>
            <PlusIcon />
            Nuevo Producto
          </Button>
          <Button variant="outline" data-testid="print-btn" onClick={handlePrintAll}>
            <PrinterIcon />
            Imprimir códigos QR
          </Button>
        </Card>
      </div>

      <Input
        data-testid="search-input"
        placeholder="🔎 Buscar por código o nombre..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoComplete="off"
      />

      <ProductGrid
        products={filtered}
        onDelete={handleDelete}
        onPrint={(product) => setPreviewUnits(buildLabelUnits(product))}
      />

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleCreate} />
      <LabelPreviewDialog units={previewUnits} onOpenChange={(open) => !open && setPreviewUnits(null)} />
    </div>
  );
}

import { ProductCard, type CatalogProduct } from '@/components/ProductCard';

interface ProductGridProps {
  products: CatalogProduct[];
  onDelete: (code: string) => void;
  onPrint: (product: CatalogProduct) => void;
}

export function ProductGrid({ products, onDelete, onPrint }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p data-testid="no-results" className="text-sm text-muted-foreground">
        No se encontraron productos que coincidan con la búsqueda.
      </p>
    );
  }

  return (
    <div data-testid="products-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard key={product.code} product={product} onDelete={onDelete} onPrint={onPrint} />
      ))}
    </div>
  );
}

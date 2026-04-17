import "../styles/ProductSkeleton.scss";

const SkeletonCard = () => (
  <div className="skeleton-card" aria-hidden="true">
    <div className="skeleton-card__image" />
    <div className="skeleton-card__info">
      <div className="skeleton-card__category" />
      <div className="skeleton-card__name" />
      <div className="skeleton-card__price" />
    </div>
    <div className="skeleton-card__btn" />
  </div>
);

const ProductSkeleton = ({ count = 8 }) => (
  <div className="skeleton-grid" aria-label="Cargando productos…" role="status">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default ProductSkeleton;

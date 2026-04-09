import { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { ProductsContext } from "./ProductsContext";
import "../styles/RelatedProducts.scss";

const formatPrice = (price) => "$ " + Number(price).toLocaleString("es-UY");

const isActive = (p) => !p.status || p.status === "activo";

// Fisher-Yates shuffle (non-mutating)
const shuffled = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Props:
 *   currentProductId — id del producto actual (excluido)
 *   category         — categoría del producto actual
 */
const RelatedProducts = ({ currentProductId, category }) => {
  const { products } = useContext(ProductsContext);

  const related = useMemo(() => {
    const others = products.filter(
      (p) => String(p.id) !== String(currentProductId) && isActive(p)
    );

    const sameCategory = others.filter(
      (p) => p.category && p.category === category
    );

    const pool = shuffled(sameCategory).slice(0, 3);

    if (pool.length < 3) {
      const remaining = shuffled(
        others.filter((p) => !sameCategory.includes(p))
      ).slice(0, 3 - pool.length);
      pool.push(...remaining);
    }

    return pool;
  }, [products, currentProductId, category]);

  if (related.length === 0) return null;

  return (
    <section className="related-products">
      <div className="related-products__inner">
        <h2 className="related-products__title">
          <em>También te puede interesar</em>
        </h2>

        <div className="related-products__grid">
          {related.map((p) => {
            const thumb =
              Array.isArray(p.images) && p.images.length > 0
                ? p.images[0]
                : p.image ?? null;

            return (
              <Link
                key={p.id}
                to={`/producto/${p.id}`}
                className="related-products__card"
              >
                <div className="related-products__card-img-wrap">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={p.name}
                      className="related-products__card-img"
                    />
                  ) : (
                    <div className="related-products__card-placeholder" />
                  )}
                </div>

                <div className="related-products__card-body">
                  <p className="related-products__card-name">{p.name}</p>
                  <p className="related-products__card-price">
                    {formatPrice(p.price)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;

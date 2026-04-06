import React from "react";
import "../styles/ProductsBanner.scss";

const ProductsBanner = ({ video }) => {
  return (
    <section className="products-banner">
      <video
        className="products-banner__video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={video} type="video/mp4" />
      </video>

      <div className="products-banner__overlay"></div>
    </section>
  );
};

export default ProductsBanner;

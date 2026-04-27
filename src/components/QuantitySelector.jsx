import { useState } from "react";
import "../styles/QuantitySelector.scss";

const QuantitySelector = ({ value, onChange, max = Infinity }) => {
  const [qty, setQty] = useState(value ?? 1);

  const set = (n) => {
    const v = Math.min(Math.max(1, n), max);
    setQty(v);
    onChange && onChange(v);
  };

  const current = value ?? qty;

  return (
    <div className="quantity-selector">
      <button onClick={() => set(current - 1)} disabled={current <= 1}>-</button>
      <span>{current}</span>
      <button onClick={() => set(current + 1)} disabled={current >= max}>+</button>
    </div>
  );
};

export default QuantitySelector;
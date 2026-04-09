import { useState } from "react";

export const useLocalStorage = (key, initialValue) => {
  const [stored, setStored] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStored(value);
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* silent */ }
  };

  return [stored, setValue];
};

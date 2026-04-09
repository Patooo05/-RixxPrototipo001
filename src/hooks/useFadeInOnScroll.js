import { useEffect } from "react";

export const useFadeInOnScroll = (threshold = 0.15) => {
  useEffect(() => {
    const elements = document.querySelectorAll(".fade-in-on-scroll");
    if (!elements.length) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [threshold]);
};

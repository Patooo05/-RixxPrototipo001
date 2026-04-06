// src/js/home.js

// Animación Fade-in con IntersectionObserver
// -----------------------------------------
// Esta función detecta cuando elementos específicos entran en el área visible
// (viewport) y les agrega una clase CSS para activar una animación "fade-in".
// Es ideal para animar secciones mientras el usuario hace scroll.

export const fadeInOnScroll = () => {
  // 1️⃣ Seleccionamos todos los elementos que queremos animar
  // Deben tener la clase ".fade-in-on-scroll" en el HTML.
  const elements = document.querySelectorAll(".fade-in-on-scroll");

  // 2️⃣ Creamos el observador que detecta cuando un elemento entra al viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // 3️⃣ Si el elemento está visible en pantalla…
        if (entry.isIntersecting) {
          // 🔹 Le agregamos la clase .visible → activa la animación desde CSS
          entry.target.classList.add("visible");

          // 🔹 Dejamos de observarlo para que la animación ocurra solo una vez
          observer.unobserve(entry.target);
        }
      });
    },
    {
      // 4️⃣ threshold = 0.2 → La animación se activa cuando el 20% del elemento es visible
      threshold: 0.2,
    }
  );

  // 5️⃣ Le decimos al observador que vigile todos los elementos seleccionados
  elements.forEach((el) => observer.observe(el));
};

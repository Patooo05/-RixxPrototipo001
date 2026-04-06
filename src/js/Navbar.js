// Archivo: /src/js/Navbar.js

export function setupNavbarSequence(
  _setShowWelcome, // se mantiene por compatibilidad pero NO se usa
  setShowLogoSolo,
  setShowNavbar
) {
  console.log("★ Secuencia Navbar activada");

  /* ----------------------------------------------------
     1) MINI NAV → aparece suave
  ---------------------------------------------------- */
  const t1 = setTimeout(() => {
    const el = document.querySelector(".navbar__welcome");
    if (el) el.classList.add("show-welcome");
  }, 50);

  /* ----------------------------------------------------
     2) MINI NAV → se oculta
  ---------------------------------------------------- */
  const t2 = setTimeout(() => {
    const el = document.querySelector(".navbar__welcome");
    if (el) el.classList.remove("show-welcome");
  }, 2000);

  /* ----------------------------------------------------
     3) LOGO SOLO
  ---------------------------------------------------- */
  const tLogo = setTimeout(() => {
    setShowLogoSolo(true);

    const logo = document.querySelector(".logo-solo");
    if (logo) logo.classList.add("fade-in");
  }, 2000);

  /* ----------------------------------------------------
     4) NAVBAR PRINCIPAL
  ---------------------------------------------------- */
  const t3 = setTimeout(() => {
    setShowNavbar(true);

    setTimeout(() => {
      document.querySelector(".logo-nav")?.classList.add("visible");
    }, 300);

    setTimeout(() => {
      document.querySelector(".navbar__links")?.classList.add("links-visible");
    }, 500);

    setTimeout(() => {
      document.querySelector(".navbar__actions")?.classList.add("actions-visible");
    }, 700);
  }, 2000);

  /* ----------------------------------------------------
     5) SCROLL → forzar aparición
  ---------------------------------------------------- */
  const handleScroll = () => {
    setShowLogoSolo(true);
    setShowNavbar(true);

    document.querySelector(".logo-solo")?.classList.add("fade-in");
    document.querySelector(".logo-nav")?.classList.add("visible");
    document.querySelector(".navbar__links")?.classList.add("links-visible");
    document.querySelector(".navbar__actions")?.classList.add("actions-visible");

    window.removeEventListener("scroll", handleScroll);
  };

  window.addEventListener("scroll", handleScroll);

  /* ----------------------------------------------------
     6) CLEANUP REAL
  ---------------------------------------------------- */
  return () => {
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(tLogo);
    clearTimeout(t3);
    window.removeEventListener("scroll", handleScroll);
  };
}

import { useEffect, useRef } from "react";

const CustomCursor = () => {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mx = window.innerWidth  / 2;
    let my = window.innerHeight / 2;
    let rx = mx, ry = my;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);

    // Dot sigue directo; ring sigue con lerp (suavizado)
    let raf;
    const animate = () => {
      rx += (mx - rx) * 0.1;
      ry += (my - ry) * 0.1;

      dot.style.left  = `${mx}px`;
      dot.style.top   = `${my}px`;
      ring.style.left = `${rx}px`;
      ring.style.top  = `${ry}px`;

      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // Escalar ring al hacer hover sobre links/botones
    const grow   = () => ring.style.transform = "translate(-50%, -50%) scale(1.8)";
    const shrink = () => ring.style.transform = "translate(-50%, -50%) scale(1)";

    document.querySelectorAll("a, button").forEach((el) => {
      el.addEventListener("mouseenter", grow);
      el.addEventListener("mouseleave", shrink);
    });

    const observer = new MutationObserver(() => {
      document.querySelectorAll("a, button").forEach((el) => {
        el.addEventListener("mouseenter", grow);
        el.addEventListener("mouseleave", shrink);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="cursor-dot"  ref={dotRef}  />
      <div className="cursor-ring" ref={ringRef} />
    </>
  );
};

export default CustomCursor;

const Banner = ({ video, children }) => {
  return (
    <section className="banner">
      <video className="banner-video" autoPlay muted loop playsInline>
        <source src={video} type="video/mp4" />
      </video>

      {children && <div className="banner-content">{children}</div>}
    </section>
  );
};

export default Banner;


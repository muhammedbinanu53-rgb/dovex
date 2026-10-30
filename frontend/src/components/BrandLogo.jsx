export default function BrandLogo({
  className = "",
  showName = true,
  imageClassName = ""
}) {
  return (
    <span className={`dovex-brand ${className}`}>
      <img
        src="/dovex-logo.png"
        alt="DoveX"
        className={`dovex-brand-image ${imageClassName}`}
      />

      {showName && (
        <span className="dovex-brand-name">
          Dove<span>X</span>
        </span>
      )}
    </span>
  );
}

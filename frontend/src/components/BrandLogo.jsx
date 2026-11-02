export default function BrandLogo({
  className = "",
  showName = true,
  imageClassName = ""
}) {
  return (
    <span
      className={`dovex-brand ${className}`}
      aria-label={showName ? undefined : "DoveX"}
    >
      <img
        src="/dovex-logo-black.svg"
        alt=""
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
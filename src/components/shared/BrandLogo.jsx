/**
 * Official NPCCSM (BCA, Kadi) header logo from npccsmbca.in, used unmodified.
 * The image has a white background, so it always sits on a white surface and
 * keeps its native 1125:208 aspect ratio.
 */
export const LOGO_SRC = `${import.meta.env.BASE_URL}branding/npccsm-bca-kadi-logo.png`;

export default function BrandLogo({ className = 'h-12', framed = false }) {
  const img = (
    <img
      src={LOGO_SRC}
      width={1125}
      height={208}
      alt="Narsinhbhai Patel College of Computer Studies and Management (NPCCSM – BCA), Kadi"
      className={`w-auto max-w-full object-contain ${className}`}
      decoding="async"
    />
  );

  if (!framed) return img;
  return <span className="inline-flex rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200/80">{img}</span>;
}

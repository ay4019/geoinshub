import { splitSubscripts } from "@/lib/charts/depth-profile";

/**
 * Renders text containing Unicode subscript glyphs (N₆₀, Eᵤ, σ′ᵥ₀) with real <sub> elements in the page font.
 * Most UI fonts lack those glyphs and fall back to a tiny, mismatched font otherwise.
 */
export function ScriptText({ text }: { text: string }) {
  return (
    <>
      {splitSubscripts(text).map((seg, i) =>
        seg.sub ? (
          <sub key={i} className="relative -bottom-[0.12em] align-baseline text-[0.72em] leading-none">
            {seg.text}
          </sub>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

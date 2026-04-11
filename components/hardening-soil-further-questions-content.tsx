/**
 * Extended Q&A derived from the source note on the Hardening Soil model
 * (stiffness parameters, stress dependency, and reference pressure).
 */
export function HardeningSoilFurtherQuestionsContent() {
  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-700">
      <h3 className="text-lg font-semibold text-slate-900">Further Question</h3>

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-left text-lg font-semibold leading-6 text-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="pr-4">
            How are E<sub>50</sub>, E<sub>oed</sub>, and E<sub>ur</sub> used as stress-dependent stiffness quantities, and
            how should they be derived from laboratory tests for numerical modelling?
          </span>
          <span className="mt-0.5 text-slate-400 transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <p>
          Using the Hardening Soil (HS) model correctly requires that key questions are understood beyond a superficial
          level — including the mechanical and mathematical links between parameters. Although E<sub>50</sub>,{" "}
          E<sub>oed</sub>, and E<sub>ur</sub> are often described loosely as “different stiffnesses”, they correspond
          to different loading paths and to different experimental counterparts. The triaxial secant modulus E
          <sub>50</sub> describes deformation under deviatoric loading and is typically defined as
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-serif text-slate-900 [&_sub]:text-[0.72em]">
          E<sub>50</sub> = Δq / Δε<sub>1</sub>
          <span className="text-slate-600">, </span>
          <span className="italic">q</span> = σ′<sub>1</sub> − σ′<sub>3</sub>
        </div>
        <p>
          This modulus is commonly associated with the secant to about 50% of peak strength. A critical point is that it
          is not a linear elastic modulus: it depends on strain level. In HS formulations, stiffness is therefore not
          constant but varies with stress state, commonly using a power-law type scaling from reference stiffness at a
          reference stress.
        </p>
        <p>
          Similarly, E<sub>oed</sub> relates to stiffness under one-dimensional compression and is obtained from
          oedometer testing. The classical use of E<sub>oed</sub> = 1/<span className="italic">m</span>
          <sub>v</sub> is only meaningful over a relevant stress increment; in HS, reference stiffness must be
          normalised to the model reference stress. If an oedometer-derived stiffness corresponds to a very different
          effective stress than the in-situ range of interest, entering it directly without normalisation can produce
          large errors. The practical approach is to select stiffness representative of the governing stress interval and
          map it consistently to the reference framework used by the software.
        </p>
        <p>
          E<sub>ur</sub> represents unloading–reloading stiffness. A frequently cited screening ratio is E
          <sub>ur</sub> ≈ 3 E<sub>50</sub>, but this is not universal: in overconsolidated materials the ratio can rise
          toward roughly 5–10 because the soil response is closer to elastic in unload–reload. That link is closely tied to
          OCR.
        </p>
        <p>
          OCR (σ′<sub>p</sub>/σ′<sub>v</sub>) increases stiffness, raises small-strain and unload–reload stiffness
          relative to primary loading, and influences the effective role of <span className="italic">m</span>. In HS
          applications, OCR may not always be entered as a single “switch”, but its effects are felt through stiffness
          ratios and calibration choices — for example higher E<sub>ur</sub>/E<sub>50</sub>, larger apparent stiffening,
          and smaller deformations when OCR is higher.
        </p>
        <p>
          The reference pressure <span className="italic">p</span>
          <sub>ref</sub> is not merely a bookkeeping constant: it is the calibration anchor for the stiffness scaling.
          If <span className="italic">p</span>
          <sub>ref</sub> is changed, reference stiffness values must be rescaled consistently; otherwise the entire soil
          stiffness field shifts systematically.
        </p>
        <p>
          Interpreting consolidation data from e–log σ′ plots using a single <span className="italic">m</span>
          <sub>v</sub> taken at one interval can be misleading because compressibility varies between normally
          consolidated and recompression ranges. A sound workflow often separates stiffness characterisation across those
          regions rather than forcing one value everywhere.
        </p>
        <p>
          Finally, HS does not fully represent very small-strain behaviour. At very small shear strains (for example
          γ of order 10<sup>−5</sup>), HS can underpredict stiffness; in PLAXIS-type workflows this is one reason HSsmall
          exists, linking initial shear modulus to density and shear wave velocity, e.g. G<sub>0</sub> = ρ V
          <sub>s</sub>
          <sup>2</sup>.
        </p>
        <p>
          In practice, the most critical mistake is pasting raw laboratory numbers directly as “model inputs”. HS
          calibration is closer to curve fitting: laboratory curves (triaxial, oedometer) should be represented, and HS
          parameters adjusted iteratively so the model response matches the relevant stress and strain ranges.
        </p>
        </div>
      </details>

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-left text-lg font-semibold leading-6 text-slate-900 [&::-webkit-details-marker]:hidden">
          <span className="pr-4">
            How does selection of reference pressure (<span className="italic">p</span>
            <sub>ref</sub>) affect results, and why is it critical?
          </span>
          <span className="mt-0.5 text-slate-400 transition group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </summary>
        <div className="space-y-4 border-t border-slate-200 px-4 py-4">
        <p>
          In the Hardening Soil model, <span className="italic">p</span>
          <sub>ref</sub> is the normalisation pressure at which reference stiffness values (E
          <sub>50</sub>
          <sup>ref</sup>, E<sub>oed</sub>
          <sup>ref</sup>, E<sub>ur</sub>
          <sup>ref</sup>) are defined. It anchors the power-law scaling used to compute stiffness at the current
          effective stress level. Many programs default <span className="italic">p</span>
          <sub>ref</sub> to about 100 kPa, but the important point is internal consistency: at the stress state
          corresponding to <span className="italic">p</span>
          <sub>ref</sub>, the model stiffness matches the entered reference stiffness values (for a consistent parameter
          set).
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-medium text-slate-800">Scaling and normalisation:</span> HS uses reference stiffness
            values together with stress-dependent multipliers. <span className="italic">p</span>
            <sub>ref</sub> is the anchor point for that scaling.
          </li>
          <li>
            <span className="font-medium text-slate-800">Systematic bias risk:</span> if <span className="italic">p</span>
            <sub>ref</sub> is changed without updating reference stiffness consistently, computed stiffnesses shift
            systematically — affecting settlement and displacement predictions.
          </li>
          <li>
            <span className="font-medium text-slate-800">Physical consistency:</span> the real soil response should not
            depend on an arbitrary <span className="italic">p</span>
            <sub>ref</sub> choice, but only if reference stiffnesses are remapped consistently when <span className="italic">p</span>
            <sub>ref</sub> changes.
          </li>
          <li>
            <span className="font-medium text-slate-800">Laboratory alignment:</span> triaxial and oedometer tests are run
            at specific confining stresses. Choosing <span className="italic">p</span>
            <sub>ref</sub> to align with the calibration stress level (or explicitly rescaling parameters to the software
            reference) reduces mismatch between lab interpretation and model input.
          </li>
        </ul>
        <p>
          Together with the exponent <span className="italic">m</span>, <span className="italic">p</span>
          <sub>ref</sub> controls how stiffness increases with depth and loading. Misunderstanding <span className="italic">p</span>
          <sub>ref</sub> as a harmless default is a common source of incorrect normalisation and misleading predictions.
        </p>
        </div>
      </details>
    </div>
  );
}

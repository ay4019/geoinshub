import type { ReactNode } from "react";

/**
 * Extended Q&A for the liquefaction article (fines corrections, flow liquefaction,
 * rd vs Kσ, Kα, the 0.65 factor, residual strength, transitional PI, MSF).
 * Markup mirrors HardeningSoilFurtherQuestionsContent so both dialogs look identical.
 */
function Question({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 text-left text-lg font-semibold leading-6 text-slate-900 [&::-webkit-details-marker]:hidden">
        <span className="pr-4">{title}</span>
        <span className="mt-0.5 text-slate-400 transition group-open:rotate-180" aria-hidden>
          ▼
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-200 px-4 py-4">{children}</div>
    </details>
  );
}

const N160 = (
  <>
    (N<sub>1</sub>)<sub>60</sub>
  </>
);
const N160cs = (
  <>
    (N<sub>1</sub>)<sub>60cs</sub>
  </>
);

export function LiquefactionFurtherQuestionsContent() {
  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-700">
      <h3 className="text-lg font-semibold text-slate-900">Further Question</h3>

      <Question
        title={
          <>
            The Δ correction and the α+β correction both convert {N160} to a clean-sand equivalent. Why are they not
            interchangeable, and what goes wrong if the Δ correction is used with the Youd et al. CRR curve?
          </>
        }
      >
        <p>
          The two corrections were each developed as internally consistent systems. The Youd et al. (2001) α+β method
          was calibrated against a particular set of field case histories and paired with the CRR boundary curve
          presented in that paper. The Boulanger &amp; Idriss (2014) Δ method was calibrated against a different, larger
          dataset using a revised CRR formulation. Each correction moves {N160} along the x-axis of its own CRR plot in a
          way that accounts for the resistance contribution of fines — but only on that plot.
        </p>
        <p>
          Applying the Δ correction and then reading CRR from the Youd et al. curve uses an x-axis position calibrated
          for one model on a curve calibrated for another. The CRR boundary curve is strongly nonlinear. A systematic
          offset in {N160cs} — even a few blow counts — translates into a substantial and potentially non-conservative
          error in CRR, particularly in the range {N160cs} = 10–20 where the curve is steepest.
        </p>
        <p>
          In practice, the Boulanger &amp; Idriss (2014) system is preferred for new projects because the Δ method varies
          smoothly with FC and was calibrated on a more comprehensive case-history database. The α+β method remains in
          use mainly for legacy projects and jurisdictions where Youd et al. is still the referenced standard. The rule
          is simple: use one system throughout and do not mix components.
        </p>
      </Question>

      <Question
        title={
          <>
            A soil has FS<sub>trigger</sub> = 1.6 from the standard CSR/CRR analysis — it passes. A state parameter
            assessment, however, indicates ψ &gt; 0. Should the engineer be concerned, and what does FS<sub>trigger</sub>{" "}
            not capture?
          </>
        }
      >
        <p>
          Yes. The CSR/CRR framework answers a specific question: will cyclic loading from the design earthquake generate
          enough pore pressure to trigger liquefaction? It does not ask whether the soil is already in an inherently
          unstable state.
        </p>
        <p>
          A soil with ψ &gt; 0 lies on the contractive side of the critical state line. It is in metastable equilibrium
          — held in place by static friction but with no capacity to resist strain softening once shearing begins. The
          trigger for flow liquefaction in such a soil may be far smaller than the design earthquake: construction
          traffic, a minor blast, a rise in pore pressure after rainfall, or a distant small earthquake. None of these
          events appears in the CSR/CRR calculation.
        </p>
        <p>
          The two assessments address different failure modes. CSR/CRR addresses cyclic triggering during the design
          event; the state parameter addresses susceptibility to flow liquefaction from any trigger at any time. On
          slopes this distinction is critical: FS<sub>trigger</sub> ≥ 1.5 does not mean the slope is safe against flow.
          A post-liquefaction stability check using S<sub>u</sub>(residual) must be performed independently.
        </p>
      </Question>

      <Question
        title={
          <>
            r<sub>d</sub> reduces CSR at depth and K<sub>σ</sub> reduces CRR at depth. Both decrease with depth — how can
            they have opposite effects on the factor of safety?
          </>
        }
      >
        <p>The apparent paradox disappears once each factor is placed on its side of the equation.</p>
        <p>
          r<sub>d</sub> sits inside CSR, the seismic demand. r<sub>d</sub> &lt; 1.0 means the actual shear stress at
          depth is smaller than the rigid-body approximation suggests, because the soil column is flexible. Reducing CSR
          through r<sub>d</sub> therefore <em>improves</em> FS.
        </p>
        <p>
          K<sub>σ</sub> sits inside CRR, the soil resistance. At high confining stress the soil is less able to mobilise
          the dilative tendencies that build cyclic resistance, so resistance per unit stress falls with depth. Reducing
          CRR through K<sub>σ</sub> therefore <em>worsens</em> FS.
        </p>
        <p>
          The net effect depends on their relative magnitudes. At shallow-to-intermediate depths r<sub>d</sub> typically
          dominates; below roughly 10–12 m K<sub>σ</sub> becomes increasingly important. This is why the most critical
          layer is often not the shallowest loose deposit but one at intermediate depth, where a high stress ratio σ
          <sub>v</sub>/σ′<sub>v</sub> below the water table, modest r<sub>d</sub> reduction, and K<sub>σ</sub> &lt; 1
          combine unfavourably.
        </p>
      </Question>

      <Question
        title={
          <>
            Why is K<sub>α</sub> &lt; 1 for loose soils but K<sub>α</sub> &gt; 1 for dense soils? The static shear stress
            is the same in both cases — what changes?
          </>
        }
      >
        <p>
          The static shear stress τ<sub>static</sub> is indeed the same: it depends on geometry and weight, not on
          density. What changes is the soil&apos;s volumetric response to shearing.
        </p>
        <p>
          A loose soil under static shear is already being deformed in a direction that tends to compress it. Cyclic
          loading superimposed on that bias pushes in the same direction; since the soil is undrained, the contractive
          tendency generates more pore pressure per cycle than under symmetric loading. The static shear has effectively
          pre-loaded the soil toward contractive failure, so less earthquake energy is needed. Hence K<sub>α</sub> &lt;
          1.0.
        </p>
        <p>
          A dense soil dilates under shear — particles ride up over one another. The static shear stress already induces
          a dilative tendency, which partially counteracts pore-pressure build-up during cyclic loading. More cyclic
          energy is required than on level ground. Hence K<sub>α</sub> &gt; 1.0.
        </p>
        <p>
          The crossover occurs at intermediate relative density, which is also roughly where behaviour changes from
          contractive (ψ &gt; 0) to dilative (ψ &lt; 0) in the critical state framework. That is not a coincidence: both
          phenomena reflect the same underlying volumetric tendency of the soil under shear.
        </p>
      </Question>

      <Question
        title={
          <>
            The 0.65 factor in the CSR formula was derived by Seed &amp; Idriss from a small set of accelerograms. Is it
            robust, what assumptions does it embed, and when might it be inappropriate?
          </>
        }
      >
        <p>
          The 0.65 factor is a statistical average, not a physical constant. It represents the ratio between the
          equivalent uniform cyclic stress and the peak stress for the records studied; individual records give ratios
          of roughly 0.50–0.80.
        </p>
        <p>
          Several assumptions are embedded in it. First, an irregular record is reduced to an equivalent uniform cyclic
          loading — superposition of damage from individual cycles is assumed valid. Second, 0.65 captures amplitude but
          not the number of cycles; MSF addresses duration, but amplitude and cycle count are correlated in real records,
          so the separation is imperfect. Third, the original records came from a limited strong-motion dataset with a
          particular spectral character; near-fault pulse-like motions may not be well represented.
        </p>
        <p>
          In practice the factor is embedded so deeply in the calibration of the CRR boundary curve that it cannot be
          changed independently — revising 0.65 would require re-deriving the whole case-history database. For unusual
          motions, such as long-duration subduction records or near-fault pulses, site-specific response analyses and
          more refined demand measures may be warranted.
        </p>
      </Question>

      <Question
        title={
          <>
            S<sub>u</sub>(residual) correlations carry very large scatter. Why is the uncertainty so large, and how should
            a designer respond to it?
          </>
        }
      >
        <p>
          S<sub>u</sub>(residual) cannot be measured directly on an undisturbed sample — by definition it is the strength
          of a soil that has already liquefied and reorganised. Correlations are therefore back-calculated from field
          flow slides: the post-failure geometry is reconstructed, the driving stresses are estimated, and the resulting
          shear stress becomes a data point. The result depends heavily on the accuracy of that reconstruction, which is
          often approximate.
        </p>
        <p>
          In addition, residual strength is sensitive to initial void ratio, confining stress, and void redistribution
          during liquefaction — none of which SPT alone captures. Two soils with identical {N160cs} but different
          gradation, fabric, or drainage boundaries can have very different residual strengths.
        </p>
        <p>
          The appropriate response is not to seek a more precise central estimate but to make conservatism explicit:
          use lower-bound or reduced design values, check sensitivity, and — for critical structures such as dams,
          levees, and infrastructure on slopes — size ground improvement so that triggering is prevented rather than
          relying on post-liquefaction strength.
        </p>
      </Question>

      <Question
        title={
          <>
            A site has PI = 9. Should the liquefaction analysis, the cyclic softening analysis, or both be applied? What
            does &quot;adopt the more conservative result&quot; mean in practice?
          </>
        }
      >
        <p>
          PI = 9 lies in the transitional zone (7 ≤ PI ≤ 12) of Boulanger &amp; Idriss (2008). The usual guidance is to
          perform both analyses and adopt the lower FS.
        </p>
        <p>
          The two analyses often disagree not because the soil follows both mechanisms simultaneously, but because the
          classification boundary carries real uncertainty. A soil with PI = 9 may behave predominantly sand-like,
          predominantly clay-like, or in between, depending on mineralogy, fabric, and stress history — none of which PI
          alone captures. Taking the lower FS is a hedge against that uncertainty.
        </p>
        <p>
          It is not automatically the right answer. The sand-like FS depends on reliable SPT and FC data; the clay-like
          FS depends on S<sub>u</sub> from good-quality sampling and testing. If one input set is poorly constrained, its
          FS may simply reflect data quality. The defensible approach is to perform both analyses carefully, understand
          which one governs and why, and let cyclic laboratory evidence take precedence over the classification boundary
          where it exists.
        </p>
      </Question>

      <Question
        title={
          <>
            In the Boulanger &amp; Idriss (2014) MSF, MSF<sub>max</sub> depends on {N160cs}, so denser soils are corrected
            more favourably for small-magnitude events. Is there a physical justification?
          </>
        }
      >
        <p>
          Yes, although the functional form is empirical. The link is the shape of the cyclic strength curve — the
          relationship between cyclic stress ratio and number of cycles to liquefaction.
        </p>
        <p>
          Dense soils have a steeper cyclic strength curve: their resistance depends strongly on the number of cycles.
          A short, small-magnitude earthquake with few equivalent cycles is therefore much less damaging than the
          reference M<sub>w</sub> 7.5 event, so MSF<sub>max</sub> is larger.
        </p>
        <p>
          Loose soils have a flatter curve: the first few cycles already generate most of the excess pore pressure, so
          reducing the number of cycles gives a smaller benefit, and MSF<sub>max</sub> is closer to 1.
        </p>
        <p>
          The coefficients were fitted to cyclic laboratory data showing this pattern, so physics and fit are consistent.
          They should, however, be applied only within the calibration range (roughly {N160cs} = 5–30 and M
          <sub>w</sub> = 5.5–8.5); extrapolation outside those bounds is not well supported.
        </p>
      </Question>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soil Liquefaction — Mechanism, Assessment, and Consequences",
  description:
    "A technically grounded overview of effective stress, triggering, susceptibility, simplified screening (CSR/CRR), and common consequences of liquefaction.",
};

const BODY_HTML = String.raw`<p class="meta">Geotechnical Engineering · Soil Dynamics</p>
<h1>Soil Liquefaction: Mechanism, Assessment, and Consequences</h1>
<p class="standfirst">During an earthquake, certain saturated granular soils lose their strength entirely and begin to flow. The phenomenon — liquefaction — has destroyed port cities, swallowed buildings, and sent dams sliding downslope. This article explains the physics behind it, how engineers quantify the risk, and where the standard methods reach their limits.</p>


<h2>Effective Stress and Why It Governs Everything</h2>

<p>Soil is a three-phase material: solid particles, water, and air. In a saturated deposit below the water table, the voids between particles are completely filled with water. The mechanical behaviour of that deposit is not governed by total stress — the full weight of everything above — but by <strong>effective stress</strong>, which is the portion of that weight actually transmitted through particle-to-particle contacts:</p>

<div class="formula">
σ′v  =  σv  −  u<br>
<span class="c">σv = total vertical stress [kPa]</span><br>
<span class="c">u  = pore water pressure = γw × (z − zGWT) [kPa]</span><br>
<span class="c">shear strength:  τ  =  σ′v · tan(φ′)</span>
</div>

<p>The consequence is immediate: if pore pressure <em>u</em> rises toward σv, effective stress falls toward zero, and with it shear strength falls toward zero. The soil can no longer resist any applied force. It flows. This is the physical core of liquefaction — not the earthquake itself, but what the earthquake does to pore pressure in a saturated granular deposit.</p>


<h2>How Liquefaction Is Triggered</h2>

<p>Earthquake shaking applies cyclic shear stresses to the soil. In a loose saturated sand, those stresses tend to compact the grain skeleton — particles want to rearrange toward a denser packing. Under undrained conditions, however, this compression cannot occur: the water has nowhere to go on the timescale of shaking. The compression tendency instead manifests as rising pore water pressure. With every cycle of shaking, <em>u</em> climbs a little higher and σ′v drops a little lower. When pore pressure equals total stress — when the water is carrying the full overburden — effective stress reaches zero and so does strength.</p>

<p>After shaking stops, the excess pore pressure begins to dissipate through drainage. The process is slow relative to the earthquake itself and may take minutes to hours depending on layer thickness and permeability. As water drains upward, particles resettle into a denser configuration. This post-earthquake reconsolidation is what produces the characteristic surface settlements seen after liquefaction events — fissures, sand boils, and the sinking or tilting of structures.</p>


<h2>Susceptibility: Which Soils and Why</h2>

<p>Four conditions must coincide for liquefaction to be a credible hazard:</p>

<ul>
  <li><strong>Below the water table.</strong> Pore pressure buildup requires saturation. The seasonally highest groundwater level governs — not the depth measured at time of drilling.</li>
  <li><strong>Shallow depth, typically less than 20 m.</strong> Deeper liquefaction cannot propagate surface damage through the overlying mass.</li>
  <li><strong>Loose granular material.</strong> Clean sands and non-plastic silts with (N₁)₆₀ below roughly 15 are the primary concern. Above 30, the soil is dense enough that cyclic resistance comfortably exceeds cyclic demand under realistic loading.</li>
  <li><strong>Low plasticity (PI &lt; 7).</strong> Clay minerals carry surface electrical charges that electrochemically bind pore water molecules. This suppresses the rapid pore pressure buildup that drives liquefaction. Soils with PI ≥ 12 behave in a fundamentally different way — see below.</li>
</ul>

<p>Fines content (FC) is sometimes confused with plasticity as a screening criterion. It is not. FC modifies the analysis through a correction to (N₁)₆₀, but only after PI has confirmed that the soil is sand-like. A fine-grained soil with high PI is not screened out by its fines content — it is screened out by its plasticity, and subjected to a different analysis entirely.</p>


<h2>Sand-Like and Clay-Like: Two Mechanisms</h2>

<p>Boulanger & Idriss (2008) formalised the distinction between <em>sand-like</em> and <em>clay-like</em> behaviour under cyclic loading. The boundary sits at PI ≈ 7, with a transitional zone from 7 to 12.</p>

<p>In sand-like soils (PI &lt; 7), the failure mode is sudden. Pore pressure builds rapidly over a small number of cycles and can reach total stress within the duration of the earthquake. The result is a complete and abrupt loss of shear strength — the soil liquefies.</p>

<p>In clay-like soils (PI &gt; 12), the clay mineral bonds suppress rapid pore pressure buildup. Instead, cyclic loading progressively degrades those bonds. Strength decreases cycle by cycle but never reaches zero in the same sudden way. The correct term for this is <em>cyclic softening</em>, not liquefaction. The analysis is structurally similar — CSR on the demand side, CRR on the resistance side — but CRR is derived from the undrained shear strength Su measured in the laboratory rather than from SPT blow counts.</p>

<div class="formula">
CRR₇.₅  =  0.8 × (Su / σ′v)       <span class="c">[clay-like soils, PI ≥ 12]</span>
</div>

<p>The 0.8 factor reflects that cyclic resistance is approximately 80% of the static undrained strength, derived from cyclic triaxial test data. Applying the liquefaction formula to a plastic clay is not conservative — it addresses the wrong mechanism entirely and can produce results that appear acceptable while the soil actually experiences significant strength degradation.</p>


<h2>The Standard Triggering Assessment</h2>

<p>The simplified procedure of Seed & Idriss (1971), as updated by Boulanger & Idriss (2014), is the standard method for evaluating liquefaction triggering. It compares cyclic stress demand (CSR) against cyclic resistance (CRR), producing a Factor of Safety:</p>

<div class="formula">
FS  =  CRRMw,σ  /  CSR<br><br>
CSR  =  0.65 · (σv / σ′v) · PGA · rd<br><br>
CRR₇.₅  =  exp[ (N₁)₆₀cs/14.1  +  ((N₁)₆₀cs/126)²<br>
                 − ((N₁)₆₀cs/23.6)³  +  ((N₁)₆₀cs/25.4)⁴  −  2.8 ]<br><br>
CRRMw,σ  =  CRR₇.₅ × MSF × Kσ<br><br>
<span class="c">rd    = depth reduction factor (Idriss 1999)</span><br>
<span class="c">MSF   = magnitude scaling factor</span><br>
<span class="c">Kσ    = overburden correction factor</span><br>
<span class="c">(N₁)₆₀cs = clean-sand equivalent normalized blow count</span>
</div>

<p>The <strong>0.65 factor</strong> in the CSR formula converts the irregular amplitude of a real earthquake record into an equivalent uniform amplitude that produces the same cumulative pore pressure damage. Seed & Idriss derived it from analysis of fourteen accelerograms and found that the average effective amplitude is approximately 65% of the peak. PGA alone does not describe a complete loading — it says nothing about how many times that peak was approximately reached. The 0.65 factor implicitly assumes a certain number of equivalent cycles, and the MSF adjusts for the actual number.</p>

<p>The <strong>Magnitude Scaling Factor</strong> corrects for earthquake duration. A Mw 5.5 earthquake produces roughly two to three equivalent shaking cycles. A Mw 8.5 earthquake produces forty or more. Two sites with identical PGA but different magnitude will experience fundamentally different levels of pore pressure accumulation. MSF exceeds 1.0 for magnitudes below 7.5 (fewer cycles, less damage than the reference case) and falls below 1.0 for magnitudes above 7.5.</p>

<p>The <strong>overburden correction Kσ</strong> accounts for the fact that the CRR formula was calibrated at shallow depths where σ′v is close to atmospheric pressure (101.3 kPa). At greater depths, high confining stress reduces the per-cycle pore pressure increment and thus the unit cyclic resistance. Kσ falls below 1.0 when σ′v exceeds Pa, typically at depths beyond about 10 m.</p>

<p>The <strong>depth reduction factor rd</strong> corrects the rigid-body assumption in the CSR derivation. In a flexible soil column, ground acceleration decreases with depth — the surface moves more than the deeper layers. Without rd, CSR would overestimate seismic demand at depth. rd is always ≤ 1.0 and is a function of depth alone.</p>

<div class="note">The recommended minimum Factor of Safety is FS ≥ 1.5. Values between 1.0 and 1.5 represent a marginal zone where triggering is not certain but the margin is insufficient for most practical purposes. Values below 1.0 indicate liquefaction is expected under the design ground motion.</div>


<h2>The Fines Content Correction: Δ vs. α+β</h2>

<p>Fine-grained particles occupying the void space of a sand matrix tend to increase cyclic resistance — they stiffen the grain contacts and modify the pore pressure response. The standard procedure corrects (N₁)₆₀ to a clean-sand equivalent (N₁)₆₀cs before entering the CRR formula.</p>

<p>Two correction systems exist and are not interchangeable.</p>

<p>The <strong>Youd et al. (2001) α+β method</strong> uses empirical coefficients that depend on FC to produce a corrected blow count directly:</p>

<div class="formula">
(N₁)₆₀cs  =  α  +  β · (N₁)₆₀<br>
<span class="c">α and β are tabulated functions of FC</span><br>
<span class="c">FC &lt; 5%: α=0, β=1.0  |  FC=35%: α=5.0, β=1.2</span>
</div>

<p>The <strong>Boulanger & Idriss (2014) Δ method</strong> adds an increment to (N₁)₆₀:</p>

<div class="formula">
(N₁)₆₀cs  =  (N₁)₆₀  +  Δ(N₁)₆₀<br><br>
Δ(N₁)₆₀  =  exp( 1.63 + 9.7/(FC+0.01) − (15.7/(FC+0.01))² )<br>
<span class="c">valid for 5% ≤ FC ≤ 35%; Δ = 0 for FC &lt; 5%; Δ = 5.0 for FC &gt; 35%</span>
</div>

<p>These systems produce different numerical results for the same FC and (N₁)₆₀ because they were calibrated against different datasets and paired with different CRR curves. Each must be used exclusively with its own CRR formulation. Mixing the Δ correction with the Youd et al. CRR curve — or vice versa — introduces systematic errors with no physical basis. In practice this distinction matters most in the 10–30% FC range, where the two corrections diverge most significantly.</p>


<h2>Flow Liquefaction and the Critical State</h2>

<p>Cyclic liquefaction is triggered by repeated shaking, bounded by shaking duration, and reversible once drainage restores effective stress. Flow liquefaction is different in every one of those respects.</p>

<p>The critical state line (CSL) is a unique curve in e–p′ space (void ratio versus mean effective stress) along which a soil can undergo unlimited shear deformation at constant volume and constant stress. Every sand has its own CSL. The state parameter ψ = e − e_CSL(p′) quantifies a soil's position relative to this line. When ψ &gt; 0, the soil is on the contractive side — loose of critical. When ψ &lt; 0, it is on the dilative side — dense of critical.</p>

<p>A contractive soil (ψ &gt; 0) subjected to undrained shearing does not simply lose strength cyclically. It undergoes <em>strain softening</em>: as deformation increases, strength falls. The falling strength allows more deformation, which causes more strength loss. This positive feedback loop can be triggered by a disturbance far smaller than a design earthquake — construction vibration, erosion, or even a change in boundary stress. Once started, it continues under gravity alone until the soil reaches a new equilibrium. Displacements of tens or hundreds of metres are possible. The 1971 San Fernando Dam failure and the 2014 Oso landslide are canonical examples.</p>

<p>The post-flow residual strength Su(residual) governs whether a slope can survive after liquefaction is triggered. The Idriss & Boulanger (2007) correlation estimates it from SPT data:</p>

<div class="formula">
ln( Su_res / σ′v )  =  −7.82  +  0.0456·(N₁)₆₀cs  −  0.000267·(N₁)₆₀cs²<br><br>
<span class="c">Su_res = mean residual strength [kPa]</span><br>
<span class="c">Design value: use mean ÷ 2.2  (≈ one standard deviation below mean)</span><br>
<span class="c">Uncertainty: ±1σ corresponds to a factor of ~2.2 in Su_res</span>
</div>

<p>For a loose sand with (N₁)₆₀cs = 10 at σ′v = 100 kPa, the mean Su_res is approximately 0.06 kPa. The static driving stress on a 10° slope at that depth is typically 8–15 kPa. The ratio is several hundred to one. This is why post-liquefaction slope stability is almost always catastrophic for loose contractive soils, and why densification alone — which increases (N₁)₆₀cs but still leaves Su_res in the fractions of a kilopascal — cannot solve a flow liquefaction problem on a steep slope.</p>


<h2>Slopes and the Kα Correction</h2>

<p>The standard CSR/CRR procedure assumes level ground: no static shear stress acts on horizontal planes before the earthquake. On a slope of angle β, that assumption fails. Gravity imposes a permanent static shear stress on every horizontal plane within the slope:</p>

<div class="formula">
τ_static  =  σ′v · sin(β) · cos(β)<br>
α  =  τ_static / σ′v  =  sin(β) · cos(β)<br><br>
CRR_slope  =  CRR₇.₅ × MSF × Kσ × Kα
</div>

<p>The Kα factor (Boulanger & Idriss 2003) captures how that pre-existing shear stress modifies cyclic resistance. Its behaviour is not intuitive. For loose soils (Dr &lt; 40%), Kα &lt; 1.0 — the static shear stress pre-loads the soil toward failure, so less additional cyclic energy is needed to trigger liquefaction. For dense soils (Dr &gt; 65%), Kα &gt; 1.0 — the pre-existing shear actually induces dilation during cyclic loading, stiffening the soil and increasing its resistance. The crossover occurs around Dr ≈ 55–60%, where Kα is approximately 1.0 regardless of α.</p>

<p>The practical implication is significant: for a loose soil on a 12° slope, Kα is typically around 0.62–0.65, reducing cyclic resistance by 35–38% compared with level ground — before the earthquake has even started. A site that passes the level-ground FS check may fail the slope-adjusted check purely because of geometry.</p>


<h2>Post-Liquefaction Settlement</h2>

<p>When excess pore pressure dissipates after an earthquake, the soil reconsolidates. Particles settle into a denser arrangement, and the resulting volumetric strain produces surface settlement. The Ishihara & Yoshimine (1992) method, as implemented by Zhang et al. (2002), estimates the volumetric strain from (N₁)₆₀cs and the Factor of Safety:</p>

<div class="formula">
FS &lt; 1.0:       εv  =  εv,max<br>
1.0 ≤ FS &lt; 2.0: εv  =  εv,max × (2.0 − FS)<br>
FS ≥ 2.0:       εv  =  0<br><br>
Si       =  (εv,i / 100) × Hi<br>
S_total  =  Σ Si<br><br>
<span class="c">εv,max from table: (N₁)₆₀cs = 5 → 10%  |  10 → 5.5%  |  15 → 3.0%  |  20 → 1.5%  |  30 → 0.2%</span>
</div>

<p>Settlements above about 15 cm are generally expected to produce significant structural damage. Differential settlement — where different parts of a structure settle by different amounts — is typically more damaging than uniform settlement, because it induces bending in structural elements not designed for that loading.</p>


<h2>What Liquefaction Does</h2>

<p><strong>Settlement and sand boils.</strong> Reconsolidation produces surface subsidence. Excess pore water, carrying fine particles, vents upward through cracks — the characteristic sand boils of post-earthquake photographs. The ejected material represents permanent volume loss in the liquefied layer.</p>

<p><strong>Lateral spreading.</strong> On gentle slopes of 1–3°, liquefied layers allow the overlying soil crust to translate horizontally toward free faces: riverbanks, coastlines, bridge abutments. Displacements of 1–5 m are typical. Buried pipelines, bridge foundations, and quay walls are the primary casualties — torn apart by horizontal ground movement rather than vertical settlement.</p>

<p><strong>Flow slides.</strong> On steeper slopes with contractive soils, flow liquefaction produces runout that continues after shaking stops, driven by gravity alone. The 1964 Alaska earthquake triggered flow slides that displaced entire hillside neighbourhoods. Embankment dams built on loose foundation soils are at particular risk.</p>

<p><strong>Structure uplift and tilt.</strong> Buried structures — manholes, underground tanks, basements — are less dense than liquefied soil and float upward. Heavy surface structures sink and tilt. The 1964 Niigata earthquake produced apartment buildings tilting past 60° as the sand beneath them liquefied. The buildings themselves remained structurally intact — they simply came to rest at extreme angles in what had briefly been a fluid.</p>

<hr>

<p class="qlabel">Further Questions</p>

<details>
  <summary>
    <span class="qn">01</span>
    <span class="qt">The Δ-correction and the α+β correction both convert (N₁)₆₀ to a clean-sand equivalent. Why are they not interchangeable, and what goes wrong if you use the Δ correction with the Youd et al. CRR curve?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>The two corrections were each developed as internally consistent systems. The Youd et al. (2001) α+β method was calibrated against a particular set of field case histories and paired with the CRR boundary curve presented in that paper. The Boulanger & Idriss (2014) Δ method was calibrated against a different, larger dataset using a revised CRR formulation. Each correction moves (N₁)₆₀ along the x-axis of its own CRR plot in a way that correctly accounts for the resistance contribution of fines — but only on that plot.</p>
    <p>If you apply the Δ correction and then read off CRR from the Youd et al. curve, you are using an x-axis position calibrated for one model on a curve calibrated for another. The CRR boundary curve has a nonlinear, exponential shape. A systematic offset in (N₁)₆₀cs — even a few blow counts — translates into a substantial and non-conservative error in CRR, particularly in the range (N₁)₆₀cs = 10–20 where the curve is steepest.</p>
    <p>In practice, the Boulanger & Idriss (2014) system is preferred for new projects because the Δ method produces a smoother correction that varies continuously with FC rather than requiring tabulated coefficients, and because it was calibrated on a more comprehensive case history database. The α+β method remains in use primarily for legacy projects and jurisdictions where Youd et al. is still the referenced standard. The key rule is simple: use one system throughout. Do not mix components.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">02</span>
    <span class="qt">A soil has FS_trigger = 1.6 using the standard CSR/CRR analysis — it passes. But a state parameter assessment indicates ψ &gt; 0. Should the engineer be concerned? What does FS_trigger not capture?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>Yes, the engineer should be concerned. The CSR/CRR framework answers a specific question: will cyclic loading from the design earthquake generate enough pore pressure to trigger liquefaction? It does not ask whether the soil is already in an inherently unstable state.</p>
    <p>A soil with ψ &gt; 0 is on the contractive side of the Critical State Line. It is in metastable equilibrium — held in place by static friction but with no capacity to resist strain softening if shearing begins. The trigger threshold for flow liquefaction in such a soil may be far smaller than the design earthquake. A construction vehicle, a minor explosion, a modest rainstorm increasing pore pressure slightly, or a distant small earthquake could all be sufficient. None of these events appears in the CSR/CRR calculation.</p>
    <p>The two assessments address different failure modes. CSR/CRR addresses cyclic triggering during the design event. The state parameter addresses susceptibility to flow liquefaction from any trigger at any time. On slopes, this distinction becomes critical: FS_trigger ≥ 1.5 for the design earthquake does not mean the slope is safe against flow. The post-liquefaction stability check using Su(residual) must be performed independently.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">03</span>
    <span class="qt">rd reduces CSR at depth, and Kσ reduces CRR at depth. Both factors decrease with increasing depth. How can two factors that both decrease with depth have opposite effects on the Factor of Safety?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>The apparent paradox dissolves when you track which side of the equation each factor belongs to.</p>
    <p>rd sits inside the CSR formula. CSR represents seismic demand — what the earthquake is asking the soil to withstand. rd &lt; 1.0 means the actual shear stress at depth is smaller than the rigid-body approximation would suggest, because the soil column is flexible rather than rigid. Reducing CSR via rd therefore <em>improves</em> FS — the earthquake is demanding less than it would appear from surface motion alone.</p>
    <p>Kσ sits inside the CRR expression. CRR represents soil resistance — what the soil can provide. Kσ &lt; 1.0 means that at high confining stress, each cycle of loading causes a smaller increment of pore pressure buildup, but the existing confining pressure is already high enough to suppress the dilative tendencies that build resistance. The net effect is that per-unit resistance falls with depth. Reducing CRR via Kσ therefore <em>worsens</em> FS — the soil is less resistant than shallow calibration data would suggest.</p>
    <p>Both decrease with depth, but one reduces demand and the other reduces resistance. The net effect on FS depends on their relative magnitudes. At depths around 5–8 m, rd dominates and FS tends to be higher than at the surface. Below roughly 10–12 m, Kσ dominates and FS falls again. This is why the most dangerous layer is often not the shallowest loose deposit but one at intermediate depth where the combination of moderate σ′v (high stress ratio σv/σ′v), low rd, and low Kσ all conspire together.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">04</span>
    <span class="qt">Why does Kα &lt; 1 for loose soils but Kα &gt; 1 for dense soils? The static shear stress is the same in both cases — it depends only on slope angle and overburden. What changes?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>The static shear stress τ_static is indeed the same — it is a function of geometry and weight, not of soil density. What changes is the soil's volumetric response to shearing, and that is the key.</p>
    <p>A loose soil under static shear is already being deformed in a direction that tends to compress it. When cyclic loading is superimposed, the additional shear increments push in the same general direction as the static load. The soil wants to contract, and since it is undrained, that tendency generates more pore pressure per cycle than it would under symmetric loading. The static shear has effectively pre-loaded the soil toward contractive failure. Less additional energy from the earthquake is needed to bring σ′v to zero. Hence Kα &lt; 1.0.</p>
    <p>A dense soil under static shear responds differently. Dense soils dilate under shear — they tend to expand volumetrically as particles ride up over one another. The static shear stress, even before the earthquake, is inducing a tendency toward dilation. When cyclic loading is applied, that dilative tendency partially counteracts the pore pressure buildup that would otherwise occur. More cyclic energy is required to trigger liquefaction than on level ground. Hence Kα &gt; 1.0.</p>
    <p>The crossover between these two regimes occurs around Dr ≈ 55–60%, corresponding roughly to (N₁)₆₀ ≈ 15. This is also approximately the boundary between contractive (ψ &gt; 0) and dilative (ψ &lt; 0) behaviour in the critical state framework — which is not a coincidence. Both phenomena reflect the same underlying volumetric tendency of the soil under shear.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">05</span>
    <span class="qt">The 0.65 factor in the CSR formula was derived by Seed & Idriss from 14 accelerograms. Is this number robust? What assumptions does it embed, and when might it be inappropriate to use?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>The 0.65 factor is an average over a small set of records, and that limitation is worth understanding. Seed & Idriss computed, for each record, the ratio of the average effective pore pressure increment amplitude to the peak stress amplitude. The mean across their fourteen records was approximately 0.65. The factor is therefore a statistical average, not a physical constant. Individual records produce ratios ranging from about 0.50 to 0.80.</p>
    <p>Several assumptions are embedded in its use. First, it implicitly assumes that the irregular record can be reduced to an equivalent uniform cyclic loading — that superposition of damage from individual cycles is valid. This is a reasonable engineering approximation but not exact. Second, the 0.65 factor captures amplitude but not the number of cycles. The MSF partially addresses this, but the separation between amplitude correction (0.65) and cycle count correction (MSF) is not perfect — the two are correlated in real records. Third, the original records were western United States strong-motion data from the 1960s, which has a particular spectral character. Near-fault records with pulse-like waveforms may not be well represented by this average.</p>
    <p>In practice, the 0.65 factor has been used successfully for decades and is embedded so deeply in the calibration of the CRR boundary curve that it cannot be changed independently — any revision to 0.65 would require re-deriving the entire CRR database from scratch. For unusual ground motions, such as subduction zone records with very long durations or near-fault pulse records, more sophisticated approaches using site-specific ground motion parameters may be warranted.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">06</span>
    <span class="qt">Su(residual) from the Idriss & Boulanger (2007) correlation has ±1σ uncertainty of about a factor of 2.2. This is enormous compared to typical geotechnical uncertainty. Why is it so large, and how should a designer respond to it?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>The uncertainty is large for several compounding reasons. Su(residual) is not a property you can measure directly in a laboratory test on an undisturbed sample — by definition, it is the strength of a soil that has already liquefied and reorganised itself. The correlation is therefore back-calculated from field case histories: you observe a flow slide, estimate the driving geometry and mass, back-calculate the shear stress at failure, and that becomes a data point for Su(residual). The number depends critically on the accuracy of the post-failure geometry reconstruction, which is often approximate and sometimes speculative.</p>
    <p>Additionally, Su(residual) is sensitive to initial void ratio, confining stress, and the amount of void redistribution during liquefaction — none of which are captured by SPT alone. Two soils with identical (N₁)₆₀cs but different gradations, initial fabric, or drainage boundaries will have different residual strengths.</p>
    <p>For a designer, the appropriate response is not to seek a more precise central estimate but to make the conservatism explicit. The convention of using mean ÷ 2.2 as the design value means you are selecting approximately the 16th percentile — one standard deviation below the mean. For critical structures (dams, levees, infrastructure on slopes), some designers use lower bounds corresponding to two standard deviations below the mean. The more important implication is that for slopes with contractive loose soils, ground improvement should be sized such that flow liquefaction triggering is prevented entirely — the post-liquefaction stability check will almost never be passed once a genuine flow liquefaction condition exists, regardless of which percentile of Su(residual) you use.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">07</span>
    <span class="qt">A site has PI = 9. Should you apply the liquefaction analysis, the cyclic softening analysis, or both? What does "adopt the more conservative result" actually mean in practice, and is it always the right approach?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>PI = 9 falls in the transitional zone defined by Boulanger & Idriss (2008) as 7 ≤ PI ≤ 12. The guidance is to perform both analyses and adopt the result that produces the lower FS — the more conservative outcome.</p>
    <p>In practice, the two analyses often give different FS values not because the soil genuinely behaves according to both mechanisms simultaneously, but because the empirical boundaries of the classification system carry real uncertainty. A soil with PI = 9 might behave predominantly sand-like, predominantly clay-like, or somewhere between, depending on the specific clay mineralogy, fabric, and stress history — none of which PI alone captures. The instruction to take the more conservative result is an engineering hedge against that mineralogical uncertainty.</p>
    <p>The question of whether it is always the right approach is legitimate. In the sand-like analysis, FS depends heavily on (N₁)₆₀cs, which requires a reliable SPT and FC measurement. In the clay-like analysis, FS depends on Su measured in the laboratory, which requires undisturbed sampling and appropriate test conditions. If one of those inputs is poorly constrained, the FS from that analysis may not be a reliable lower bound — it may simply be an artefact of data quality. A designer who blindly adopts the lower FS without examining why it is lower may be optimising against the wrong failure mode.</p>
    <p>The most defensible approach for a PI = 9 soil is to perform both analyses carefully, understand which one governs and why, and apply engineering judgment about whether the governing mechanism is physically plausible for that specific soil. If laboratory data suggests the soil behaves clay-like in cyclic triaxial tests despite PI = 9, that observation takes precedence over the classification boundary.</p>
  </div>
</details>

<details>
  <summary>
    <span class="qn">08</span>
    <span class="qt">The MSF formula depends on (N₁)₆₀cs through MSFmax. This means denser soils get a higher MSFmax and are corrected more favourably for small-magnitude earthquakes. Is there a physical justification for this, or is it purely empirical?</span>
    <span class="qa">▾</span>
  </summary>
  <div class="ans">
    <p>There is a physical basis, though the formula itself is empirical. The connection runs through the concept of the incremental pore pressure ratio: how much does each cycle of loading increase pore pressure relative to the total that would eventually liquefy the soil? This ratio is not constant — it depends on the soil's state.</p>
    <p>A dense soil (high (N₁)₆₀cs) has higher initial cyclic resistance CRR₇.₅. When the applied CSR is well below CRR, each individual cycle causes a small pore pressure increment. The soil is far from the triggering threshold per cycle, so it takes many cycles to accumulate triggering-level excess pore pressure. The duration of shaking — and therefore earthquake magnitude — matters a lot, because it determines how many cycles accumulate. Hence MSFmax is large for dense soils: the difference between a short and a long earthquake is large in relative terms.</p>
    <p>A loose soil (low (N₁)₆₀cs) has low CRR₇.₅. When CSR is close to CRR, each cycle causes a large fractional increment of pore pressure. Even a short earthquake may accumulate sufficient pore pressure. The number of additional cycles from a larger earthquake adds less marginal damage because the first few cycles already do most of the work. Hence MSFmax is smaller for loose soils: the difference between a short and a long earthquake is less significant when the first few cycles dominate.</p>
    <p>The empirical coefficients in the MSFmax formula were fitted to cyclic laboratory test data showing this pattern, so the physical reasoning and the empirical fit are consistent — the formula is not purely arbitrary. That said, the specific functional form and coefficients should be applied only within the calibration range (approximately (N₁)₆₀cs = 5–30, Mw = 5.5–8.5), and extrapolation outside those bounds is not well-supported.</p>
  </div>
</details>`;

const SCOPED_CSS = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@300;400;600&family=Source+Code+Pro:wght@400&display=swap');

.liq-post {
  --text:  #1c1c1c;
  --muted: #555;
  --light: #888;
  --rule:  #e0e0e0;
  --bg:    #ffffff;
  --code:  #f4f4f4;
}

.liq-post, .liq-post * { box-sizing: border-box; margin: 0; padding: 0; }

.liq-post {
  font-family: 'Lora', Georgia, serif;
  font-size: 18px;
  line-height: 1.8;
  color: var(--text);
  background: var(--bg);
  max-width: 660px;
  margin: 0 auto;
  padding: 72px 24px 120px;
}

.liq-post .meta {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 12px;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--light);
  margin-bottom: 18px;
}

.liq-post h1 {
  font-size: 1.95rem;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 20px;
  letter-spacing: -.01em;
}

.liq-post .standfirst {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 1.05rem;
  font-weight: 300;
  color: var(--muted);
  line-height: 1.7;
  border-bottom: 1px solid var(--rule);
  padding-bottom: 40px;
  margin-bottom: 48px;
}

.liq-post h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 56px 0 16px;
  letter-spacing: -.01em;
}

.liq-post h3 {
  font-family: 'Source Sans 3', sans-serif;
  font-size: .88rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--muted);
  margin: 40px 0 12px;
}

.liq-post p { margin-bottom: 1.3em; }
.liq-post p:last-child { margin-bottom: 0; }

.liq-post ul, .liq-post ol { margin: 0 0 1.3em 1.2em; }
.liq-post li { margin-bottom: .5em; }

.liq-post strong { font-weight: 600; }
.liq-post em { font-style: italic; }

.liq-post .formula {
  font-family: 'Source Code Pro', monospace;
  font-size: .82rem;
  background: var(--code);
  padding: 14px 18px;
  margin: 22px 0;
  line-height: 2;
  overflow-x: auto;
  border-left: 2px solid #ccc;
}

.liq-post .formula .c {
  color: var(--light);
  font-style: italic;
}

.liq-post .note {
  font-family: 'Source Sans 3', sans-serif;
  font-size: .93rem;
  color: var(--muted);
  background: #fafafa;
  border-left: 2px solid #ccc;
  padding: 12px 16px;
  margin: 22px 0;
  line-height: 1.65;
}

.liq-post hr {
  border: none;
  border-top: 1px solid var(--rule);
  margin: 60px 0;
}

.liq-post .qlabel {
  font-family: 'Source Sans 3', sans-serif;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--light);
  margin-bottom: 28px;
}

.liq-post details {
  border-top: 1px solid var(--rule);
}

.liq-post details:last-child {
  border-bottom: 1px solid var(--rule);
}

.liq-post summary {
  display: flex;
  gap: 14px;
  align-items: baseline;
  cursor: pointer;
  padding: 22px 0;
  list-style: none;
  user-select: none;
}

.liq-post summary::-webkit-details-marker { display: none; }

.liq-post .qn {
  font-family: 'Source Code Pro', monospace;
  font-size: .75rem;
  color: #bbb;
  white-space: nowrap;
  flex-shrink: 0;
}

.liq-post .qt {
  font-family: 'Source Sans 3', sans-serif;
  font-size: .97rem;
  line-height: 1.5;
  color: var(--text);
  flex: 1;
}

.liq-post .qa {
  font-size: .7rem;
  color: #ccc;
  flex-shrink: 0;
  transition: transform .2s;
}

.liq-post details[open] .qa { transform: rotate(180deg); }

.liq-post .ans {
  padding: 4px 0 28px 52px;
  font-family: 'Source Sans 3', sans-serif;
  font-size: .95rem;
  line-height: 1.72;
  color: var(--muted);
}

.liq-post .ans p { margin-bottom: .9em; }
.liq-post .ans p:last-child { margin-bottom: 0; }

.liq-post .ans .formula {
  font-size: .8rem;
  margin: 16px 0;
}

.liq-post .ans ul {
  margin: 0 0 .9em 1.1em;
}

.liq-post .ans li { margin-bottom: .4em; }
`;

export default function LiquefactionBlogPostPage() {
  return (
    <>
      <style>{SCOPED_CSS}</style>
      <main className="liq-post" dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </>
  );
}


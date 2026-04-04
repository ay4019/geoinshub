const equationDescriptionMap: Record<string, string[]> = {
  "degree-of-saturation": [
    "This relationship calculates the degree of saturation when water content, specific gravity of solids, and void ratio are known.",
  ],
  "water-content": [
    "This formula gives gravimetric water content by dividing the mass of water in the sample by the dry soil mass.",
  ],
  "bulk-dry-density": [
    "This expression gives the natural or bulk unit weight by dividing total weight by volume.",
    "This expression converts bulk unit weight to dry unit weight by accounting for water content.",
    "This conversion expresses dry unit weight in terms of mass density.",
  ],
  "gmax-from-vs": [
    "This conversion derives mass density from unit weight when gamma is the chosen input style.",
    "This equation uses the elastic relationship between shear wave velocity and mass density to estimate the small-strain shear modulus.",
    "This form writes the same small-strain modulus directly in terms of unit weight and shear wave velocity.",
  ],
  "eoed-from-mv": [
    "This relationship computes the one-dimensional constrained modulus as the inverse of the coefficient of volume compressibility.",
  ],
  "ocr-calculator": [
    "This ratio shows how much larger the maximum past effective stress is than the current vertical effective stress.",
  ],
  "aashto-classification": [
    "This expression calculates the group index from fines content, liquid limit, and plasticity index; higher values generally indicate weaker subgrade behaviour.",
  ],
  "plasticity-chart-visualizer": [
    "This formula calculates the plasticity index as the difference between liquid limit and plastic limit.",
    "This equation defines the A-line on the Casagrande plasticity chart and is used to distinguish silt-like from clay-like behaviour.",
  ],
  "liquefaction-soil-screening": [
    "In this tool, the soil is screened using rule-based PI, LL, and fines-content thresholds rather than a single direct formula output.",
  ],
  "N<sub>q</sub> = e<sup>&pi;tan&phi;'</sup> tan<sup>2</sup>(45 + &phi;'/2)": [
    "This equation gives the surcharge bearing-capacity factor Nq from the effective friction angle.",
  ],
  "N<sub>c</sub> = (N<sub>q</sub> - 1) / tan&phi;'": [
    "This equation gives the cohesion bearing-capacity factor Nc once Nq has been established.",
  ],
  "N<sub>&gamma;,Terzaghi</sub> = 1.5(N<sub>q</sub> - 1)tan&phi;'": [
    "This equation gives the Terzaghi form of the unit-weight bearing-capacity factor Nγ.",
  ],
  "N<sub>&gamma;,Meyerhof/Hansen</sub> = (N<sub>q</sub> - 1)tan(1.4&phi;')": [
    "This equation gives the Meyerhof and Hansen form of the unit-weight bearing-capacity factor Nγ.",
  ],
  "N<sub>&gamma;,Vesic</sub> = 2(N<sub>q</sub> + 1)tan&phi;'": [
    "This equation gives the Vesic form of the unit-weight bearing-capacity factor Nγ.",
  ],
  "tan&phi;'<sub>d</sub> = tan&phi;' / &gamma;<sub>M,&phi;</sub>": [
    "This equation reduces the tangent of the friction angle using the selected Eurocode 7 material factor on shear strength.",
  ],
  "c'<sub>d</sub> = c' / &gamma;<sub>M,c</sub>": [
    "This equation gives the design cohesion by dividing characteristic cohesion by the selected material factor.",
  ],
  "q<sub>Rd</sub> = q<sub>ult,d</sub> / &gamma;<sub>R,v</sub>": [
    "This equation converts design ultimate bearing resistance into design bearing resistance using the selected resistance factor.",
  ],
  "DA1 Combination 1 = A1 + M1 + R1": [
    "This identifies the first Design Approach 1 combination, where action set A1, material set M1, and resistance set R1 are used.",
  ],
  "DA1 Combination 2 = A2 + M2 + R1": [
    "This identifies the second Design Approach 1 combination, where action set A2, material set M2, and resistance set R1 are used.",
  ],
  "DA2 = A1 + M1 + R2": [
    "This identifies Design Approach 2, combining action set A1, material set M1, and resistance set R2.",
  ],
  "DA3 = (A1 or A2) + M2 + R3": [
    "This identifies Design Approach 3, where M2 is combined with R3 and the action set depends on the verification context.",
  ],
  "terzaghi-bearing-capacity": [
    "This general expression gives ultimate bearing capacity by combining cohesion, surcharge, and unit-weight contributions.",
    "This term represents the approximate surcharge stress at foundation base level.",
    "This step converts ultimate bearing capacity into allowable bearing pressure using the selected factor of safety.",
  ],
  "meyerhof-bearing-capacity": [
    "This form extends the Terzaghi approach by introducing shape and depth corrections for a more flexible bearing-capacity expression.",
    "This term represents the effective surcharge stress at foundation level.",
    "This result is the allowable bearing pressure after the factor of safety has been applied.",
  ],
  "hansen-bearing-capacity": [
    "This equation calculates ultimate bearing capacity using Hansen-style shape and depth corrections.",
    "This term represents the surcharge stress corresponding to the embedment depth of the footing.",
    "This step divides the ultimate capacity by the factor of safety to obtain an allowable service-level value.",
  ],
  "vesic-bearing-capacity": [
    "This expression is the general bearing-capacity form used in the Vesic approach.",
    "This relationship calculates the N-gamma factor as a function of friction angle.",
    "This step converts ultimate bearing capacity into allowable bearing capacity.",
  ],
  "allowable-bearing-capacity": [
    "This is the most basic design conversion: known ultimate capacity is divided by the selected factor of safety.",
  ],
  "e<sub>x</sub> = M<sub>y</sub> / P": [
    "This equation derives eccentricity in the footing-width direction from moment about the y-axis divided by axial load.",
  ],
  "e<sub>y</sub> = M<sub>x</sub> / P": [
    "This equation derives eccentricity in the footing-length direction from moment about the x-axis divided by axial load.",
  ],
  "schmertmann-settlement": [
    "This simplified expression estimates settlement by combining net foundation pressure, footing width, selected correction factors, and a representative modulus.",
  ],
  "secondary-compression-settlement": [
    "This equation calculates logarithmic time-dependent creep settlement after primary consolidation.",
  ],
  "layered-settlement": [
    "For each layer, settlement contribution is obtained by multiplying stress increase by compressibility and layer thickness.",
    "Total settlement is the sum of the settlement contributions from all layers.",
  ],
  "stress-distribution-21": [
    "This 2:1 expression assumes the loaded area spreads one horizontal unit for every two vertical units and returns the average stress increase at depth.",
    "This 30-degree expression spreads the footing load using a wider geometric stress bulb and returns the average stress over that enlarged area.",
    "This Boussinesq form represents the elastic vertical stress beneath the footing by integrating point-load effects over the loaded rectangular area.",
  ],
  "rankine-earth-pressure": [
    "This equation gives the active lateral earth pressure coefficient for level backfill.",
    "This equation gives the passive lateral earth pressure coefficient.",
    "This formula calculates the total active thrust from soil self-weight and any uniform surcharge.",
  ],
  "coulomb-earth-pressure": [
    "This expression gives a simplified Coulomb active earth pressure coefficient that also accounts for wall friction.",
  ],
  "k0-earth-pressure": [
    "This Jaky relationship gives the at-rest lateral earth pressure coefficient for normally consolidated soil.",
    "This extended form includes OCR to estimate an approximate K0 value for overconsolidated soils.",
    "This Rankine expression gives the active lateral earth pressure coefficient.",
    "This Rankine expression gives the passive lateral earth pressure coefficient.",
  ],
  "pile-axial-capacity": [
    "This term gives shaft capacity from unit skin resistance multiplied by pile perimeter and embedded length.",
    "This term gives base capacity from unit base resistance multiplied by pile base area.",
    "This step applies the factor of safety to the total ultimate capacity.",
  ],
  "pile-alpha-beta-lambda": [
    "This general expression produces unit shaft resistance by multiplying the selected alpha, beta, or lambda coefficient by an appropriate reference stress.",
    "This capacity is the simplified integration of unit shaft resistance along the pile perimeter and length.",
  ],
  "negative-skin-friction": [
    "This relationship gives the average negative shaft friction when surrounding soil drags downward on the pile.",
    "This load is the accumulated negative shaft resistance over the drag length.",
  ],
  "pile-group-efficiency": [
    "This empirical expression gives an approximate group efficiency based on pile spacing and layout.",
  ],
  "preloading-settlement": [
    "This logarithmic stress relationship gives primary consolidation settlement for a specified stress increase.",
  ],
  "wick-drains-time-factor": [
    "This time factor represents the rate of radial consolidation as a function of horizontal consolidation coefficient and elapsed time.",
    "This term describes the geometric relationship between drain spacing and drain size.",
    "This result gives the average degree of consolidation under a Barron-type solution.",
  ],
  "stone-column-improvement": [
    "This expression estimates the improvement factor from area replacement ratio and stress concentration.",
  ],
  "liquefaction-csr": [
    "This Seed-Idriss relationship gives the normalized cyclic shear demand induced during earthquake loading.",
  ],
  "liquefaction-crr": [
    "This empirical expression gives an approximate cyclic resistance ratio for Mw 7.5 from corrected SPT resistance.",
  ],
  "liquefaction-factor-of-safety": [
    "This ratio compares cyclic resistance with cyclic demand to indicate the level of safety against liquefaction triggering.",
  ],
  "post-liquefaction-settlement": [
    "This screening correlation estimates relative density from corrected SPT resistance so the post-liquefaction strain sequence can start from an index of density state.",
    "This Idriss and Boulanger style expression calculates limiting shear strain from relative density. The source notation says gamma_lim must not be less than 0.05, so writing the relation with max(...) is mathematically equivalent to enforcing that lower bound.",
    "This parameter defines the transition point below which the simplified maximum shear-strain expression is capped by the limiting strain.",
    "This piecewise expression estimates maximum shear strain from factor of safety and relative density, while enforcing the calculated limiting shear strain as an upper cap.",
    "This expression estimates volumetric strain from relative density and the calculated maximum shear strain in a simplified post-liquefaction consequence framework.",
    "This final step multiplies volumetric strain by layer thickness to estimate settlement.",
  ],
  "seed-idriss-liquefaction-screening:tbdy-2018": [
    "These piecewise fines-correction expressions calculate alpha and beta from fines content so the SPT resistance can be adjusted to an equivalent clean-sand basis.",
    "This expression converts the measured corrected SPT resistance into a fines-corrected resistance used in the simplified triggering procedure.",
    "This empirical base-curve expression gives the cyclic resistance ratio referenced to an earthquake magnitude of 7.5.",
    "This magnitude correction factor adjusts the resistance side of the simplified procedure for earthquakes other than Mw 7.5.",
    "This depth reduction factor lowers the cyclic stress demand with increasing depth in the simplified Seed-Idriss framework.",
    "This equation gives the available liquefaction resistance stress using CRR_M7.5, magnitude correction, and effective stress.",
    "This equation gives the earthquake-induced cyclic shear stress demand using total stress, PGA, and the depth reduction factor.",
    "This ratio compares liquefaction resistance stress with earthquake shear demand to provide a screening-level factor of safety.",
  ],
  "seed-idriss-liquefaction-screening:idriss-boulanger-2008": [
    "This fines-correction expression adds a Delta N increment to the corrected SPT resistance to produce a clean-sand equivalent resistance.",
    "This equation forms the clean-sand equivalent corrected SPT resistance used in the Idriss and Boulanger base curve.",
    "This Seed-Idriss style demand expression gives CSR from peak horizontal acceleration, overburden stress ratio, and the depth reduction factor.",
    "This empirical exponential expression gives CRR at magnitude 7.5 from the clean-sand equivalent SPT resistance.",
    "This magnitude scaling factor adjusts the resistance side from the reference magnitude to the earthquake magnitude of interest.",
    "This ratio compares magnitude-corrected resistance with cyclic stress demand to provide a screening-level factor of safety.",
  ],
  "track-stiffness": [
    "This ratio gives local track stiffness from the vertical movement produced per unit applied load.",
  ],
  "subgrade-modulus": [
    "This expression derives the modulus of subgrade reaction from applied pressure divided by measured deflection.",
  ],
  "ballast-settlement": [
    "This power-law expression represents cumulative ballast settlement as a function of load cycles; the a and b coefficients must be calibrated.",
  ],
  "track-modulus": [
    "This expression defines a simplified distributed track modulus by dividing the load-deflection ratio by sleeper spacing.",
  ],
  "differential-settlement-indicator": [
    "This indicator gives the severity of differential settlement by dividing the settlement difference between two points by the evaluation length.",
  ],
  "spt-corrections": [
    "This equation converts the measured field N value to the standard N60 value using energy and equipment corrections.",
    "This ratio normalizes hammer energy to the 60 percent reference level.",
    "This piecewise rule assigns C_r from sample depth range according to the Youd et al. (2001) table used in the tool.",
    "This equation estimates vertical effective stress at sample depth using bulk unit weight and groundwater depth.",
    "This Idriss and Boulanger (2008) expression estimates the overburden correction factor from effective vertical stress and applies an upper cap of 1.7.",
    "This result applies C_N to N60 and then limits (N1)60 so it does not exceed twice N60 in the screening workflow.",
  ],
  "cpt-parameter-correlation": [
    "This relationship uses the cone resistance above total overburden stress to estimate undrained shear strength approximately.",
    "This empirical expression provides an approximate estimate of effective friction angle from qc level.",
  ],
  "lwd-modulus": [
    "This relationship gives an approximate surface modulus from LWD stress, plate radius, and measured deflection.",
  ],
  "plate-load-test-modulus": [
    "This ratio gives the secant subgrade reaction value from the pressure increment divided by the corresponding settlement increment.",
    "This expression back-calculates an approximate elastic modulus from the plate load response.",
  ],
  "cu-vs-depth": [
    "This linear profile adds a depth-dependent strength increase to the surface undrained shear strength.",
  ],
  "cu-from-pi-and-spt": [
    "This Stroud (1974) relationship is used directly to estimate undrained shear strength from the chart-derived f1 factor and corrected SPT resistance.",
    "This step states that f1 is obtained by linearly interpolating between interpreted Stroud PI anchor points used in the tool.",
  ],
  "friction-angle-from-spt": [
    "This empirical relationship, commonly cited after Peck, Hanson, and Thornburn (1974), gives an approximate effective friction angle for granular soils from corrected SPT resistance.",
  ],
  "modulus-from-cu": [
    "This conversion uses the selected E/cu ratio to estimate elastic modulus from undrained shear strength.",
  ],
  "resilient-modulus-from-cbr": [
    "This correlation gives a first-pass estimate of resilient modulus from CBR.",
  ],
};

export function getEquationDescriptions(slug: string, equationCount: number): string[] {
  const descriptions = equationDescriptionMap[slug] ?? [];

  return Array.from({ length: equationCount }, (_, index) => {
    return (
      descriptions[index] ??
      "This formula represents one of the calculation steps in the method and is used to obtain the relevant engineering quantity in the result."
    );
  });
}

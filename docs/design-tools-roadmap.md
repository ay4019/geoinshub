# Tasarım Araçları — Altyapı ve Aktivasyon Planı

Bu doküman `lib/design-tools/` altında hazırlanan, **henüz yayında olmayan** araçları ve bunların nasıl
aktifleştirileceğini anlatır. Tüm araçlar `data/tools-drafts.ts` içinde `status: "draft"` olarak durur; bu
durumda katalogda, `/tools/[slug]` rotasında ve sitemap'te görünmezler.

## Mimari

| Katman | Dosya | Görev |
|---|---|---|
| Hesap motoru | `lib/design-tools/*.ts` | Saf, tipli `compute*` fonksiyonları (SI birimleri). İleride özel UI (tabaka tablosu, grafik) aynı motoru kullanır. |
| Form adaptörü | aynı dosyalar, `*Calculator` | `FormValues → CalculationResult`; mevcut jenerik **Calculation** sekmesi ile birebir uyumlu. |
| Kayıt | `lib/design-tools/registry.ts` | slug → hesaplayıcı. `calculateBySlug()` önce mevcut araçlara, sonra bu kayda bakar. |
| Tanım | `data/tools-drafts.ts` | Girdiler, metodoloji, varsayımlar, sınırlamalar, denklemler, kaynaklar. |
| Görünürlük | `lib/data-layer.ts` | `archived` ve `draft` araçlar listelenmez. |
| Doğrulama | `scripts/verify-design-tools.ts` | Literatür/el hesabı kıyasları + her taslağın varsayılan girdilerle çalıştığı kontrolü. |

Doğrulamayı çalıştırmak için:

```bash
node scripts/run-ts.mjs scripts/verify-design-tools.ts
```

## Hazır araçlar

### Site Characterisation

| Slug | Araç | Temel kaynak |
|---|---|---|
| `cpt-interpretation-robertson` | CPT/CPTu yorumu: Q_tn, F_r, B_q, I_c, SBTn zonu, s_u, OCR, φ′, D_r, V_s, M, eşdeğer N60 | Robertson (2009), Robertson & Cabal (2015), Kulhawy & Mayne (1990) |
| `shear-wave-velocity-from-spt` | SPT'den V_s (4 korelasyon karşılaştırmalı) | Imai & Tonouchi (1982), Ohta & Goto (1978), Sykora & Stokoe (1983), Iyisan (1996) |
| `vs30-site-class` | V_s,30 ve zemin sınıfı (TBDY 2018 ZA–ZE, EC8 A–D) | TBDY 2018 Bölüm 16, EN 1998-1 |
| `relative-density-from-spt` | (N1)60'tan D_r (3 yöntem) | Skempton (1986), Kulhawy & Mayne (1990), Idriss & Boulanger (2008) |
| `compression-index-correlations` | C_c (5 korelasyon), C_r ve C_α aralıkları | Skempton (1944), Terzaghi & Peck (1967), Nishida (1956), Mesri & Godlewski (1977) |
| `undrained-strength-stress-history` | SHANSEP / Mesri / Skempton ile s_u | Ladd (1991), Mesri (1975), Skempton (1957) |

### Geotechnical Analysis

| Slug | Araç | Temel kaynak |
|---|---|---|
| `pile-axial-capacity-fhwa` | Çakma kazık (α/β, Meyerhof uç) ve fore kazık (GEC-10 α/β, N60 uç); 3 tabakalı profil, YASS | FHWA GEC-12 (2016), GEC-10 (2018) |
| `slope-stability-bishop` | Bishop basitleştirilmiş kritik daire araması (2 tabaka, freatik yüzey veya r_u, sürşarj, k_h) + sonsuz şev | Bishop (1955), Duncan et al. (2014), ACADS kıyas problemi |
| `deep-mixing-columns-fhwa` | DMM kolonları: a_s, tasarım dayanımı (saha/lab + değişkenlik), kompozit dayanım/modül, gerilme paylaşımı, oturma | FHWA-HRT-13-046 (2013) |
| `stone-columns-fhwa` | Taş kolon: Barksdale & Bachus gerilme yoğunlaşması, Priebe n0, oturma azaltımı, şişme kapasitesi | FHWA/RD-83/026, Priebe (1995), GEC-13 |
| `prefabricated-vertical-drains` | PVD: Hansbo smear + kuyu direnci, U_h/U_v/U, hedef U için süre ve aralık | Hansbo (1981), FHWA/RD-86/168, GEC-13 |
| `dynamic-compaction-fhwa` | Dinamik kompaksiyon: iyileştirme derinliği, enerji, vuruş sayısı, PPV | FHWA-SA-95-037 (Lukas 1995) |
| `soil-nail-wall-gec7` | Zemin çivisi: çekme/sıyrılma kapasitesi, T_max-s, düzlemsel kama global stabilite araması | FHWA GEC-7 (2015) |

## Doğrulama durumu (scripts/verify-design-tools.ts)

- Taşıma gücü faktörleri (Terzaghi, Meyerhof, Hansen, Vesic) — ders kitabı tablolarıyla ±%0.5 içinde.
- EC7 Ek D taşıma gücü — el hesabı 750 kPa, birebir.
- Şev: ACADS EX1(a) (2:1, H = 10 m, c′ = 3 kPa, φ′ = 19.6°) → Bishop FS = 0.987 (referans ≈ 0.99–1.00).
- Kazık, DMM, taş kolon, PVD, DC, zemin çivisi, CPT, V_s,30, D_r — el hesabı kıyasları.
- 13 taslağın tamamı varsayılan girdilerle hatasız çalışıyor.

## Aktivasyon kontrol listesi (araç başına)

1. `node scripts/run-ts.mjs scripts/verify-design-tools.ts` → "All checks passed".
2. Aracın varsayılan girdilerini gözden geçir (ör. zemin çivisi varsayılanı bilerek FS < 1.5 gösteriyor; vitrin için L = 8–9 m daha uygun olabilir).
3. Bağımsız kontrol: en az bir örneği ticari yazılım (Slide/GeoStudio, PLAXIS, GROUP/APILE, SNAP-2) veya el hesabıyla karşılaştır.
4. `data/tools-drafts.ts` içinde `status: "draft"` → `"active"`.
5. (İsteğe bağlı) Rapor şablonu: `lib/tool-report-templates.ts`, denklem açıklamaları: `lib/tool-equation-descriptions.ts` / `lib/tool-equation-parameters.ts`.
6. (İsteğe bağlı) Kazık ve şev için özel UI: tabaka tablosu + kesit/kayma dairesi çizimi (motorlar `computePileAxialCapacity` ve `searchCriticalCircle` doğrudan kullanılabilir).
7. `npm run build`.

## Konuşulacak açık noktalar

- **Üyelik kademesi:** Tasarım araçları (kazık, şev, DMM, zemin çivisi) Silver/Gold'a mı açılsın, yoksa ilk etapta herkese mi?
- **Yayın sırası önerisi:** (1) Kazık + Şev, (2) DMM + PVD + Taş kolon, (3) Zemin çivisi + DC, (4) Saha karakterizasyonu araçları.
- **Proje entegrasyonu:** Kazık aracının tabakaları "Projects & Boreholes" verisinden (c_u, φ′, N60) otomatik doldurulabilir; mevcut profil sekmesi altyapısı bunu destekliyor.
- **Sonraki aday araçlar:** yanal yüklü kazık (Broms / p-y), kazık grubu oturması (eşdeğer radye), konsol istinat duvarı stabilitesi, MSE duvar (FHWA GEC-11), Newmark kayma deplasmanı, CPT tabanlı sıvılaşma (B&I 2014).

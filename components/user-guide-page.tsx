"use client";

import { useEffect, useRef, useState } from "react";

import { downloadElementAsPdf } from "@/lib/download-user-guide-pdf";
import { MAX_BOREHOLES_PER_PROJECT, MAX_PROJECTS_PER_USER } from "@/lib/project-limits";

export function UserGuidePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<"tr" | "en" | "de" | "es">("en");
  const nonTrLang: "en" | "de" | "es" = lang === "de" || lang === "es" ? lang : "en";
  const t = (en: string, de: string, es: string) => (nonTrLang === "de" ? de : nonTrLang === "es" ? es : en);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("gih:userGuideLang");
    if (stored === "en" || stored === "tr" || stored === "de" || stored === "es") {
      setLang(stored);
    } else {
      setLang("en");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("gih:userGuideLang", lang);
  }, [lang]);

  const handlePdf = async () => {
    if (!rootRef.current) {
      return;
    }
    setBusy(true);
    try {
      await downloadElementAsPdf(
        rootRef.current,
        `Geotechnical-Insights-Hub-User-Guide-${lang}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
    } catch (e) {
      console.error(e);
      window.alert(
        lang === "tr"
          ? "PDF oluşturulamadı. Tarayıcıda Ctrl+P → PDF olarak kaydet seçeneğini kullanın."
          : "PDF could not be created. Use your browser Print (Ctrl+P) → Save as PDF.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="min-w-0 space-y-2">
        </div>
      </div>

      <div
        ref={rootRef}
        id="user-guide-print-root"
        data-pdf-safe-colors="1"
        className="space-y-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:shadow-none"
      >
        <header className="relative border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Geotechnical Insights Hub</p>
          <div className="mt-2">
            <div className="absolute right-0 top-0 -translate-y-1 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:hidden">
              <button
                type="button"
                onClick={() => setLang("tr")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  lang === "tr" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  lang === "en" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("de")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  lang === "de" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => setLang("es")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  lang === "es" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                ES
              </button>
            </div>

            <h1 className="pr-28 text-3xl font-semibold tracking-tight text-slate-900">
              {lang === "tr" ? "Kullanım Kılavuzu" : t("User Guide", "Benutzerhandbuch", "Guía del usuario")}
            </h1>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {lang === "tr" ? (
              <>
                Bu doküman, sitedeki araçların (tools) nasıl kullanılacağını ve ilgili bölümlerin nerede bulunacağını
                özetler. Hesap/Proje/Borehole yönetimi, araçlarda proje verisi kullanımı, sonuçları kaydetme, grafikler ve
                rapor alma akışı adım adım gösterilmiştir.
              </>
            ) : (
              <>
                {t(
                  "This guide explains how to use the tools on the site and where to find key sections. It walks through the typical workflow: account/project/borehole management, using project data in tools, saving results, viewing plots, and exporting reports.",
                  "Dieses Handbuch erklärt, wie Sie die Tools der Website nutzen und wichtige Bereiche finden. Es führt durch den typischen Ablauf: Konto-/Projekt-/Borehole-Verwaltung, Nutzung von Projektdaten in Tools, Speichern von Ergebnissen, Anzeigen von Plots sowie Export von Berichten.",
                  "Esta guía explica cómo usar las herramientas del sitio y dónde encontrar las secciones clave. Recorre el flujo típico: gestión de cuenta/proyecto/perforación, uso de datos del proyecto en las herramientas, guardar resultados, ver gráficos y exportar informes.",
                )}
              </>
            )}
          </p>
        </header>

        {lang === "tr" ? (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">1. Giriş ve Hesap</h2>
              <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
                <li>
                  <strong>Yol:</strong> Header → Signup / Login
                </li>
                <li>
                  <strong>Kayıt / Giriş:</strong> Menüdeki <strong>Account</strong> bölümünden üye olabilir veya üye
                  girişi yapabilirsiniz.
                </li>
                <li>
                  <strong>Üyelik ile:</strong> Proje oluşturduğunuzda <strong>borehole</strong> ekleyebilir, bu borehole’ları
                  tool’larda kullanabilir, tool sonuçlarını projeye kaydedebilir,{" "}
                  <strong>Integrated parameter matrix</strong> oluşturabilir ve çıktı alabilirsiniz.
                </li>
                <li>
                  <strong>Üye olmadan:</strong> Tool’lar yine kullanılabilir; manuel olarak borehole ve sample ekleyerek
                  hesaplamaları çalıştırabilirsiniz.
                </li>
              </ul>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("1. Account and sign-in", "1. Konto und Anmeldung", "1. Cuenta e inicio de sesión")}
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
                <li>
                  <strong>{t("Path:", "Pfad:", "Ruta:")}</strong> Header → Signup / Login
                </li>
                <li>
                  <strong>{t("Sign up / Sign in:", "Registrieren / Anmelden:", "Registrarse / Iniciar sesión:")}</strong>{" "}
                  {t("Use the header links or", "Nutzen Sie die Links im Header oder", "Use los enlaces del encabezado o")}{" "}
                  <code className="rounded bg-slate-100 px-1">/signup</code>,{" "}
                  <code className="rounded bg-slate-100 px-1">/login</code>.
                </li>
                <li>
                  <strong>{t("What requires an account:", "Was ein Konto erfordert:", "Qué requiere una cuenta:")}</strong>{" "}
                  {t(
                    "Tools and blog pages can be browsed without an account, but",
                    "Tools und Blogseiten können ohne Konto angesehen werden, aber",
                    "Las herramientas y el blog se pueden ver sin cuenta, pero",
                  )}{" "}
                  <strong>
                    {t(
                      "projects, boreholes, and saved analyses",
                      "Projekte, Boreholes und gespeicherte Analysen",
                      "proyectos, perforaciones y análisis guardados",
                    )}
                  </strong>{" "}
                  {t(
                    "require a configured user account.",
                    "erfordern ein eingerichtetes Benutzerkonto.",
                    "requieren una cuenta de usuario configurada.",
                  )}
                </li>
              </ul>
            </section>
          </>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "2. Account: Proje Oluşturma"
              : t("2. Account: creating a project", "2. Konto: Projekt erstellen", "2. Cuenta: crear un proyecto")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Yol:</strong> <code className="rounded bg-slate-100 px-1">/account</code> →{" "}
                <strong>Projects</strong>. Yeni proje adı yazıp <strong>Create Project</strong> ile ekleyin. Sayaçta{" "}
                <strong>{MAX_PROJECTS_PER_USER} projeye</strong> ulaşınca yeni proje oluşturma devre dışı kalır.
              </>
            ) : (
              <>
                <strong>{t("Path:", "Pfad:", "Ruta:")}</strong>{" "}
                <code className="rounded bg-slate-100 px-1">/account</code> → <strong>Projects</strong>.{" "}
                {t(
                  "Enter a project name and click Create Project.",
                  "Geben Sie einen Projektnamen ein und klicken Sie auf Create Project.",
                  "Introduzca un nombre de proyecto y haga clic en Create Project.",
                )}{" "}
                {t(
                  "When you reach",
                  "Sobald Sie",
                  "Cuando alcance",
                )}{" "}
                <strong>{MAX_PROJECTS_PER_USER} {t("projects", "Projekte", "proyectos")}</strong>,{" "}
                {t(
                  "creating new projects is disabled.",
                  "wird das Erstellen neuer Projekte deaktiviert.",
                  "se desactivará la creación de nuevos proyectos.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/account-projects-topbar.png"
              alt={
                lang === "tr"
                  ? "Account — Projects ekran görüntüsü"
                  : t("Account — Projects screenshot", "Account — Projects Screenshot", "Captura de Account — Projects")
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Örnek: Account/Projects ekranı. Bu bölümde proje seçebilir, düzenleyebilir, yeni proje oluşturabilir veya projeyi kaldırabilirsiniz."
                : t(
                    "Example: Account/Projects screen with a project selected. Here you can select, edit, and create projects.",
                    "Beispiel: Account/Projects‑Ansicht mit ausgewähltem Projekt. Hier können Sie Projekte auswählen, bearbeiten und erstellen.",
                    "Ejemplo: pantalla Account/Projects con un proyecto seleccionado. Aquí puede seleccionar, editar y crear proyectos.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "3. Sondaj Örneği (Borehole Sample) Ekleme"
              : t("3. Adding a borehole sample", "3. Borehole‑Probe hinzufügen", "3. Añadir una muestra de perforación")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Projeyi seçtikten sonra sağ panelde <strong>Add borehole sample</strong> formu görünür.{" "}
                <strong>New Borehole ID</strong> yeni bir sondaj adı tanımlar; <strong>Existing Borehole ID</strong> aynı
                sondaja farklı derinlikte ek örnek ekler. Örnek derinliği, GWT, birim hacim ağırlığı, zemin davranışı ve
                N değerleri burada tutulur. Projede <strong>{MAX_BOREHOLES_PER_PROJECT} farklı</strong> sondaj ID sınırına
                ulaşıldığında yalnızca mevcut ID’lere örnek ekleyebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "After selecting a project, the right panel shows the Add borehole sample form.",
                  "Nach der Projektauswahl zeigt das rechte Panel das Formular Add borehole sample.",
                  "Tras seleccionar un proyecto, el panel derecho muestra el formulario Add borehole sample.",
                )}{" "}
                <strong>New Borehole ID</strong>{" "}
                {t(
                  "creates a new borehole name;",
                  "erstellt eine neue Borehole‑Bezeichnung;",
                  "crea un nuevo identificador de perforación;",
                )}{" "}
                <strong>Existing Borehole ID</strong>{" "}
                {t(
                  "adds another sample depth under the same borehole.",
                  "fügt eine weitere Probentiefe unter demselben Borehole hinzu.",
                  "añade otra profundidad de muestra bajo la misma perforación.",
                )}{" "}
                {t(
                  "Sample depth, GWT, unit weight, soil behaviour and N values are stored here.",
                  "Probentiefe, GWT, Wichte, Bodenverhalten und N‑Werte werden hier gespeichert.",
                  "Aquí se guardan la profundidad de muestra, GWT, peso unitario, comportamiento del suelo y valores N.",
                )}{" "}
                {t(
                  "Once you reach",
                  "Sobald Sie",
                  "Una vez que alcance",
                )}{" "}
                <strong>
                  {MAX_BOREHOLES_PER_PROJECT} {t("distinct", "verschiedene", "distintos")}
                </strong>{" "}
                {t(
                  "borehole IDs per project, you can only add samples to existing IDs.",
                  "Borehole‑IDs pro Projekt erreichen, können Sie nur noch Proben zu bestehenden IDs hinzufügen.",
                  "IDs de perforación por proyecto, solo podrá añadir muestras a IDs existentes.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/add-borehole-sample.png"
              alt={
                lang === "tr"
                  ? "Add borehole sample formu ekran görüntüsü"
                  : t(
                      "Add borehole sample form screenshot",
                      "Screenshot: Add borehole sample‑Formular",
                      "Captura: formulario Add borehole sample",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Yol: Account - Projects - Add borehole sample • Add borehole sample formu: New/Existing Borehole ID seçimiyle yeni sondaj tanımlayabilir veya mevcut sondaja yeni derinlik ekleyebilirsiniz."
                : t(
                    "Path: Account → Projects → Add borehole sample. Switch between New/Existing Borehole ID to create a new borehole or add another sample depth under an existing one.",
                    "Pfad: Account → Projects → Add borehole sample. Wechseln Sie zwischen New/Existing Borehole ID, um ein neues Borehole anzulegen oder eine weitere Probentiefe zu einem bestehenden hinzuzufügen.",
                    "Ruta: Account → Projects → Add borehole sample. Cambie entre New/Existing Borehole ID para crear una nueva perforación o añadir otra profundidad de muestra a una existente.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "4. Tools Sayfasında Proje / Sondaj Seçimi"
              : t(
                  "4. Selecting project / boreholes in Tools",
                  "4. Projekt / Boreholes in Tools auswählen",
                  "4. Seleccionar proyecto / perforaciones en Tools",
                )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Yol:</strong> <code className="rounded bg-slate-100 px-1">/tools</code> →{" "}
                <strong>Projects and Boreholes</strong>. Araç sayfalarının üst kısmında bu menü bulunur. Giriş yaptıysanız
                projeleriniz listelenir; proje ve bir veya daha fazla sondaj seçerek verileri profile sekmeli araçlara
                aktarabilirsiniz.
              </>
            ) : (
              <>
                <strong>{t("Path:", "Pfad:", "Ruta:")}</strong>{" "}
                <code className="rounded bg-slate-100 px-1">/tools</code> → <strong>Projects and Boreholes</strong>.{" "}
                {t(
                  "This menu appears in the header of tool pages.",
                  "Dieses Menü erscheint im Header der Tool‑Seiten.",
                  "Este menú aparece en el encabezado de las páginas de herramientas.",
                )}{" "}
                {t(
                  "If you are signed in, your projects will be listed; select a project and one or more boreholes to feed data into profile-based tools.",
                  "Wenn Sie angemeldet sind, werden Ihre Projekte angezeigt; wählen Sie ein Projekt und ein oder mehrere Boreholes, um Daten in profilbasierte Tools zu übernehmen.",
                  "Si ha iniciado sesión, se mostrarán sus proyectos; seleccione un proyecto y una o varias perforaciones para cargar datos en herramientas basadas en perfiles.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 bg-white p-3 md:grid-cols-2">
              <img
                src="/images/guide/tools-projects-boreholes-use-in-tools.png"
                alt={
                  lang === "tr"
                    ? "Projects and Boreholes menüsü (Use in Tools)"
                    : t(
                        "Projects and Boreholes menu (Use in Tools)",
                        "Menü Projects and Boreholes (Use in Tools)",
                        "Menú Projects and Boreholes (Use in Tools)",
                      )
                }
                className="block max-h-[420px] w-full rounded-lg border border-slate-200 object-contain"
              />
              <img
                src="/images/guide/tools-clear-selection.png"
                alt={
                  lang === "tr"
                    ? "Projects and Boreholes menüsü (Clear)"
                    : t("Projects and Boreholes menu (Clear)", "Menü Projects and Boreholes (Clear)", "Menú Projects and Boreholes (Clear)")
                }
                className="block max-h-[420px] w-full rounded-lg border border-slate-200 object-contain"
              />
            </div>
            <figcaption className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p>
                {lang === "tr" ? (
                  <>
                    <strong>Use in Tools</strong> tıklandığında seçtiğiniz borehole’lar aktif olur ve tool sayfalarında
                    profile satırlarına otomatik aktarılır.
                  </>
                ) : (
                  <>
                    {t(
                      "Clicking Use in Tools activates the selected boreholes and auto-populates profile rows on tool pages.",
                      "Ein Klick auf Use in Tools aktiviert die ausgewählten Boreholes und füllt Profilzeilen in den Tools automatisch aus.",
                      "Al hacer clic en Use in Tools se activan las perforaciones seleccionadas y se rellenan automáticamente las filas del perfil en las herramientas.",
                    )}
                  </>
                )}
              </p>
              <p>
                {lang === "tr" ? (
                  <>
                    Eğer manuel giriş yapmak istiyorsanız <strong>Clear</strong> ile aktif borehole seçimini temizleyin.
                    Ardından tool içinde satır bazında borehole ekleyip seçebilirsiniz.
                  </>
                ) : (
                  <>
                    {t(
                      "If you want to enter data manually, click Clear to remove the active borehole selection. Then you can add/select boreholes per row inside the tool.",
                      "Wenn Sie Daten manuell eingeben möchten, klicken Sie auf Clear, um die aktive Borehole‑Auswahl zu entfernen. Anschließend können Sie Boreholes pro Zeile im Tool hinzufügen/auswählen.",
                      "Si quiere introducir datos manualmente, haga clic en Clear para quitar la selección activa de perforaciones. Después podrá añadir/seleccionar perforaciones por fila dentro de la herramienta.",
                    )}
                  </>
                )}
              </p>
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "5. Borehole Kullanmadan Araç Kullanımı"
              : t("5. Using tools without boreholes", "5. Tools ohne Boreholes nutzen", "5. Usar herramientas sin perforaciones")}
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <li>
                  <strong>Yol:</strong> Tools → Any tool (manual)
                </li>
                <li>
                  <strong>Giriş yapmadan veya proje seçmeden</strong> araçtaki sayısal alanları doğrudan elle doldurun;
                  sonuçlar yine hesaplanır.
                </li>
                <li>
                  Profile araçlarında satırlar elle girilir; üst menüden proje seçilmediyse veriler proje ile eşlenmez ve
                  otomatik içe aktarım yapılmaz.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>{t("Path:", "Pfad:", "Ruta:")}</strong> Tools → {t("Any tool (manual)", "Beliebiges Tool (manuell)", "Cualquier herramienta (manual)")}
                </li>
                <li>
                  <strong>
                    {t(
                      "Without signing in or selecting a project",
                      "Ohne Anmeldung oder Projektauswahl",
                      "Sin iniciar sesión ni seleccionar un proyecto",
                    )}
                  </strong>
                  ,{" "}
                  {t(
                    "fill numeric inputs manually; results will still be calculated.",
                    "füllen Sie die numerischen Eingaben manuell aus; Ergebnisse werden dennoch berechnet.",
                    "rellene manualmente los campos numéricos; aun así se calcularán los resultados.",
                  )}
                </li>
                <li>
                  {t(
                    "In profile tools, rows can be entered manually. If no project is selected in the header, data is not linked to a project and no auto-import occurs.",
                    "In Profil‑Tools können Zeilen manuell eingegeben werden. Wenn im Header kein Projekt ausgewählt ist, werden die Daten nicht mit einem Projekt verknüpft und es erfolgt kein Auto‑Import.",
                    "En las herramientas de perfil, las filas se pueden introducir manualmente. Si no se selecciona un proyecto en el encabezado, los datos no se vinculan a un proyecto y no hay importación automática.",
                  )}
                </li>
              </>
            )}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "6. Proje Verisiyle Araç Kullanımı"
              : t("6. Using tools with project data", "6. Tools mit Projektdaten nutzen", "6. Usar herramientas con datos del proyecto")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Üst menüden proje ve sondaj seçin. Profile araçlarında satırlara <strong>borehole ID</strong> ve{" "}
                <strong>sample depth</strong> proje listesiyle eşleşir. Projects altında tanımlı zemin davranışı, bazı
                araçlarda satırın kullanılıp kullanılmayacağını etkileyebilir (kısıtlı satırlar gri görünebilir).
              </>
            ) : (
              <>
                {t(
                  "Select a project and boreholes from the header.",
                  "Wählen Sie im Header ein Projekt und Boreholes aus.",
                  "Seleccione un proyecto y perforaciones desde el encabezado.",
                )}{" "}
                {t(
                  "In profile tools, each row can be matched to your project data via borehole ID and sample depth.",
                  "In Profil‑Tools kann jede Zeile über Borehole‑ID und Probentiefe mit Ihren Projektdaten abgeglichen werden.",
                  "En las herramientas de perfil, cada fila puede vincularse a los datos del proyecto mediante Borehole ID y profundidad de muestra.",
                )}{" "}
                {t(
                  "Soil behaviour stored under Projects may affect whether a row is eligible in some tools (restricted rows may appear disabled).",
                  "Das unter Projects gespeicherte Bodenverhalten kann beeinflussen, ob eine Zeile in einigen Tools zulässig ist (eingeschränkte Zeilen können deaktiviert erscheinen).",
                  "El comportamiento del suelo guardado en Projects puede afectar si una fila es apta en algunas herramientas (las filas restringidas pueden aparecer deshabilitadas).",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/tools-received-boreholes-example.png"
              alt={
                lang === "tr"
                  ? "Tool içinde borehole verilerinin geldiği örnek"
                  : t(
                      "Example of borehole data inside a tool",
                      "Beispiel: Borehole‑Daten in einem Tool",
                      "Ejemplo de datos de perforación dentro de una herramienta",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Örnek: <strong>Use in Tools</strong> sonrası profile tablosunda borehole satırları görünür. Eğer header’dan
                  borehole seçilmediyse, bazı tool’larda borehole seçimi <strong>satır içinde</strong> de yapılabilir.
                </>
              ) : (
                <>
                  {t(
                    "Example: after Use in Tools, borehole rows appear in the profile table. If no boreholes are selected in the header, some tools still allow borehole selection per row.",
                    "Beispiel: Nach Use in Tools erscheinen Borehole‑Zeilen in der Profiltabelle. Wenn im Header keine Boreholes ausgewählt sind, erlauben einige Tools dennoch eine Borehole‑Auswahl pro Zeile.",
                    "Ejemplo: después de Use in Tools, aparecen filas de perforación en la tabla de perfil. Si no se seleccionan perforaciones en el encabezado, algunas herramientas permiten seleccionar perforación por fila.",
                  )}
                </>
              )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/tools-manual-add-bh.png"
              alt={
                lang === "tr"
                  ? "Tool içinde manuel borehole ekleme"
                  : t(
                      "Manual borehole add inside a tool",
                      "Manuelles Hinzufügen eines Boreholes im Tool",
                      "Añadir manualmente una perforación dentro de una herramienta",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Borehole seçimi temizlendikten sonra, profile satırında <strong>Add BH</strong> ile borehole kimliği
                  oluşturup manuel olarak ilerleyebilirsiniz.
                </>
              ) : (
                <>
                  {t(
                    "After clearing the selection, you can proceed manually by creating/selecting a borehole via Add BH within the profile row.",
                    "Nach dem Löschen der Auswahl können Sie manuell fortfahren, indem Sie im Profil‑Row über Add BH ein Borehole erstellen/auswählen.",
                    "Después de limpiar la selección, puede continuar manualmente creando/seleccionando una perforación mediante Add BH dentro de la fila del perfil.",
                  )}
                </>
              )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "7. Sekmeler: Parameters, Soil Profile Plot, Information, Report"
              : t(
                  "7. Tabs: Parameters, Soil Profile Plot, Information, Report",
                  "7. Tabs: Parameters, Soil Profile Plot, Information, Report",
                  "7. Pestañas: Parameters, Soil Profile Plot, Information, Report",
                )}
          </h2>
          <div className="space-y-3 text-[15px] leading-7 text-slate-700">
            <p>
              {lang === "tr" ? (
                <>
                  Tool sayfalarında sekmeler, aynı hesap akışını farklı amaçlarla sunar: hızlı hesap, derinlik‑profil
                  görselleştirme, raporlama ve yöntem/formül dokümantasyonu.
                </>
              ) : (
                <>
                  {t(
                    "Tabs present the same workflow for different goals: quick calculation, depth-profile visualisation, reporting, and methodology/formula documentation.",
                    "Tabs stellen denselben Workflow für unterschiedliche Ziele bereit: schnelle Berechnung, Tiefenprofil‑Visualisierung, Berichtserstellung sowie Methodik/Formel‑Dokumentation.",
                    "Las pestañas presentan el mismo flujo para distintos objetivos: cálculo rápido, visualización por perfil de profundidad, generación de informes y documentación de metodología/fórmulas.",
                  )}
                </>
              )}
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Calculation / Parameters:</strong>{" "}
                {lang === "tr" ? (
                  <>
                    Hesap makinesi mantığıyla çalışır; kullanıcı belirli girdiler (ör. PI, N<sub>60</sub>) girer ve tool
                    bu spesifik değerlere göre sonucu üretir.
                  </>
                ) : (
                  <>
                    {t(
                      "Works like a calculator: you enter specific inputs (e.g., PI, N60) and the tool computes results for those values.",
                      "Funktioniert wie ein Rechner: Sie geben konkrete Eingaben (z. B. PI, N60) ein, und das Tool berechnet Ergebnisse für genau diese Werte.",
                      "Funciona como una calculadora: introduce entradas específicas (p. ej., PI, N60) y la herramienta calcula resultados para esos valores.",
                    )}
                  </>
                )}
              </li>
              <li>
                <strong>Soil Profile Plot:</strong>{" "}
                {lang === "tr" ? (
                  <>
                    Tablo ve grafikler ile parametrelerin derinliğe göre değişimini gösterir. Proje/borehole seçimi aktifse
                    seçili borehole’lardan gelen satırlar otomatik doldurulabilir.
                  </>
                ) : (
                  <>
                    {t(
                      "Shows how parameters vary with depth using tables and plots. If project/borehole selection is active, rows can be auto-populated from the selected boreholes.",
                      "Zeigt mit Tabellen und Plots, wie Parameter mit der Tiefe variieren. Wenn Projekt/Borehole‑Auswahl aktiv ist, können Zeilen aus den ausgewählten Boreholes automatisch befüllt werden.",
                      "Muestra cómo varían los parámetros con la profundidad mediante tablas y gráficos. Si la selección de proyecto/perforación está activa, las filas pueden rellenarse automáticamente desde las perforaciones seleccionadas.",
                    )}
                  </>
                )}
              </li>
              <li>
                <strong>Report:</strong>{" "}
                {lang === "tr" ? (
                  <>
                    Hesap çıktısını ve profile plot’u içeren PDF raporu üretir. Kullanıcı bu sekmeden, tool hesaplarını
                    içeren raporu indirebilir.
                  </>
                ) : (
                  <>
                    {t(
                      "Generates a PDF report that includes calculation output and the profile plot. Users can download a report containing the tool calculations from this section.",
                      "Erstellt einen PDF‑Bericht mit Rechenergebnissen und Profil‑Plot. Nutzer können hier einen Bericht mit den Tool‑Berechnungen herunterladen.",
                      "Genera un informe PDF que incluye los resultados del cálculo y el gráfico de perfil. Desde aquí los usuarios pueden descargar un informe con los cálculos de la herramienta.",
                    )}
                  </>
                )}
              </li>
              <li>
                <strong>Analyze with AI:</strong>{" "}
                {lang === "tr" ? (
                  <>
                    Aktifse, hesap çıktısı ve plot hakkında yorum içeren ek bir değerlendirme paragrafı ekler. Bu bölüm,
                    “tasarım kararı” yerine erken aşama teknik yorum ve kontrol amaçlıdır.
                  </>
                ) : (
                  <>
                    {t(
                      "When enabled, adds an extra evaluation paragraph that comments on the calculation output and plot. It is intended for early-stage technical interpretation, not a final design decision.",
                      "Wenn aktiviert, wird ein zusätzlicher Bewertungstext ergänzt, der Rechenergebnisse und Plot interpretiert. Gedacht für frühe technische Einschätzung – nicht als finale Auslegungsentscheidung.",
                      "Si está habilitado, añade un párrafo de evaluación adicional con comentarios sobre los resultados del cálculo y el gráfico. Está pensado para interpretación técnica en etapas tempranas, no como decisión final de diseño.",
                    )}
                  </>
                )}
              </li>
              <li>
                <strong>Information:</strong>{" "}
                {lang === "tr" ? (
                  <>
                    Tool içinde kullanılan tüm formülleri, varsayımları, sınırlamaları ve referansları içerir. Bir sonucu
                    yorumlarken hangi eşitliklerin ve kabullerin kullanıldığını buradan kontrol edebilirsiniz.
                  </>
                ) : (
                  <>
                    {t(
                      "Contains the full set of formulas, assumptions, limitations, and references used by the tool. Use it to verify which equations and modelling choices produced the result.",
                      "Enthält alle verwendeten Formeln, Annahmen, Einschränkungen und Referenzen. Damit können Sie prüfen, welche Gleichungen und Modellannahmen zu den Ergebnissen geführt haben.",
                      "Incluye todas las fórmulas, supuestos, limitaciones y referencias usadas por la herramienta. Úselo para verificar qué ecuaciones y decisiones de modelado generaron el resultado.",
                    )}
                  </>
                )}
              </li>
            </ul>
          </div>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/tool-tabs.png"
              alt={
                lang === "tr"
                  ? "Tool sekmeleri (tabs) ekran görüntüsü"
                  : t("Tool tabs screenshot", "Screenshot: Tool‑Tabs", "Captura: pestañas de la herramienta")
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Tool içinde sekmeler arasında geçiş yaparak hesaplama, profil grafikleri, rapor ve metodoloji bilgilerine ulaşabilirsiniz."
                : t(
                    "Use the tabs to switch between calculation, profile plots, report export, and methodology details.",
                    "Nutzen Sie die Tabs, um zwischen Berechnung, Profil‑Plots, Berichtsexport und Methodik‑Details zu wechseln.",
                    "Use las pestañas para cambiar entre cálculo, gráficos de perfil, exportación de informes y detalles de metodología.",
                  )}
            </figcaption>
          </figure>

          <div className="space-y-4">
            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/images/guide/tab-calculation-inputs.png"
                alt={
                  lang === "tr"
                    ? "Calculation/Parameters sekmesi: Input alanları"
                    : t(
                        "Calculation/Parameters tab: input fields",
                        "Tab Calculation/Parameters: Eingabefelder",
                        "Pestaña Calculation/Parameters: campos de entrada",
                      )
                }
                className="block h-auto w-full"
              />
              <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                {lang === "tr"
                  ? "Calculation/Parameters: Tool girdilerini girip hesaplamayı çalıştırdığınız bölüm."
                  : t(
                      "Calculation/Parameters: enter tool inputs and run the calculation.",
                      "Calculation/Parameters: Eingaben erfassen und Berechnung ausführen.",
                      "Calculation/Parameters: introduzca entradas y ejecute el cálculo.",
                    )}
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/images/guide/tab-report-download.png"
                alt={
                  lang === "tr"
                    ? "Report sekmesi: PDF indirme butonları"
                    : t(
                        "Report tab: PDF download buttons",
                        "Tab Report: PDF‑Download‑Buttons",
                        "Pestaña Report: botones de descarga PDF",
                      )
                }
                className="block h-auto w-full"
              />
              <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                {lang === "tr"
                  ? "Report: Hesap çıktıları ve plotları içeren PDF raporu indirdiğiniz bölüm."
                  : t(
                      "Report: download a PDF report that includes results and plots.",
                      "Report: PDF‑Bericht mit Ergebnissen und Plots herunterladen.",
                      "Report: descargue un informe PDF que incluye resultados y gráficos.",
                    )}
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src="/images/guide/tab-information-equations.png"
                alt={
                  lang === "tr"
                    ? "Information sekmesi: Eşitlikler ve tanımlar"
                    : t(
                        "Information tab: equations and definitions",
                        "Tab Information: Gleichungen und Definitionen",
                        "Pestaña Information: ecuaciones y definiciones",
                      )
                }
                className="block h-auto w-full"
              />
              <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                {lang === "tr"
                  ? "Information: Tool’da kullanılan formüller, varsayımlar, sınırlamalar ve referanslar."
                  : t(
                      "Information: formulas, assumptions, limitations, and references used by the tool.",
                      "Information: verwendete Formeln, Annahmen, Einschränkungen und Referenzen.",
                      "Information: fórmulas, supuestos, limitaciones y referencias usadas por la herramienta.",
                    )}
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "8. Plotlar (Grafikler) Nerede?"
              : t("8. Where are the plots?", "8. Wo sind die Plots?", "8. ¿Dónde están los gráficos?")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Derinlik–parametre grafikleri çoğunlukla <strong>Soil Profile Plot</strong> sekmesindedir. Bazı araçlar ek
                görselleri Parameters veya Information bölümünde de sunabilir.
                <br />
                <br />
                Her bir tool altında, zemin derinliğine bağlı <strong>parameter–depth</strong> plotları bulunur (seçilen
                borehole’lara göre).
              </>
            ) : (
              <>
                {t(
                  "Depth–parameter plots are typically under the Soil Profile Plot tab. Some tools may also show additional visuals in Parameters or Information.",
                  "Depth‑Parameter‑Plots befinden sich typischerweise im Tab Soil Profile Plot. Einige Tools zeigen zusätzliche Visualisierungen auch unter Parameters oder Information.",
                  "Los gráficos profundidad–parámetro suelen estar en la pestaña Soil Profile Plot. Algunas herramientas también pueden mostrar elementos visuales adicionales en Parameters o Information.",
                )}
                <br />
                <br />
                {t(
                  "Each tool includes parameter–depth plots based on soil depth (driven by the selected boreholes).",
                  "Jedes Tool enthält Parameter–Tiefe‑Plots auf Basis der Bodentiefe (gesteuert durch die ausgewählten Boreholes).",
                  "Cada herramienta incluye gráficos parámetro–profundidad según la profundidad del suelo (en función de las perforaciones seleccionadas).",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/depth-plot-example.png"
              alt={
                lang === "tr"
                  ? "Derinliğe bağlı parametre grafiği örneği"
                  : t(
                      "Example parameter–depth plot",
                      "Beispiel: Parameter–Tiefe‑Plot",
                      "Ejemplo de gráfico parámetro–profundidad",
                    )
              }
              className="block max-h-[520px] w-full object-contain"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Örnek: Depth vs (N1)60 gibi derinliğe bağlı parameter–depth plotları Soil Profile Plot sekmesinde listelenir."
                : t(
                    "Example: parameter–depth plots (e.g., Depth vs (N1)60) are listed under the Soil Profile Plot tab.",
                    "Beispiel: Parameter–Tiefe‑Plots (z. B. Depth vs (N1)60) werden unter dem Tab Soil Profile Plot angezeigt.",
                    "Ejemplo: los gráficos parámetro–profundidad (p. ej., Depth vs (N1)60) se listan en la pestaña Soil Profile Plot.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "9. Analizi Projeye Kaydetme"
              : t("9. Saving an analysis to a project", "9. Analyse in einem Projekt speichern", "9. Guardar un análisis en un proyecto")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Profile araçlarında <strong>Save Profile Analysis</strong> / <strong>Save Analysis to Project</strong>{" "}
                paneli vardır. Aktif proje ve oturum gerekir; kayıt girdi tabloları ve mümkünse grafik görüntülerini proje
                kaydına yazar.
              </>
            ) : (
              <>
                {t(
                  "Profile tools include a Save Profile Analysis / Save Analysis to Project panel.",
                  "Profil‑Tools enthalten ein Panel Save Profile Analysis / Save Analysis to Project.",
                  "Las herramientas de perfil incluyen un panel Save Profile Analysis / Save Analysis to Project.",
                )}{" "}
                {t(
                  "You must be signed in and have an active project; it saves input tables and, when available, plot images to the selected project.",
                  "Sie müssen angemeldet sein und ein aktives Projekt ausgewählt haben; es speichert Eingabetabellen und – falls verfügbar – Plot‑Bilder im ausgewählten Projekt.",
                  "Debe iniciar sesión y tener un proyecto activo; guarda las tablas de entrada y, cuando están disponibles, imágenes de los gráficos en el proyecto seleccionado.",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/save-analysis-to-project.png"
              alt={
                lang === "tr"
                  ? "Save Analysis to Project paneli"
                  : t(
                      "Save Analysis to Project panel",
                      "Panel: Save Analysis to Project",
                      "Panel: Save Analysis to Project",
                    )
              }
              className="block max-h-[420px] w-full object-contain"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Save Analysis to Project ile mevcut profile girdileri ve plot görüntüleri projeye kaydedilir."
                : t(
                    "Save Analysis to Project stores current profile inputs and plot images under the selected project.",
                    "Save Analysis to Project speichert die aktuellen Profileingaben und Plot‑Bilder im ausgewählten Projekt.",
                    "Save Analysis to Project guarda las entradas actuales del perfil y las imágenes de los gráficos en el proyecto seleccionado.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "10. Kayıtlı Sonuçları Görüntüleme"
              : t("10. Viewing saved analyses", "10. Gespeicherte Analysen anzeigen", "10. Ver análisis guardados")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <code className="rounded bg-slate-100 px-1">/account</code> → projeyi seçin →{" "}
                <strong>Saved analyses</strong> listesinden kayıtlı çalışmaları açın. Entegre örnek matrisi ve parametre
                görünümleri aynı proje ekranında bulunur.
              </>
            ) : (
              <>
                {t(
                  "Go to",
                  "Gehen Sie zu",
                  "Vaya a",
                )}{" "}
                <code className="rounded bg-slate-100 px-1">/account</code> →{" "}
                {t(
                  "select a project",
                  "wählen Sie ein Projekt aus",
                  "seleccione un proyecto",
                )}{" "}
                →{" "}
                {t(
                  "open items from",
                  "öffnen Sie Einträge aus",
                  "abra elementos de",
                )}{" "}
                <strong>Saved analyses</strong>.{" "}
                {t(
                  "The integrated sample matrix and parameter views are available on the project screen.",
                  "Die integrierte Probenmatrix und die Parameteransichten sind auf der Projektseite verfügbar.",
                  "La matriz integrada de muestras y las vistas de parámetros están disponibles en la pantalla del proyecto.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/saved-analyses.png"
              alt={
                lang === "tr"
                  ? "Saved analyses tablosu ekran görüntüsü"
                  : t(
                      "Saved analyses table screenshot",
                      "Screenshot: Tabelle Saved analyses",
                      "Captura: tabla Saved analyses",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Saved analyses: View ile plot önizlemesini görebilir, Load to Tool ile kaydı doğrudan ilgili tool’da açabilirsiniz."
                : t(
                    "Saved analyses: use View to see the plot preview, or Load to Tool to open the record directly in the related tool.",
                    "Saved analyses: Nutzen Sie View für die Plot‑Vorschau oder Load to Tool, um den Eintrag direkt im passenden Tool zu öffnen.",
                    "Saved analyses: use View para ver la vista previa del gráfico, o Load to Tool para abrir el registro directamente en la herramienta correspondiente.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "11. Rapor (PDF) ve Excel"
              : t("11. Report (PDF) and Excel exports", "11. Report (PDF) und Excel‑Exporte", "11. Informe (PDF) y exportaciones a Excel")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Tüm analizler sonucunda <strong>Save Analysis to Project</strong> seçerek analiz sonuçlarını{" "}
                <strong>Project → Integrated parameter matrix</strong> kısmında görebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "After running tools, use",
                  "Nach dem Ausführen der Tools verwenden Sie",
                  "Después de ejecutar las herramientas, use",
                )}{" "}
                <strong>Save Analysis to Project</strong>{" "}
                {t(
                  "to view your results under",
                  "um Ihre Ergebnisse unter",
                  "para ver sus resultados en",
                )}{" "}
                <strong>Project → Integrated parameter matrix</strong>.
              </>
            )}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <li>
                  <strong>Report</strong> sekmesi: <strong>Download PDF Report</strong> tablo ve grafiği içeren raporu
                  indirir. <strong>Analyze with AI</strong> yapılandırılmışsa ek değerlendirme üretir.
                </li>
                <li>
                  Profile sekmelerinde <strong>Export Excel</strong> (veya araça özel dışa aktarma) ile tablo/grafik Excel
                  uyumlu dosyaya alınabilir.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Report</strong>{" "}
                  {t("tab:", "Tab:", "pestaña:")} <strong>Download PDF Report</strong>{" "}
                  {t(
                    "downloads a report containing tables and plots.",
                    "lädt einen Bericht mit Tabellen und Plots herunter.",
                    "descarga un informe que contiene tablas y gráficos.",
                  )}{" "}
                  {t(
                    "If Analyze with AI is enabled, it adds extra evaluation content.",
                    "Wenn Analyze with AI aktiviert ist, wird zusätzlicher Bewertungstext hinzugefügt.",
                    "Si Analyze with AI está habilitado, añade contenido adicional de evaluación.",
                  )}
                </li>
                <li>
                  {t(
                    "In profile tabs, use",
                    "In Profil‑Tabs verwenden Sie",
                    "En las pestañas de perfil, use",
                  )}{" "}
                  <strong>Export Excel</strong>{" "}
                  {t(
                    "(or tool-specific exports) to export tables/plots to an Excel-compatible file.",
                    "(oder tool‑spezifische Exporte), um Tabellen/Plots in eine Excel‑kompatible Datei zu exportieren.",
                    "(o exportaciones específicas de la herramienta) para exportar tablas/gráficos a un archivo compatible con Excel.",
                  )}
                </li>
              </>
            )}
          </ul>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/integrated-parameter-matrix.png"
              alt={
                lang === "tr"
                  ? "Integrated parameter matrix ekran görüntüsü"
                  : t(
                      "Integrated parameter matrix screenshot",
                      "Screenshot: Integrated parameter matrix",
                      "Captura: Integrated parameter matrix",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Integrated parameter matrix: Kaydettiğiniz analizlerden gelen parametreler burada tek tabloda birleştirilir."
                : t(
                    "Integrated parameter matrix: Parameters from saved analyses are merged into a single table here.",
                    "Integrated parameter matrix: Parameter aus gespeicherten Analysen werden hier in einer einzigen Tabelle zusammengeführt.",
                    "Integrated parameter matrix: Los parámetros de los análisis guardados se combinan aquí en una sola tabla.",
                  )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/parameter-header-links.png"
              alt={
                lang === "tr"
                  ? "Parametre başlıklarında tool linkleri"
                  : t(
                      "Tool links on parameter headers",
                      "Tool‑Links in Parameter‑Headern",
                      "Enlaces a herramientas en los encabezados de parámetros",
                    )
              }
              className="block h-auto w-full"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Integrated parameter matrix başlıklarında ilgili tool’lara hızlı geçiş linkleri bulunur (↗)."
                : t(
                    "Integrated parameter matrix headers include quick links (↗) to relevant tools.",
                    "Die Header der Integrated parameter matrix enthalten Quick‑Links (↗) zu den relevanten Tools.",
                    "Los encabezados de Integrated parameter matrix incluyen enlaces rápidos (↗) a las herramientas relevantes.",
                  )}
            </figcaption>
          </figure>
        </section>

      </div>

      <div className="flex justify-end print:hidden">
        <button type="button" className="btn-base btn-md" onClick={() => void handlePdf()} disabled={busy}>
          {busy
            ? lang === "tr"
              ? "PDF hazırlanıyor..."
              : t("Preparing PDF...", "PDF wird vorbereitet...", "Preparando PDF...")
            : lang === "tr"
              ? "PDF indir"
              : t("Download PDF", "PDF herunterladen", "Descargar PDF")}
        </button>
      </div>
    </div>
  );
}

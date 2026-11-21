"use client";

import { Fragment, useEffect, useState, type ReactNode } from "react";

import {
  BRONZE_MAX_BOREHOLES_PER_PROJECT,
  BRONZE_MAX_PROJECTS,
  BRONZE_MAX_SAMPLES_PER_BOREHOLE,
} from "@/lib/subscription";

type Lang = "tr" | "en" | "de" | "es";
const LANGS: Lang[] = ["tr", "en", "de", "es"];
const DEFAULT_USER_GUIDE_LANG: Lang = "en";
const IMG = "/images/guide";

/* ───────────────────────────── building blocks ───────────────────────────── */

/**
 * Light inline markup for the guide copy: **bold**, `on-screen control name`.
 * Keeps the four translations as plain strings.
 */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <span key={i} className="whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-1.5 py-px font-sans text-[0.92em] font-medium text-slate-800">
              {part.slice(1, -1)}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

function P({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-7 text-slate-700">
      <Rich text={text} />
    </p>
  );
}

function Shot({ src, alt, caption, size = "lg" }: { src: string; alt: string; caption: string; size?: "sm" | "md" | "lg" }) {
  const width = size === "sm" ? "max-w-2xl" : size === "md" ? "max-w-3xl" : "max-w-none";
  return (
    <figure className={`mx-auto w-full ${width} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid`}>
      <div className="bg-gradient-to-b from-slate-50 to-white p-2 sm:p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- static guide screenshots, sized by the frame */}
        <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="mx-auto block h-auto w-full rounded-lg" />
      </div>
      <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] leading-5 text-slate-600">
        <Rich text={caption} />
      </figcaption>
    </figure>
  );
}

function ShotPair({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

const CALLOUT_TONE = {
  tip: { box: "border-teal-200 bg-teal-50/70", label: "text-teal-800" },
  note: { box: "border-amber-200 bg-amber-50/80", label: "text-amber-800" },
  gold: { box: "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50", label: "text-amber-700" },
} as const;

function Callout({ tone, label, text }: { tone: keyof typeof CALLOUT_TONE; label: string; text: string }) {
  const t = CALLOUT_TONE[tone];
  return (
    <div className={`rounded-xl border px-4 py-3 text-[15px] leading-7 text-slate-800 print:break-inside-avoid ${t.box}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${t.label}`}>{label}</p>
      <p className="mt-0.5">
        <Rich text={text} />
      </p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-7 text-slate-700">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
          <span>
            <Rich text={item} />
          </span>
        </li>
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-slate-700 marker:text-slate-400">
      {items.map((item, i) => (
        <li key={i}>
          <Rich text={item} />
        </li>
      ))}
    </ul>
  );
}

function Section({ n, id, title, lead, children }: { n: number; id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-5 border-t border-slate-200 pt-10 first:border-t-0 first:pt-0">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{String(n).padStart(2, "0")}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
        {lead ? (
          <p className="text-[15px] leading-7 text-slate-600">
            <Rich text={lead} />
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-lg font-semibold text-slate-900">{children}</h3>;
}

/* ───────────────────────────── page ───────────────────────────── */

export function UserGuidePage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return DEFAULT_USER_GUIDE_LANG;
    const stored = window.localStorage.getItem("gih:userGuideLang");
    return LANGS.includes(stored as Lang) ? (stored as Lang) : DEFAULT_USER_GUIDE_LANG;
  });
  /** Turkish · English · German · Spanish. */
  const L = (tr: string, en: string, de: string, es: string) => ({ tr, en, de, es })[lang];

  useEffect(() => {
    try {
      window.localStorage.setItem("gih:userGuideLang", lang);
    } catch {
      /* private mode: language just is not remembered */
    }
  }, [lang]);

  const sections = [
    { id: "guide-start", title: L("Başlarken", "Getting started", "Erste Schritte", "Primeros pasos") },
    { id: "guide-account", title: L("Hesap ve üyelik", "Account and membership", "Konto und Mitgliedschaft", "Cuenta y membresía") },
    { id: "guide-catalogue", title: L("Araç kataloğu", "The tools catalogue", "Der Tool‑Katalog", "El catálogo de herramientas") },
    { id: "guide-tool", title: L("Bir aracın arayüzü", "Inside a tool", "Aufbau eines Tools", "Dentro de una herramienta") },
    { id: "guide-projects", title: L("Projeler", "Projects", "Projekte", "Proyectos") },
    { id: "guide-boreholes", title: L("Sondajlar ve Use in Tools", "Boreholes and Use in Tools", "Bohrungen und Use in Tools", "Sondeos y Use in Tools") },
    { id: "guide-save", title: L("Analiz kaydetme ve yeniden kullanma", "Saving and reusing analyses", "Analysen speichern und wiederverwenden", "Guardar y reutilizar análisis") },
    { id: "guide-reports", title: L("Raporlar ve yapay zekâ", "Reports and AI", "Berichte und KI", "Informes e IA") },
    { id: "guide-matrix", title: L("Parametre matrisi", "Parameter matrix", "Parameter‑Matrix", "Matriz de parámetros") },
    { id: "guide-faq", title: L("Sıkça sorulan sorular", "Frequently asked questions", "Häufige Fragen", "Preguntas frecuentes") },
  ];
  const sec = (i: number) => ({ n: i + 1, id: sections[i].id, title: sections[i].title });

  const yes = "✓";
  const no = "—";
  const tierRows: Array<{ label: string; cells: [string, string, string, string] }> = [
    {
      label: L("Girdi girme ve Calculate ile ana sonuç", "Enter inputs, Calculate and see the headline result", "Eingaben, Calculate und Hauptergebnis", "Introducir datos, Calculate y ver el resultado principal"),
      cells: [yes, yes, yes, yes],
    },
    {
      label: L("Hesap adımlarının değerleri (ör. Nq, CSR, CRR)", "Calculation step values (e.g. Nq, CSR, CRR)", "Werte der Rechenschritte (z. B. Nq, CSR, CRR)", "Valores de cada paso (p. ej. Nq, CSR, CRR)"),
      cells: [no, yes, yes, yes],
    },
    {
      label: L("Information sekmesi (yöntem, denklemler, kaynaklar)", "Information tab (method, equations, references)", "Information‑Tab (Methode, Gleichungen, Quellen)", "Pestaña Information (método, ecuaciones, referencias)"),
      cells: [no, yes, yes, yes],
    },
    {
      label: L("Tam türetme: formül + yerine konmuş değerler", "Full derivation: formula + your numbers substituted", "Volle Herleitung: Formel + eingesetzte Werte", "Derivación completa: fórmula + sus valores sustituidos"),
      cells: [no, no, yes, yes],
    },
    {
      label: L("Bulut projeleri ve kayıtlı analizler", "Cloud projects and saved analyses", "Cloud‑Projekte und gespeicherte Analysen", "Proyectos en la nube y análisis guardados"),
      cells: [
        no,
        L(`${BRONZE_MAX_PROJECTS} proje · ${BRONZE_MAX_BOREHOLES_PER_PROJECT} sondaj · ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} örnek`, `${BRONZE_MAX_PROJECTS} projects · ${BRONZE_MAX_BOREHOLES_PER_PROJECT} boreholes · ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} samples`, `${BRONZE_MAX_PROJECTS} Projekte · ${BRONZE_MAX_BOREHOLES_PER_PROJECT} Bohrungen · ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} Proben`, `${BRONZE_MAX_PROJECTS} proyectos · ${BRONZE_MAX_BOREHOLES_PER_PROJECT} sondeos · ${BRONZE_MAX_SAMPLES_PER_BOREHOLE} muestras`),
        L("Sınırsız", "Unlimited", "Unbegrenzt", "Ilimitado"),
        L("Sınırsız", "Unlimited", "Unbegrenzt", "Ilimitado"),
      ],
    },
    {
      label: L("Blogda Further questions", "Further questions in blog articles", "Further questions im Blog", "Further questions en el blog"),
      cells: [no, no, yes, yes],
    },
    {
      label: L("Export Excel (profil tabloları, parametre matrisi)", "Export Excel (profile tables, parameter matrix)", "Export Excel (Profiltabellen, Parameter‑Matrix)", "Export Excel (tablas de perfil, matriz)"),
      cells: [no, no, no, yes],
    },
    {
      label: L("Araç raporu: Create report, Download PDF", "Tool reports: Create report, Download PDF", "Tool‑Berichte: Create report, Download PDF", "Informes: Create report, Download PDF"),
      cells: [no, no, no, yes],
    },
    {
      label: L("Yapay zekâ: Analyse with AI, matriste Generate report", "AI: Analyse with AI, matrix Generate report", "KI: Analyse with AI, Matrix‑Generate report", "IA: Analyse with AI, Generate report de la matriz"),
      cells: [no, no, no, yes],
    },
    {
      label: L("Kazıkta AASHTO ve TBDY tasarım kodları", "AASHTO and TBDY codes in the pile tool", "AASHTO‑ und TBDY‑Normen im Pfahl‑Tool", "Normas AASHTO y TBDY en pilotes"),
      cells: [no, no, no, yes],
    },
  ];

  const faq: Array<[string, string]> = [
    [
      L("Hesap detayları neden bulanık görünüyor?", "Why are the detailed calculations blurred?", "Warum ist die Detailrechnung unscharf?", "¿Por qué el cálculo detallado aparece difuminado?"),
      L(
        "Üye olmadan araçlarda girdi girip `Calculate` ile ana sonucu görürsünüz; hesap adımları ve Information sekmesi üyelere açıktır. Ücretsiz bir **Bronze** hesap açmanız yeterlidir.",
        "Without an account you can enter inputs and press `Calculate` to see the headline result; the calculation steps and the Information tab are for members. A free **Bronze** account unlocks them.",
        "Ohne Konto geben Sie Werte ein und sehen nach `Calculate` das Hauptergebnis; Rechenschritte und Information‑Tab sind Mitgliedern vorbehalten. Ein kostenloses **Bronze**‑Konto genügt.",
        "Sin cuenta puede introducir datos y pulsar `Calculate` para ver el resultado principal; los pasos del cálculo y la pestaña Information son para miembros. Basta una cuenta **Bronze** gratuita.",
      ),
    ],
    [
      L("Formüllerin açık hâlini nasıl görürüm?", "How do I see the formulas with my numbers?", "Wie sehe ich die Formeln mit meinen Werten?", "¿Cómo veo las fórmulas con mis valores?"),
      L(
        "**Silver** ve **Gold** üyelikte Detailed calculations bölümü her değerin formülünü ve sizin değerlerinizle yerine konmuş hâlini gösterir. Bronze yalnızca sonuç değerlerini gösterir.",
        "With **Silver** or **Gold**, Detailed calculations shows the formula behind every value and the same formula with your numbers substituted. Bronze shows the values only.",
        "Mit **Silver** oder **Gold** zeigt Detailed calculations zu jedem Wert die Formel und die Formel mit Ihren eingesetzten Zahlen. Bronze zeigt nur die Werte.",
        "Con **Silver** o **Gold**, Detailed calculations muestra la fórmula de cada valor y la misma fórmula con sus números. Bronze solo muestra los valores.",
      ),
    ],
    [
      L("Export Excel düğmesinde neden kilit var?", "Why does Export Excel show a padlock?", "Warum hat Export Excel ein Schloss?", "¿Por qué Export Excel muestra un candado?"),
      L(
        "Profil tablolarının ve parametre matrisinin Excel'e aktarımı **Gold** üyeliğe aittir. Diğer seviyelerde düğme kilitli görünür.",
        "Excel export of profile tables and the parameter matrix is a **Gold** feature; on other plans the button is shown locked.",
        "Der Excel‑Export von Profiltabellen und Parameter‑Matrix ist eine **Gold**‑Funktion; sonst ist die Schaltfläche gesperrt.",
        "La exportación a Excel de tablas de perfil y de la matriz es **Gold**; en otros planes el botón aparece bloqueado.",
      ),
    ],
    [
      L("Yeni bir projeyi nasıl oluştururum?", "How do I create a new project?", "Wie lege ich ein neues Projekt an?", "¿Cómo creo un proyecto nuevo?"),
      L(
        "Giriş yapın → üst menüden `Projects` → `New Project` ile ad verip oluşturun. Bronze'da en fazla " + BRONZE_MAX_PROJECTS + " proje açabilirsiniz.",
        "Sign in → `Projects` in the top bar → `New Project`, give it a name and save. Bronze allows up to " + BRONZE_MAX_PROJECTS + " projects.",
        "Anmelden → `Projects` in der Menüleiste → `New Project`, Namen vergeben, speichern. Bronze erlaubt bis zu " + BRONZE_MAX_PROJECTS + " Projekte.",
        "Inicie sesión → `Projects` en la barra superior → `New Project`, asigne un nombre y guarde. Bronze permite hasta " + BRONZE_MAX_PROJECTS + " proyectos.",
      ),
    ],
    [
      L("Araçta proje ve sondaj verisini nasıl kullanırım?", "How do I use project and borehole data in a tool?", "Wie nutze ich Projekt‑ und Bohrdaten in einem Tool?", "¿Cómo uso los datos del proyecto en una herramienta?"),
      L(
        "Araç sayfasında sağ üstteki `Projects and Boreholes` menüsünden projeyi ve sondajları seçip `Use in Tools`'a basın. Manuel girişe dönmek için `Clear` kullanın.",
        "On a tool page open `Projects and Boreholes` (top right), choose the project and boreholes, then press `Use in Tools`. Use `Clear` to go back to manual entry.",
        "Auf der Tool‑Seite `Projects and Boreholes` (oben rechts) öffnen, Projekt und Bohrungen wählen, `Use in Tools` drücken. Mit `Clear` zurück zur manuellen Eingabe.",
        "En la herramienta abra `Projects and Boreholes` (arriba a la derecha), elija proyecto y sondeos y pulse `Use in Tools`. Con `Clear` vuelve a la entrada manual.",
      ),
    ],
    [
      L("Kayıtlı analizleri nerede bulurum?", "Where are my saved analyses?", "Wo finde ich gespeicherte Analysen?", "¿Dónde están mis análisis guardados?"),
      L(
        "`Projects` → projeniz → `Saved analyses`. Her satırda `View`, `Load to Tool` ve `Remove` vardır.",
        "`Projects` → your project → `Saved analyses`. Each row offers `View`, `Load to Tool` and `Remove`.",
        "`Projects` → Ihr Projekt → `Saved analyses`. Pro Zeile: `View`, `Load to Tool`, `Remove`.",
        "`Projects` → su proyecto → `Saved analyses`. Cada fila ofrece `View`, `Load to Tool` y `Remove`.",
      ),
    ],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <div
        id="user-guide-print-root"
        className="space-y-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:shadow-none"
      >
        {/* ───── header ───── */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Geotechnical Insights Hub</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {L("Kullanım Kılavuzu", "User Guide", "Benutzerhandbuch", "Guía del usuario")}
              </h1>
            </div>
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm print:hidden" role="group" aria-label="Language">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`px-3 py-2 text-xs font-semibold uppercase transition-colors ${lang === code ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
          <p className="max-w-3xl text-[15px] leading-7 text-slate-600">
            {L(
              "Bu kılavuz sitedeki geoteknik araçların nasıl kullanılacağını adım adım anlatır: üyelik seviyeleri, bir aracın arayüzü (Calculation, detaylı hesap, Information), projeler ve sondajlar, kayıtlı analizler, raporlar ve parametre matrisi.",
              "This guide walks through the site's geotechnical tools step by step: membership levels, the layout of a tool (Calculation, detailed calculations, Information), projects and boreholes, saved analyses, reports and the parameter matrix.",
              "Dieses Handbuch erklärt die geotechnischen Tools Schritt für Schritt: Mitgliedsstufen, Aufbau eines Tools (Calculation, Detailrechnung, Information), Projekte und Bohrungen, gespeicherte Analysen, Berichte und die Parameter‑Matrix.",
              "Esta guía recorre paso a paso las herramientas geotécnicas del sitio: niveles de membresía, el diseño de una herramienta (Calculation, cálculo detallado, Information), proyectos y sondeos, análisis guardados, informes y la matriz de parámetros.",
            )}
          </p>
        </header>

        {/* ───── contents ───── */}
        <nav className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 print:hidden" aria-label={L("İçindekiler", "Contents", "Inhalt", "Contenido")}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{L("İçindekiler", "Contents", "Inhalt", "Contenido")}</p>
          <ol className="grid gap-x-6 gap-y-1.5 text-[15px] leading-7 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id} className="flex gap-2">
                <span className="w-6 shrink-0 tabular-nums text-slate-400">{i + 1}.</span>
                <a href={`#${s.id}`} className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-[3px] hover:text-slate-950 hover:decoration-slate-500">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ───── 1. getting started ───── */}
        <Section
          {...sec(0)}
          lead={L(
            "Ana sayfadan araçlara ve bloga geçebilir, üst menüden tüm bölümlere ulaşabilirsiniz. Dört adımda tipik bir çalışma:",
            "From the home page you can jump to the tools and the blog; the top bar reaches every section. A typical session in four steps:",
            "Von der Startseite gelangen Sie zu Tools und Blog; die Menüleiste erreicht alle Bereiche. Ein typischer Ablauf in vier Schritten:",
            "Desde la página principal puede ir a las herramientas y al blog; la barra superior lleva a todas las secciones. Una sesión típica en cuatro pasos:",
          )}
        >
          <Steps
            items={[
              L("`Tools` menüsünden bir araç açın.", "Open a tool from `Tools`.", "Öffnen Sie ein Tool unter `Tools`.", "Abra una herramienta desde `Tools`."),
              L(
                "Gruplandırılmış girdileri doldurun ve `Calculate`'e basın; sağda ana sonuç ve canlı çizim görünür.",
                "Fill in the grouped inputs and press `Calculate`; the headline result and a live drawing appear on the right.",
                "Füllen Sie die gruppierten Eingaben aus und drücken Sie `Calculate`; rechts erscheinen Hauptergebnis und Live‑Zeichnung.",
                "Rellene los datos agrupados y pulse `Calculate`; a la derecha aparecen el resultado principal y un dibujo en vivo.",
              ),
              L(
                "Nasıl hesaplandığını görmek için `Detailed calculations ↓` bağlantısını izleyin.",
                "Follow `Detailed calculations ↓` to see how the result was obtained.",
                "Folgen Sie `Detailed calculations ↓`, um den Rechenweg zu sehen.",
                "Siga `Detailed calculations ↓` para ver cómo se obtuvo el resultado.",
              ),
              L(
                "Üyeyseniz sondaj verinizi projeye kaydedin, araçlarda kullanın ve analizlerinizi saklayın.",
                "As a member, keep your borehole data in a project, use it in the tools and save your analyses.",
                "Als Mitglied speichern Sie Bohrdaten im Projekt, nutzen sie in den Tools und sichern Ihre Analysen.",
                "Como miembro, guarde sus sondeos en un proyecto, úselos en las herramientas y guarde sus análisis.",
              ),
            ]}
          />
          <Shot
            src="site-hero.png"
            alt={L("Ana sayfa", "Home page", "Startseite", "Página principal")}
            caption={L(
              "Ana sayfa: `Explore Tools` ve `Read Blog` ile araçlara ve bloga doğrudan geçiş.",
              "Home page: `Explore Tools` and `Read Blog` take you straight to the tools and the blog.",
              "Startseite: `Explore Tools` und `Read Blog` führen direkt zu Tools und Blog.",
              "Página principal: `Explore Tools` y `Read Blog` llevan directamente a herramientas y blog.",
            )}
          />
          <Shot
            src="site-main-navigation.png"
            alt={L("Üst menü", "Top navigation", "Hauptnavigation", "Navegación superior")}
            caption={L(
              "Üst menü: `Home`, `Tools`, `Blog`, `Contact` ve `Account`; giriş yaptığınızda `Projects` de eklenir.",
              "Top bar: `Home`, `Tools`, `Blog`, `Contact` and `Account`; `Projects` appears once you sign in.",
              "Menüleiste: `Home`, `Tools`, `Blog`, `Contact` und `Account`; nach der Anmeldung zusätzlich `Projects`.",
              "Barra superior: `Home`, `Tools`, `Blog`, `Contact` y `Account`; al iniciar sesión aparece `Projects`.",
            )}
          />
        </Section>

        {/* ───── 2. account and membership ───── */}
        <Section
          {...sec(1)}
          lead={L(
            "`Account` sayfasında giriş yapar veya `Register now.` ile ücretsiz hesap açarsınız. Yeni hesaplar **Bronze** olarak başlar.",
            "On the `Account` page you sign in, or open a free account with `Register now.`. New accounts start as **Bronze**.",
            "Auf der Seite `Account` melden Sie sich an oder eröffnen mit `Register now.` ein kostenloses Konto. Neue Konten starten als **Bronze**.",
            "En la página `Account` inicia sesión o abre una cuenta gratuita con `Register now.`. Las cuentas nuevas empiezan como **Bronze**.",
          )}
        >
          <ShotPair>
            <Shot
              src="account-login.png"
              alt="Log in"
              caption={L(
                "Giriş: e‑posta ve şifre; şifre sıfırlamak için `Forgot password?`.",
                "Log in with email and password; `Forgot password?` starts a reset.",
                "Anmeldung mit E‑Mail und Passwort; `Forgot password?` setzt zurück.",
                "Inicio de sesión con correo y contraseña; `Forgot password?` para restablecer.",
              )}
            />
            <Shot
              src="account-signup.png"
              alt="Sign up"
              caption={L(
                "Kayıt: güçlü şifre kuralları, yasal metinlerin onayı ve `Sign Up`.",
                "Sign up: strong‑password rules, accept the legal texts, then `Sign Up`.",
                "Registrierung: Passwortregeln, Zustimmung zu den Rechtstexten, dann `Sign Up`.",
                "Registro: reglas de contraseña, aceptar los textos legales y `Sign Up`.",
              )}
            />
          </ShotPair>

          <H3>{L("Üyelik seviyeleri", "Membership levels", "Mitgliedsstufen", "Niveles de membresía")}</H3>
          <P
            text={L(
              "Her seviye bir öncekinin tüm özelliklerini içerir. Kısaca: **misafir** sonucu görür, **Bronze** hesap adımlarını, **Silver** formüllerin tam türetmesini görür, **Gold** rapor indirir, Excel'e aktarır ve yapay zekâyı kullanır.",
              "Each level includes everything in the one before. In short: a **guest** sees the result, **Bronze** sees the calculation steps, **Silver** sees the full derivation of every formula, and **Gold** downloads reports, exports to Excel and uses AI.",
              "Jede Stufe enthält alles der vorherigen. Kurz: **Gäste** sehen das Ergebnis, **Bronze** die Rechenschritte, **Silver** die vollständige Herleitung jeder Formel, **Gold** lädt Berichte herunter, exportiert nach Excel und nutzt KI.",
              "Cada nivel incluye todo lo del anterior. En resumen: el **invitado** ve el resultado, **Bronze** ve los pasos del cálculo, **Silver** la derivación completa de cada fórmula y **Gold** descarga informes, exporta a Excel y usa la IA.",
            )}
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200 print:break-inside-avoid">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2.5">{L("Özellik", "Feature", "Funktion", "Función")}</th>
                  <th className="px-3 py-2.5 text-center">{L("Misafir", "Guest", "Gast", "Invitado")}</th>
                  <th className="px-3 py-2.5 text-center text-[#7a4a22]">Bronze</th>
                  <th className="px-3 py-2.5 text-center text-slate-700">Silver</th>
                  <th className="px-3 py-2.5 text-center text-amber-700">Gold</th>
                </tr>
              </thead>
              <tbody>
                {tierRows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-200">
                    <td className="px-3 py-2 text-slate-800">{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 text-center ${cell === yes ? "font-bold text-emerald-700" : cell === no ? "text-slate-300" : "text-xs text-slate-700"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Shot
            src="account-membership-tiers.png"
            alt={L("Üyelik kartları", "Membership cards", "Mitgliedskarten", "Tarjetas de membresía")}
            caption={L(
              "Kayıt ekranındaki üyelik karşılaştırması.",
              "The membership comparison on the sign‑up screen.",
              "Der Mitgliedschaftsvergleich auf der Registrierungsseite.",
              "La comparación de membresías en la pantalla de registro.",
            )}
          />

          <H3>{L("Hesap ekranı", "Your account page", "Ihre Kontoseite", "Su página de cuenta")}</H3>
          <P
            text={L(
              "Giriş yaptıktan sonra üst menüdeki `Account` düğmesi seviyenizin rengini alır. Hesap sayfasında `Subscription` (mevcut plan), `Personal Information` (e‑posta ve şifre) ve `Logout` bulunur.",
              "Once signed in, the `Account` button in the top bar takes your level's colour. The account page holds `Subscription` (your plan), `Personal Information` (email and password) and `Logout`.",
              "Nach der Anmeldung trägt die Schaltfläche `Account` die Farbe Ihrer Stufe. Die Kontoseite enthält `Subscription` (Tarif), `Personal Information` (E‑Mail, Passwort) und `Logout`.",
              "Tras iniciar sesión, el botón `Account` toma el color de su nivel. La página de cuenta incluye `Subscription` (su plan), `Personal Information` (correo y contraseña) y `Logout`.",
            )}
          />
          <Shot
            src="account-header-tier.png"
            alt="Account"
            caption={L(
              "Örnek: Gold üyelikte `Account` düğmesi ve `Projects` bağlantısı.",
              "Example: the `Account` button and `Projects` link for a Gold member.",
              "Beispiel: Schaltfläche `Account` und Link `Projects` für Gold‑Mitglieder.",
              "Ejemplo: el botón `Account` y el enlace `Projects` de un miembro Gold.",
            )}
          />
          <Shot
            src="account-information-panel.png"
            alt="Account page"
            size="md"
            caption={L(
              "Hesap sayfası; çerçeve rengi üyelik seviyenizi gösterir.",
              "The account page; the frame colour shows your membership level.",
              "Die Kontoseite; die Rahmenfarbe zeigt Ihre Stufe.",
              "La página de cuenta; el color del marco indica su nivel.",
            )}
          />
        </Section>

        {/* ───── 3. catalogue ───── */}
        <Section
          {...sec(2)}
          lead={L(
            "`Tools` sayfasında araçlar iki ana gruptadır. Arama kutusu başlık, kategori veya mühendislik terimiyle filtreler.",
            "The `Tools` page groups the tools in two families. The search box filters by title, category or engineering keyword.",
            "Die Seite `Tools` ordnet die Tools in zwei Familien. Das Suchfeld filtert nach Titel, Kategorie oder Fachbegriff.",
            "La página `Tools` agrupa las herramientas en dos familias. El buscador filtra por título, categoría o término técnico.",
          )}
        >
          <Shot
            src="tools-landing-two-categories.png"
            alt="Tools"
            caption={L(
              "**Teal:** Site Characterisation Tools — zemin parametreleri. **İndigo:** Geotechnical Analysis Tools — tasarım kontrolleri.",
              "**Teal:** Site Characterisation Tools — soil parameters. **Indigo:** Geotechnical Analysis Tools — design checks.",
              "**Türkis:** Site Characterisation Tools — Bodenparameter. **Indigo:** Geotechnical Analysis Tools — Nachweise.",
              "**Turquesa:** Site Characterisation Tools — parámetros del suelo. **Índigo:** Geotechnical Analysis Tools — comprobaciones de diseño.",
            )}
          />
        </Section>

        {/* ───── 4. tool interface ───── */}
        <Section
          {...sec(3)}
          lead={L(
            "Tüm araçlar aynı düzeni kullanır. Aşağıda örnek olarak tek bir araç üzerinden ekranın bölümleri gösterilmiştir; diğer araçlarda da aynı şekilde çalışırsınız.",
            "Every tool uses the same layout. The parts of the screen are shown below on one example tool; the others work the same way.",
            "Alle Tools haben denselben Aufbau. Die Bereiche werden unten an einem Beispiel‑Tool gezeigt; die anderen funktionieren genauso.",
            "Todas las herramientas usan el mismo diseño. Abajo se muestran las partes de la pantalla con una herramienta de ejemplo; las demás funcionan igual.",
          )}
        >
          <Shot
            src="tool-interface-four-tabs.png"
            alt="Tabs"
            size="md"
            caption={L(
              "Sekme çubuğu; araca göre bazı sekmeler bulunmayabilir.",
              "The tab strip; some tools have fewer tabs.",
              "Die Tab‑Leiste; manche Tools haben weniger Tabs.",
              "La barra de pestañas; algunas herramientas tienen menos.",
            )}
          />
          <Bullets
            items={[
              L(
                "`Calculation` — tek bir hesap: girdiler, `Calculate`, sonuç ve çizim.",
                "`Calculation` — a single calculation: inputs, `Calculate`, result and drawing.",
                "`Calculation` — eine Einzelrechnung: Eingaben, `Calculate`, Ergebnis und Zeichnung.",
                "`Calculation` — un cálculo único: datos, `Calculate`, resultado y dibujo.",
              ),
              L(
                "`Soil Profile Plot` — aynı hesabı birçok örnek için derinlik boyunca yapar ve grafikler.",
                "`Soil Profile Plot` — runs the same calculation for many samples along depth and plots them.",
                "`Soil Profile Plot` — rechnet dasselbe für viele Proben über die Tiefe und stellt sie dar.",
                "`Soil Profile Plot` — repite el cálculo para muchas muestras en profundidad y las grafica.",
              ),
              L("`Report` — rapor ve PDF (Gold).", "`Report` — report and PDF (Gold).", "`Report` — Bericht und PDF (Gold).", "`Report` — informe y PDF (Gold)."),
              L(
                "`Information` — yöntem, denklemler, varsayımlar ve kaynaklar (üyeler).",
                "`Information` — method, equations, assumptions and references (members).",
                "`Information` — Methode, Gleichungen, Annahmen und Quellen (Mitglieder).",
                "`Information` — método, ecuaciones, supuestos y referencias (miembros).",
              ),
            ]}
          />

          <H3>Calculation</H3>
          <Shot
            src="tool-calculation-layout.png"
            alt="Calculation"
            caption={L(
              "Solda gruplandırılmış girdiler ve `Calculate`; sağda sonuç kartları ve girdilerle anında güncellenen çizim.",
              "Grouped inputs and `Calculate` on the left; the result cards and a drawing that updates as you type on the right.",
              "Links gruppierte Eingaben und `Calculate`; rechts die Ergebniskarten und eine Zeichnung, die sich bei der Eingabe aktualisiert.",
              "A la izquierda los datos agrupados y `Calculate`; a la derecha las tarjetas de resultado y un dibujo que se actualiza al escribir.",
            )}
          />

          <H3>Detailed calculations</H3>
          <P
            text={L(
              "Sonucun altındaki `Detailed calculations ↓` bağlantısı hesap adımlarına iner. Misafirler için bu bölüm bulanıktır; **Bronze** her adımın değerini, **Silver** ve **Gold** ayrıca formülü ve değerlerinizle yerine konmuş hâlini görür.",
              "`Detailed calculations ↓` below the result jumps to the calculation steps. For guests this part is blurred; **Bronze** sees the value of every step, and **Silver** and **Gold** also see each formula with your numbers substituted.",
              "`Detailed calculations ↓` unter dem Ergebnis springt zu den Rechenschritten. Für Gäste ist dieser Teil unscharf; **Bronze** sieht den Wert jedes Schritts, **Silver** und **Gold** zusätzlich jede Formel mit Ihren eingesetzten Zahlen.",
              "`Detailed calculations ↓` bajo el resultado lleva a los pasos del cálculo. Para invitados aparece difuminado; **Bronze** ve el valor de cada paso y **Silver** y **Gold** además cada fórmula con sus números.",
            )}
          />
          <ShotPair>
            <Shot
              src="tier-details-guest.png"
              alt="Guest"
              caption={L("Misafir: adımlar bulanık.", "Guest: the steps are blurred.", "Gast: Schritte unscharf.", "Invitado: pasos difuminados.")}
            />
            <Shot
              src="tier-details-silver.png"
              alt="Silver"
              caption={L(
                "Silver / Gold: formül ve yerine konmuş değerler.",
                "Silver / Gold: formula and substituted values.",
                "Silver / Gold: Formel und eingesetzte Werte.",
                "Silver / Gold: fórmula y valores sustituidos.",
              )}
            />
          </ShotPair>

          <H3>Information</H3>
          <ShotPair>
            <Shot
              src="tab-information-equations.png"
              alt="Information"
              caption={L(
                "Üyeler için yöntem, denklemler, varsayımlar ve kaynakça.",
                "For members: method, equations, assumptions and references.",
                "Für Mitglieder: Methode, Gleichungen, Annahmen und Quellen.",
                "Para miembros: método, ecuaciones, supuestos y referencias.",
              )}
            />
            <Shot
              src="tier-information-guest.png"
              alt="Information guest"
              caption={L("Misafirler için bulanık.", "Blurred for guests.", "Für Gäste unscharf.", "Difuminado para invitados.")}
            />
          </ShotPair>

          <H3>Soil Profile Plot</H3>
          <Shot
            src="tools-profile-spt-manual-example.png"
            alt="Soil Profile Plot"
            caption={L(
              "Satırları elle (`Add BH`, `Add Layer`) veya projeden girin; sonuçlar tabloda hesaplanır ve altında derinlik grafikleri çizilir.",
              "Enter rows yourself (`Add BH`, `Add Layer`) or from a project; results are computed in the table and depth plots are drawn below.",
              "Zeilen selbst (`Add BH`, `Add Layer`) oder aus einem Projekt eingeben; Ergebnisse stehen in der Tabelle, darunter folgen Tiefendiagramme.",
              "Introduzca filas (`Add BH`, `Add Layer`) o desde un proyecto; los resultados se calculan en la tabla y debajo se dibujan los gráficos.",
            )}
          />
          <Callout
            tone="gold"
            label="Gold"
            text={L(
              "Tabloyu .xlsx olarak indiren `Export Excel` Gold üyelere açıktır; diğer seviyelerde kilit simgesiyle görünür.",
              "`Export Excel`, which downloads the table as .xlsx, is for Gold members; other levels see it with a padlock.",
              "`Export Excel` (Tabelle als .xlsx) ist Gold‑Mitgliedern vorbehalten; andere Stufen sehen ein Schloss.",
              "`Export Excel`, que descarga la tabla en .xlsx, es para miembros Gold; otros niveles lo ven con un candado.",
            )}
          />
        </Section>

        {/* ───── 5. projects ───── */}
        <Section
          {...sec(4)}
          lead={L(
            "Giriş yaptıktan sonra üst menüde `Projects` görünür. Burada bulut projelerinizi oluşturur, seçer, düzenler ve silersiniz. Her projede `Boreholes`, `Saved analyses` ve parametre matrisi (`Integrated Parameter Matrix`) kartları bulunur.",
            "After you sign in, `Projects` appears in the top bar. Create, select, edit and delete cloud projects there. Each project has `Boreholes`, `Saved analyses` and parameter matrix (`Integrated Parameter Matrix`) cards.",
            "Nach der Anmeldung erscheint `Projects` in der Menüleiste. Dort legen Sie Cloud‑Projekte an, wählen, bearbeiten und löschen sie. Jedes Projekt hat die Karten `Boreholes`, `Saved analyses` und Parameter‑Matrix (`Integrated Parameter Matrix`).",
            "Tras iniciar sesión aparece `Projects` en la barra superior. Allí crea, selecciona, edita y elimina proyectos en la nube. Cada proyecto tiene las tarjetas `Boreholes`, `Saved analyses` y la matriz de parámetros (`Integrated Parameter Matrix`).",
          )}
        >
          <Shot
            src="projects-empty.png"
            alt="Projects"
            caption={L(
              "Başlangıç: liste boşken `New Project` ile ilk projenizi oluşturun.",
              "Starting out: create your first project with `New Project`.",
              "Einstieg: das erste Projekt mit `New Project` anlegen.",
              "Al empezar: cree su primer proyecto con `New Project`.",
            )}
          />
          <Shot
            src="projects-active.png"
            alt="Projects active"
            caption={L(
              "Proje seçildiğinde kartlar sondajlara, kayıtlı analizlere ve parametre matrisine götürür.",
              "With a project selected, the cards open its boreholes, saved analyses and parameter matrix.",
              "Mit gewähltem Projekt öffnen die Karten Bohrungen, gespeicherte Analysen und Parameter‑Matrix.",
              "Con un proyecto seleccionado, las tarjetas abren sondeos, análisis guardados y matriz.",
            )}
          />
        </Section>

        {/* ───── 6. boreholes ───── */}
        <Section
          {...sec(5)}
          lead={L(
            "`Boreholes` görünümünde sondajları ve örnekleri tanımlarsınız; araçlarda bu verileri tek tıkla kullanabilirsiniz.",
            "In `Boreholes` you define boreholes and their samples; the tools can then use this data in one click.",
            "Unter `Boreholes` legen Sie Bohrungen und Proben an; die Tools nutzen diese Daten mit einem Klick.",
            "En `Boreholes` define sondeos y muestras; las herramientas usan luego estos datos con un clic.",
          )}
        >
          <Steps
            items={[
              L(
                "`Add borehole sample` bölümünde `New Borehole ID` ile yeni sondaj tanımlayın: kimlik, GWT ve birim hacim ağırlığı.",
                "In `Add borehole sample`, define a new borehole with `New Borehole ID`: ID, GWT and unit weight.",
                "Unter `Add borehole sample` mit `New Borehole ID` eine neue Bohrung anlegen: ID, GWT und Wichte.",
                "En `Add borehole sample`, defina un sondeo con `New Borehole ID`: ID, GWT y peso unitario.",
              ),
              L(
                "Aynı sondaja yeni derinlik eklemek için `Existing Borehole ID` seçin; sondaj bilgileri otomatik dolar, yalnızca derinlik, N, PI ve zemin davranışını girersiniz.",
                "To add another depth, choose `Existing Borehole ID`; the borehole data fills in and you enter only depth, N, PI and soil behaviour.",
                "Für eine weitere Tiefe `Existing Borehole ID` wählen; Bohrdaten werden übernommen, Sie tragen nur Tiefe, N, PI und Bodenverhalten ein.",
                "Para otra profundidad elija `Existing Borehole ID`; los datos del sondeo se rellenan y solo introduce profundidad, N, PI y comportamiento.",
              ),
              L(
                "Araç sayfasında sağ üstteki `Projects and Boreholes` menüsünden proje ve sondajları seçip `Use in Tools`'a basın; satırlar araca dağıtılır.",
                "On a tool page open `Projects and Boreholes` (top right), pick the project and boreholes and press `Use in Tools`; the rows are filled into the tool.",
                "Auf der Tool‑Seite `Projects and Boreholes` (oben rechts) öffnen, Projekt und Bohrungen wählen und `Use in Tools` drücken; die Zeilen werden übernommen.",
                "En la herramienta abra `Projects and Boreholes` (arriba a la derecha), elija proyecto y sondeos y pulse `Use in Tools`; las filas se cargan.",
              ),
              L(
                "Manuel girişe dönmek için `Clear` kullanın.",
                "Use `Clear` to go back to manual entry.",
                "Mit `Clear` zurück zur manuellen Eingabe.",
                "Use `Clear` para volver a la entrada manual.",
              ),
            ]}
          />
          <Shot
            src="boreholes-workspace.png"
            alt="Boreholes"
            caption={L(
              "Sondaj tablosu ve `Add borehole sample` formu.",
              "The borehole table and the `Add borehole sample` form.",
              "Bohrtabelle und Formular `Add borehole sample`.",
              "Tabla de sondeos y formulario `Add borehole sample`.",
            )}
          />
          <Shot
            src="tools-header-projects-boreholes.png"
            alt="Projects and Boreholes"
            caption={L(
              "Araç sayfalarında `Projects and Boreholes` menüsü sağ üsttedir (teal çerçeve). Analiz araçlarında bu menü gösterilmez.",
              "On tool pages the `Projects and Boreholes` menu sits at the top right (teal frame). Analysis tools do not show it.",
              "Auf Tool‑Seiten liegt das Menü `Projects and Boreholes` oben rechts (türkiser Rahmen). Analyse‑Tools zeigen es nicht.",
              "En las herramientas, el menú `Projects and Boreholes` está arriba a la derecha (marco turquesa). Las herramientas de análisis no lo muestran.",
            )}
          />
          <ShotPair>
            <Shot
              src="boreholes-tools-panel-use-in-tools.png"
              alt="Use in Tools"
              caption={L("`Use in Tools` sonrası: seçim aktif.", "After `Use in Tools`: selection active.", "Nach `Use in Tools`: Auswahl aktiv.", "Tras `Use in Tools`: selección activa.")}
            />
            <Shot
              src="boreholes-tools-panel-clear.png"
              alt="Clear"
              caption={L("`Clear` sonrası: manuel giriş.", "After `Clear`: manual entry.", "Nach `Clear`: manuelle Eingabe.", "Tras `Clear`: entrada manual.")}
            />
          </ShotPair>
          <Shot
            src="tools-project-profile-spt-example.png"
            alt="Project data"
            caption={L(
              "Projeden gelen GWT ve birim hacim ağırlığı, satır bazında sondaj ve derinlikle eşleşir.",
              "GWT and unit weight from the project are matched per row by borehole and depth.",
              "GWT und Wichte aus dem Projekt werden je Zeile über Bohrung und Tiefe zugeordnet.",
              "El GWT y el peso unitario del proyecto se asignan por fila según sondeo y profundidad.",
            )}
          />
          <Callout
            tone="note"
            label={L("Not", "Note", "Hinweis", "Nota")}
            text={L(
              "Projede tanımlı zemin davranışı bazı araçlarda satırın uygun olup olmadığını belirler; uygun olmayan satırlar gri görünür.",
              "The soil behaviour stored in the project decides whether a row is eligible in some tools; ineligible rows appear greyed out.",
              "Das im Projekt gespeicherte Bodenverhalten bestimmt in manchen Tools, ob eine Zeile zulässig ist; unzulässige Zeilen erscheinen grau.",
              "El comportamiento del suelo guardado en el proyecto decide si una fila es apta en algunas herramientas; las no aptas aparecen en gris.",
            )}
          />
        </Section>

        {/* ───── 7. save ───── */}
        <Section
          {...sec(6)}
          lead={L(
            "Profil araçlarında `Save Analysis to Project` paneli analizi aktif projeye kaydeder: girdi tabloları, sonuçlar ve grafik görüntüleri saklanır.",
            "In profile tools the `Save Analysis to Project` panel stores the analysis in the active project: input tables, results and plot images.",
            "In Profil‑Tools speichert das Panel `Save Analysis to Project` die Analyse im aktiven Projekt: Eingabetabellen, Ergebnisse und Diagrammbilder.",
            "En las herramientas de perfil, el panel `Save Analysis to Project` guarda el análisis en el proyecto activo: tablas, resultados e imágenes de gráficos.",
          )}
        >
          <Shot
            src="save-analysis-to-project-panel.png"
            alt="Save"
            size="md"
            caption={L(
              "Kayıttan sonra yakalanan alanlar, tablolar ve grafikler özetlenir.",
              "After saving, a summary lists the captured fields, tables and plots.",
              "Nach dem Speichern listet eine Zusammenfassung Felder, Tabellen und Diagramme.",
              "Tras guardar, un resumen enumera campos, tablas y gráficos.",
            )}
          />
          <Callout
            tone="tip"
            label={L("Araçlar arası aktarım", "Tools feed each other", "Tools speisen sich gegenseitig", "Las herramientas se alimentan entre sí")}
            text={L(
              "Kaydedilen bir aracın çıktısı başka bir aracın girdisine otomatik aktarılır. Örneğin Eu aracındaki N60, kayıtlı **SPT Corrections** analizinden gelir.",
              "A saved tool's output fills another tool's input automatically. For example, N60 in the Eu tool comes from the saved **SPT Corrections** analysis.",
              "Die Ausgabe eines gespeicherten Tools füllt automatisch die Eingabe eines anderen. So kommt N60 im Eu‑Tool aus der gespeicherten Analyse **SPT Corrections**.",
              "La salida de una herramienta guardada rellena automáticamente la entrada de otra. Por ejemplo, N60 en la herramienta Eu proviene del análisis guardado **SPT Corrections**.",
            )}
          />
          <Shot
            src="soil-profile-n60-autofill-example.png"
            alt="Autofill"
            size="md"
            caption={L(
              "Yeşil etiket: değer kayıtlı SPT Corrections analizinden geldi; Eu = (Eu/N60)·N60 buradan hesaplanır.",
              "Green badge: the value came from the saved SPT Corrections analysis; Eu = (Eu/N60)·N60 follows from it.",
              "Grünes Label: der Wert stammt aus der gespeicherten SPT‑Corrections‑Analyse; daraus folgt Eu = (Eu/N60)·N60.",
              "Etiqueta verde: el valor viene del análisis guardado SPT Corrections; de ahí Eu = (Eu/N60)·N60.",
            )}
          />
          <P
            text={L(
              "Kayıtlı analizler `Projects` → projeniz → `Saved analyses` altındadır: `View` grafiği gösterir, `Load to Tool` analizi araçta yeniden açar, `Remove` kaydı siler.",
              "Saved analyses live under `Projects` → your project → `Saved analyses`: `View` shows the plot, `Load to Tool` reopens the analysis in its tool, `Remove` deletes it.",
              "Gespeicherte Analysen liegen unter `Projects` → Projekt → `Saved analyses`: `View` zeigt das Diagramm, `Load to Tool` öffnet die Analyse im Tool, `Remove` löscht sie.",
              "Los análisis guardados están en `Projects` → su proyecto → `Saved analyses`: `View` muestra el gráfico, `Load to Tool` lo reabre en su herramienta y `Remove` lo elimina.",
            )}
          />
          <Shot
            src="saved-analyses.png"
            alt="Saved analyses"
            caption={L(
              "Saved analyses: araç adı, kayıt zamanı ve eylemler.",
              "Saved analyses: tool name, timestamp and actions.",
              "Saved analyses: Tool, Zeitstempel und Aktionen.",
              "Saved analyses: herramienta, fecha y acciones.",
            )}
          />
        </Section>

        {/* ───── 8. reports ───── */}
        <Section
          {...sec(7)}
          lead={L(
            "`Report` sekmesi her araç için ayrıntılı bir rapor şablonu sunar ve **Gold** üyelere açıktır.",
            "The `Report` tab offers a detailed report template for each tool and is available to **Gold** members.",
            "Der Tab `Report` bietet für jedes Tool eine ausführliche Berichtsvorlage und steht **Gold**‑Mitgliedern zur Verfügung.",
            "La pestaña `Report` ofrece una plantilla de informe detallada para cada herramienta y está disponible para miembros **Gold**.",
          )}
        >
          <Bullets
            items={[
              L(
                "`Create report` — yöntem, denklemler, varsayımlar ve Harvard tarzı kaynakçanın ardından projeye özel değerlendirme: girdiler, sonuç tablosu, profil grafikleri ve istatistik özet.",
                "`Create report` — method, equations, assumptions and Harvard‑style references, followed by the project‑specific assessment: inputs, results table, profile figures and a statistical summary.",
                "`Create report` — Methode, Gleichungen, Annahmen und Quellen im Harvard‑Stil, gefolgt von der projektbezogenen Auswertung: Eingaben, Ergebnistabelle, Profilbilder und Statistik.",
                "`Create report` — método, ecuaciones, supuestos y referencias estilo Harvard, seguido de la evaluación del proyecto: datos, tabla de resultados, figuras de perfil y resumen estadístico.",
              ),
              L("`Download PDF` — raporu PDF olarak indirir.", "`Download PDF` — saves the report as a PDF.", "`Download PDF` — speichert den Bericht als PDF.", "`Download PDF` — guarda el informe en PDF."),
              L(
                "`Analyse with AI` — tablo ve grafikleri test edilmiş bir mühendislik prompt'uyla yorumlar.",
                "`Analyse with AI` — interprets the table and plots with a tested engineering prompt.",
                "`Analyse with AI` — interpretiert Tabelle und Diagramme mit einem geprüften Engineering‑Prompt.",
                "`Analyse with AI` — interpreta la tabla y los gráficos con un prompt de ingeniería probado.",
              ),
            ]}
          />
          <Shot
            src="report-tab-overview.png"
            alt="Report"
            caption={L(
              "Report sekmesi: Create report, Download PDF ve Analyse with AI.",
              "The Report tab: Create report, Download PDF and Analyse with AI.",
              "Der Report‑Tab: Create report, Download PDF und Analyse with AI.",
              "La pestaña Report: Create report, Download PDF y Analyse with AI.",
            )}
          />
          <Callout
            tone="note"
            label={L("Gizlilik", "Privacy", "Datenschutz", "Privacidad")}
            text={L(
              "`Analyse with AI` rapor tablosunu, profil grafiklerini ve yöntem metnini (hesap bilgisi olmadan) Türkiye dışında işlenmek üzere Google Gemini API'sine gönderir. Gizli veya müşteriye kısıtlı veriler için kullanmayın.",
              "`Analyse with AI` sends the report table, profile figures and method text (no account details) to Google's Gemini API, processed outside Türkiye. Do not use it for confidential or client‑restricted data.",
              "`Analyse with AI` sendet Berichtstabelle, Profilbilder und Methodentext (ohne Kontodaten) an die Gemini‑API von Google, verarbeitet außerhalb der Türkei. Nicht für vertrauliche Daten verwenden.",
              "`Analyse with AI` envía la tabla, las figuras y el texto del método (sin datos de cuenta) a la API Gemini de Google, procesados fuera de Türkiye. No lo use con datos confidenciales.",
            )}
          />
          <Shot
            src="guide-report-download-close.png"
            alt="Download"
            size="md"
            caption={L(
              "Oluşturulan raporu indirin veya `Close Report` ile önizlemeyi kapatın.",
              "Download the generated report or close the preview with `Close Report`.",
              "Bericht herunterladen oder die Vorschau mit `Close Report` schließen.",
              "Descargue el informe o cierre la vista previa con `Close Report`.",
            )}
          />
        </Section>

        {/* ───── 9. matrix ───── */}
        <Section
          {...sec(8)}
          lead={L(
            "`Integrated Parameter Matrix`, projeye kaydedilmiş araç analizlerinden gelen parametreleri sondaj örnekleri bazında tek tabloda birleştirir.",
            "The `Integrated Parameter Matrix` merges the parameters from analyses saved to the project into one table, sample by sample.",
            "Die `Integrated Parameter Matrix` führt die Parameter aus gespeicherten Analysen probenweise in einer Tabelle zusammen.",
            "La `Integrated Parameter Matrix` reúne en una tabla, muestra a muestra, los parámetros de los análisis guardados en el proyecto.",
          )}
        >
          <Bullets
            items={[
              L("`Refresh` — tabloyu kayıtlı analizlerden yeniden oluşturur.", "`Refresh` — rebuilds the table from the saved analyses.", "`Refresh` — baut die Tabelle aus den gespeicherten Analysen neu auf.", "`Refresh` — reconstruye la tabla a partir de los análisis guardados."),
              L("`Export Excel` — matrisi .xlsx olarak indirir (**Gold**).", "`Export Excel` — downloads the matrix as .xlsx (**Gold**).", "`Export Excel` — lädt die Matrix als .xlsx (**Gold**).", "`Export Excel` — descarga la matriz en .xlsx (**Gold**)."),
              L(
                "`Generate report` — matristen yapay zekâ destekli mühendislik raporu üretir (**Gold**, haftalık kota).",
                "`Generate report` — produces an AI engineering report from the matrix (**Gold**, weekly allowance).",
                "`Generate report` — erzeugt aus der Matrix einen KI‑Ingenieurbericht (**Gold**, Wochenkontingent).",
                "`Generate report` — genera un informe de ingeniería con IA a partir de la matriz (**Gold**, cupo semanal).",
              ),
            ]}
          />
          <Shot
            src="integrated-parameter-matrix.png"
            alt="Matrix"
            caption={L(
              "Parametre matrisi ve haftalık AI rapor kotası satırı.",
              "The parameter matrix and its weekly AI report allowance line.",
              "Die Parameter‑Matrix mit der Zeile zum wöchentlichen KI‑Kontingent.",
              "La matriz de parámetros y la línea del cupo semanal de IA.",
            )}
          />
        </Section>

        {/* ───── 10. FAQ ───── */}
        <Section {...sec(9)}>
          <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {faq.map(([q, a]) => (
              <div key={q} className="px-4 py-3.5 print:break-inside-avoid">
                <dt className="text-[15px] font-semibold text-slate-900">{q}</dt>
                <dd className="mt-1.5 text-[15px] leading-7 text-slate-700">
                  <Rich text={a} />
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}

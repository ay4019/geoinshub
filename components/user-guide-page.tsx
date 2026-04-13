"use client";

import { useEffect, useState } from "react";
import { MAX_BOREHOLES_PER_PROJECT, MAX_PROJECTS_PER_USER } from "@/lib/project-limits";
import {
  BRONZE_MAX_BOREHOLES_PER_PROJECT,
  BRONZE_MAX_PROJECTS,
  BRONZE_MAX_REPORTS_PER_DAY,
  BRONZE_MAX_SAMPLES_PER_BOREHOLE,
} from "@/lib/subscription";

/** Framed guide screenshots so narrow/wide assets share a consistent layout in print and on screen. */
const guideShotFrame =
  "flex w-full items-center justify-center bg-gradient-to-b from-slate-50 to-white px-3 py-8 sm:px-5 sm:py-10";
const guideImgHero =
  "mx-auto w-full max-w-4xl object-contain object-top [max-height:min(26rem,58vh)] sm:[max-height:min(30rem,62vh)]";
const guideImgNav =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(9rem,26vh)] sm:[max-height:min(10rem,28vh)]";
const guideImgLogin =
  "mx-auto w-full max-w-md object-contain object-top [max-height:min(28rem,62vh)] sm:[max-height:min(32rem,68vh)]";
const guideImgSignup =
  "mx-auto w-full max-w-4xl object-contain object-top [max-height:min(30rem,65vh)] sm:[max-height:min(34rem,72vh)]";
const guideImgTiers =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(34rem,72vh)] sm:[max-height:min(38rem,78vh)]";
const guideImgAccountHeader =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(9rem,26vh)] sm:[max-height:min(10rem,28vh)]";
const guideImgAccountDashboard =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(38rem,82vh)] sm:[max-height:min(42rem,85vh)]";
const guideImgProjects =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(36rem,80vh)] sm:[max-height:min(40rem,84vh)]";
const guideImgBoreholes =
  "mx-auto w-full max-w-5xl object-contain object-top [max-height:min(40rem,85vh)] sm:[max-height:min(44rem,88vh)]";
/** Tools listing / header strip showing Projects and Boreholes control (wide, short crop). */
const guideImgToolsHeader =
  "block h-auto w-full max-w-5xl rounded-lg border border-slate-200 object-contain object-top [max-height:min(14rem,40vh)] sm:[max-height:min(16rem,44vh)]";
/** /tools landing: two category cards (wide crop, ~1024×193). */
const guideImgToolsLandingCategories =
  "block h-auto w-full max-w-5xl rounded-lg border border-slate-200 object-contain object-top [max-height:min(15rem,42vh)] sm:[max-height:min(17rem,46vh)]";
/** Typical tool tab strip: Calculation · Soil Profile Plot · Report · Information. */
const guideImgToolTabs =
  "mx-auto block h-auto w-full max-w-3xl rounded-lg border border-slate-200 object-contain object-left [max-height:min(8rem,22vh)] sm:[max-height:min(9rem,24vh)]";
/** Report tab: Create report, Analyse with AI (gold), REPORT TYPES panel — full-height hero crop. */
const guideImgReportTab =
  "mx-auto block h-auto w-full max-w-3xl object-contain object-top [max-height:min(44rem,88vh)] sm:[max-height:min(48rem,90vh)]";

const DEFAULT_USER_GUIDE_LANG: "tr" | "en" | "de" | "es" = "en";

export function UserGuidePage() {
  const [lang, setLang] = useState<"tr" | "en" | "de" | "es">(() => {
    if (typeof window === "undefined") return DEFAULT_USER_GUIDE_LANG;
    const stored = window.localStorage.getItem("gih:userGuideLang");
    return stored === "en" || stored === "tr" || stored === "de" || stored === "es" ? stored : DEFAULT_USER_GUIDE_LANG;
  });
  const nonTrLang: "en" | "de" | "es" = lang === "de" || lang === "es" ? lang : "en";
  /** Turkish + English + German + Spanish (single source for headings, TOC, FAQ). */
  const L = (tr: string, en: string, de: string, es: string) =>
    lang === "tr" ? tr : nonTrLang === "de" ? de : nonTrLang === "es" ? es : en;
  /** English / German / Spanish only (used where Turkish lives in a separate `lang === "tr"` branch). */
  const t = (en: string, de: string, es: string) => (nonTrLang === "de" ? de : nonTrLang === "es" ? es : en);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("gih:userGuideLang", lang);
  }, [lang]);

  const tocLabels = [
    L("1. Site ve menü", "1. Site and Menu", "1. Website und Menü", "1. Sitio y menú"),
    L(
      "2. Hesap: Giriş ve üye olma",
      "2. Account: Login and Sign Up",
      "2. Account: Anmeldung und Registrierung",
      "2. Account: inicio de sesión y registro",
    ),
    L(
      "3. Hesap: Bilgi ve abonelik",
      "3. Account: Information and Subscription",
      "3. Account: Information und Abonnement",
      "3. Account: información y suscripción",
    ),
    L("4. Proje: Ekleme ve Düzenleme", "4. Project: Add and Edit", "4. Project: Hinzufügen und Bearbeiten", "4. Project: Añadir y editar"),
    L(
      "5. Sondajlar (Boreholes): Ekleme ve Düzenleme",
      "5. Boreholes: Add and Edit",
      "5. Boreholes: Hinzufügen und Bearbeiten",
      "5. Boreholes: Añadir y editar",
    ),
    L("6. Araçların kullanımı", "6. Use of Tools", "6. Nutzung der Tools", "6. Uso de las herramientas"),
    L("7. Rapor", "7. Reports", "7. Berichte", "7. Informes"),
    L(
      "8. Plotlar ve analiz kaydı",
      "8. Plots and Analysis Save",
      "8. Plots und Analyse speichern",
      "8. Gráficos y guardar análisis",
    ),
    L(
      "9. Kayıtlı analizleri görüntüleme",
      "9. Viewing Saved Analysis",
      "9. Gespeicherte Analysen ansehen",
      "9. Ver análisis guardados",
    ),
    L(
      "10. Parametre matrisi (Projects)",
      "10. Parameter matrix (Projects)",
      "10. Parameter‑Matrix (Projects)",
      "10. Matriz de parámetros (Projects)",
    ),
    L("11. Sıkça sorulan sorular", "11. FAQ", "11. Häufige Fragen", "11. Preguntas frecuentes"),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div
        id="user-guide-print-root"
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
              {L("Kullanım Kılavuzu", "User Guide", "Benutzerhandbuch", "Guía del usuario")}
            </h1>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {L(
              "Bu doküman, sitedeki araçların (tools) nasıl kullanılacağını ve ilgili bölümlerin nerede bulunacağını özetler. Hesap/proje/sondaj yönetimi, araçlarda proje verisi kullanımı, sonuçları kaydetme, grafikler ve rapor alma akışı adım adım gösterilmiştir.",
              "This guide explains how to use the tools on the site and where to find key sections. It walks through the typical workflow: account/project/borehole management, using project data in tools, saving results, viewing plots, and exporting reports.",
              "Dieses Handbuch erklärt, wie Sie die Tools der Website nutzen und wichtige Bereiche finden. Es führt durch den typischen Ablauf: Konto-/Projekt-/Bohrungen-Verwaltung, Nutzung von Projektdaten in Tools, Speichern von Ergebnissen, Anzeigen von Plots sowie Export von Berichten.",
              "Esta guía explica cómo usar las herramientas del sitio y dónde encontrar las secciones clave. Recorre el flujo típico: gestión de cuenta/proyecto/perforaciones, uso de datos del proyecto en las herramientas, guardar resultados, ver gráficos y exportar informes.",
            )}
          </p>
        </header>

        <nav
          className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 print:hidden"
          aria-label={L("İçindekiler", "Table of contents", "Inhaltsverzeichnis", "Tabla de contenidos")}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {L("İçindekiler", "Contents", "Inhalt", "Contenido")}
          </p>
          <ul className="list-none space-y-1.5 text-[15px] leading-7 text-slate-700">
            {tocLabels.map((label, i) => (
              <li key={`toc-${i}-${label}`}>
                <a
                  href={`#guide-section-${i + 1}`}
                  className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-[3px] transition-colors hover:text-slate-950 hover:decoration-slate-500"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {lang === "tr" ? (
          <>
            <section id="guide-section-1" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">1. Site ve menü</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Siteye girdiğinizde karşınıza çıkan ana sayfada, hesaplayıcılara ve teknik içeriklere hızlıca geçmek için{" "}
                <strong>Explore Tools</strong> ve <strong>Read Blog</strong> düğmelerini kullanabilirsiniz. Alt bölümdeki{" "}
                <strong>Başlangıç kılavuzu</strong> bağlantısı ise araçlar, hesap, projeler, kayıtlı analizler ve (planınız
                kapsıyorsa) yapay zekâ destekli raporlama hakkında özet bir yol haritası sunar.
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                Üst menüden tüm ana bölümlere ulaşırsınız: <strong>Home</strong> ana sayfa; <strong>Tools</strong> araç
                listesi; <strong>Blog</strong> yazıları; soru ve geri bildirim için <strong>Contact</strong>; üye olmak,
                giriş yapmak ve hesabınızı yönetmek için ise <strong>Account</strong>. Bulunduğunuz sayfaya göre ilgili menü
                öğesi seçili görünür.
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-hero.png"
                    alt="Ana sayfa: Geotechnical Insights Hub, Explore Tools ve Read Blog düğmeleri"
                    className={guideImgHero}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Ana sayfa: Araçlara ve bloga doğrudan geçiş düğmeleri ile başlangıç kılavuzu bağlantısı.
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-main-navigation.png"
                    alt="Üst başlık: site logosu ve ana menü (Home, Tools, Blog, Contact, Account)"
                    className={guideImgNav}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Üst başlık: logo ve ana menü. Home, Tools, Blog, Contact ve Account; bulunduğunuz sayfa vurgulanır.
                </figcaption>
              </figure>
            </section>

            <section id="guide-section-2" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">2. Hesap: Giriş ve üye olma</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Üst menüden <strong>Account</strong>’a tıkladığınızda <code className="rounded bg-slate-100 px-1">/account</code>{" "}
                sayfası açılır. Burada <strong>Log in to your account</strong> formu ile e‑posta ve şifrenizi girerek oturum
                açabilir; <strong>Forgot password?</strong> ile şifre sıfırlama akışına gidebilirsiniz. Henüz hesabınız yoksa{" "}
                <strong>Register now.</strong> bağlantısı sizi kayıt görünümüne geçirir: <strong>Create your account</strong>{" "}
                formunda güçlü şifre kurallarını karşılayan bir şifre belirler ve yasal metinleri onayladıktan sonra{" "}
                <strong>Sign Up</strong> ile üyeliğinizi oluşturursunuz.
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-login.png"
                    alt="Account: Log in to your account formu"
                    className={guideImgLogin}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Giriş ekranı: e‑posta, şifre, Log In ve kayıt için Register now.
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-signup.png"
                    alt="Account: Create your account kayıt formu"
                    className={guideImgSignup}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Kayıt ekranı: şifre gereksinimleri, şartları onaylama ve Sign Up.
                </figcaption>
              </figure>

              <p className="text-[15px] leading-7 text-slate-700">
                Üyelik seviyeleri üç ana kategoridedir: <strong>Bronze</strong>, <strong>Silver</strong> ve{" "}
                <strong>Gold</strong>. Kayıt ekranının altında <strong>Compare membership tiers</strong> bölümünde bu planlar
                yan yana özetlenir; yeni hesaplar varsayılan olarak <strong>Bronze</strong> ile başlar, yükseltme ile Silver
                veya Gold limitleri açılır.
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-membership-tiers.png"
                    alt="Bronze, Silver ve Gold üyelik kartları karşılaştırması"
                    className={guideImgTiers}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Üyelik karşılaştırması: Bronze, Silver ve Gold özellik özetleri.
                </figcaption>
              </figure>

              <div className="space-y-3 text-[15px] leading-7 text-slate-700">
                <p>
                  <strong>Bronze:</strong> Tüm yeni üyeler bu seviyeden başlar. En fazla{" "}
                  <strong>{BRONZE_MAX_PROJECTS} proje</strong>, proje başına en fazla{" "}
                  <strong>{BRONZE_MAX_BOREHOLES_PER_PROJECT} borehole kimliği</strong>, borehole başına en fazla{" "}
                  <strong>{BRONZE_MAX_SAMPLES_PER_BOREHOLE} örnek</strong> tanımlayabilirsiniz. Araçlarda{" "}
                  <strong>Report</strong> sekmesinde <strong>Create report</strong> akışıyla tamamlanan{" "}
                  <strong>Download PDF</strong> işlemi, Avrupa/İstanbul takvim günü başına en fazla{" "}
                  <strong>{BRONZE_MAX_REPORTS_PER_DAY}</strong> kez kullanılabilir. Analizleri buluta kaydedebilirsiniz. Profil
                  araçlarında <strong>AI yorumu</strong> (Analyse with AI) bu planda yer almaz. Projects’teki parametre
                  matrisindeki <strong>Generate report</strong> (yapay zekâ mühendislik raporu) yalnızca{" "}
                  <strong>Gold</strong> ile sunulur ve günlük 15 kotasından bağımsız, ayrı haftalık kota kullanır. Blog
                  araştırma yazılarındaki <strong>Further questions</strong> (ek sorular) yalnızca Silver veya Gold ile
                  sunulur.
                </p>
                <p>
                  <strong>Silver:</strong> <strong>Sınırsız proje ve borehole</strong>; araçlarda{" "}
                  <strong>Create report → Download PDF</strong> kullanımında günlük tavan yoktur. Parametre matrisi{" "}
                  <strong>Generate report</strong> (AI) Silver’da yer almaz — yalnızca Gold. Blog araştırma içeriklerinde
                  rehberli takip niteliğinde <strong>Further questions</strong> kullanılabilir. Bronze’daki tüm özellikler
                  Silver’a dahildir.
                </p>
                <p>
                  <strong>Gold:</strong> Profil araçlarında <strong>sınırsız AI analizi</strong> (Analyse with AI). Projects’te
                  parametre matrisinde <strong>Generate report</strong> (AI mühendislik raporu) Gold üyelikte açılır; haftalık
                  kullanım kotası gösterilebilir. Araç PDF’leri ve projelerde pratikte sınırsız kullanım; yeni özelliklere
                  öncelikli erişim. Silver’daki tüm özellikler Gold kapsamındadır.
                </p>
                <p className="text-slate-600">
                  <strong>Not:</strong> Araçları ve blogu hesap açmadan da gezebilir; bulut projesi, kayıtlı analiz ve üyelikle
                  gelen kota özellikleri için hesap gerekir.
                </p>
              </div>
            </section>

            <section id="guide-section-3" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">3. Hesap: Bilgi ve abonelik</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Giriş yaptıktan sonra hesabınız, abonelik kaydınızdaki <strong>üyelik seviyesine (tier)</strong> göre
                özellikleri açar. Üst menüdeki <strong>Account</strong> bağlantısının dolgu rengi, geçerli tier’ınıza göre
                (Bronze, Silver, Gold) değişir; oturum açıkken küçük yeşil onay işareti görünür. Giriş yaptığınızda{" "}
                <strong>Projects</strong> bağlantısı da menüde listelenir.
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                <code className="rounded bg-slate-100 px-1">/account</code> sayfasındaki bilgi çerçevesinin kenar rengi de aynı
                tier paletini kullanır. Bu ekranda <strong>Subscription</strong> (mevcut plan ve karşılaştırma),{" "}
                <strong>Personal Information</strong> altında e‑posta görüntüleme ve şifre güncelleme ile{" "}
                <strong>Logout</strong> (çıkış) bulunur.
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-header-tier.png"
                    alt="Üst menü: Account düğmesi üyelik seviyesine göre renkli"
                    className={guideImgAccountHeader}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Örnek: Gold üyelikte Account düğmesi ve Projects bağlantısı (üst menü).
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-information-panel.png"
                    alt="Account sayfası: Subscription sekmesi ve tier kartları"
                    className={guideImgAccountDashboard}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  Account ekranı: Subscription, Personal Information, Logout; çerçeve rengi tier ile uyumludur.
                </figcaption>
              </figure>
            </section>
          </>
        ) : (
          <>
            <section id="guide-section-1" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {L("1. Site ve menü", "1. Site and Menu", "1. Website und Menü", "1. Sitio y menú")}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "On the home page, use Explore Tools and Read Blog to jump straight to calculators and articles. The Getting started guide link at the bottom gives a short overview of tools, account, projects, saved analyses, and AI-assisted reporting when your plan includes it.",
                  "Auf der Startseite nutzen Sie Explore Tools und Read Blog, um direkt zu Rechnern und Artikeln zu springen. Der Link Getting started guide unten bietet einen kurzen Überblick über Tools, Konto, Projekte, gespeicherte Analysen sowie KI‑gestütztes Reporting, sofern Ihr Tarif das vorsieht.",
                  "En la página principal use Explore Tools y Read Blog para ir a calculadoras y artículos. El enlace Getting started guide al pie ofrece un resumen de herramientas, cuenta, proyectos, análisis guardados e informes asistidos por IA cuando su plan lo incluye.",
                )}
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "The top navigation lists Home, Tools, Blog, Contact, and Account. Use Account to sign up, sign in, and manage your profile; Contact for messages. The active page is highlighted in the menu.",
                  "Die obere Navigation zeigt Home, Tools, Blog, Contact und Account. Über Account registrieren Sie sich, melden sich an und verwalten Ihr Profil; Contact für Nachrichten. Die aktuelle Seite ist im Menü hervorgehoben.",
                  "La navegación superior incluye Home, Tools, Blog, Contact y Account. Use Account para registrarse, iniciar sesión y gestionar su perfil; Contact para mensajes. La página activa aparece resaltada en el menú.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-hero.png"
                    alt={t(
                      "Home: Geotechnical Insights Hub with Explore Tools and Read Blog",
                      "Startseite: Geotechnical Insights Hub mit Explore Tools und Read Blog",
                      "Inicio: Geotechnical Insights Hub con Explore Tools y Read Blog",
                    )}
                    className={guideImgHero}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Home page: quick links to tools and blog, plus the getting started guide.",
                    "Startseite: Schnellzugriff auf Tools und Blog sowie Getting started guide.",
                    "Página principal: enlaces rápidos a herramientas y blog, más la guía de inicio.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-main-navigation.png"
                    alt={t(
                      "Site header: logo and primary navigation (Home, Tools, Blog, Contact, Account)",
                      "Kopfzeile: Logo und Hauptnavigation (Home, Tools, Blog, Contact, Account)",
                      "Cabecera: logotipo y navegación principal (Home, Tools, Blog, Contact, Account)",
                    )}
                    className={guideImgNav}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Site header: logo and main menu. Home, Tools, Blog, Contact, and Account; the current page is highlighted.",
                    "Kopfzeile: Logo und Hauptmenü. Home, Tools, Blog, Contact und Account; die aktuelle Seite ist markiert.",
                    "Cabecera: logo y menú principal. Home, Tools, Blog, Contact y Account; la página actual aparece resaltada.",
                  )}
                </figcaption>
              </figure>
            </section>

            <section id="guide-section-2" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {L(
                  "2. Hesap: Giriş ve üye olma",
                  "2. Account: Login and Sign Up",
                  "2. Account: Anmeldung und Registrierung",
                  "2. Account: inicio de sesión y registro",
                )}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "Click Account in the top menu to open /account. Use Log in to your account with email and password, or Forgot password? for a reset. If you are new, choose Register now. to switch to Create your account: meet the password rules, accept the legal terms, then Sign Up.",
                  "Klicken Sie im oberen Menü auf Account, um /account zu öffnen. Unter Log in to your account melden Sie sich mit E‑Mail und Passwort an, oder nutzen Sie Forgot password? zum Zurücksetzen. Als Neuling wählen Sie Register now., um zu Create your account zu wechseln: erfüllen Sie die Passwortregeln, akzeptieren Sie die Rechtstexte, dann Sign Up.",
                  "Pulse Account en el menú superior para abrir /account. Use Log in to your account con correo y contraseña, o Forgot password? para restablecer. Si es nuevo, elija Register now. para ir a Create your account: cumpla las reglas de contraseña, acepte los términos y pulse Sign Up.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-login.png"
                    alt={t(
                      "Account: Log in to your account form",
                      "Account: Formular Log in to your account",
                      "Account: formulario Log in to your account",
                    )}
                    className={guideImgLogin}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Sign-in screen: email, password, Log In, and Register now.",
                    "Anmeldebildschirm: E‑Mail, Passwort, Log In und Register now.",
                    "Pantalla de inicio de sesión: correo, contraseña, Log In y Register now.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-signup.png"
                    alt={t(
                      "Account: Create your account registration form",
                      "Account: Registrierungsformular Create your account",
                      "Account: formulario de registro Create your account",
                    )}
                    className={guideImgSignup}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Sign-up screen: password requirements, legal acknowledgement, and Sign Up.",
                    "Registrierung: Passwortanforderungen, rechtliche Zustimmung und Sign Up.",
                    "Registro: requisitos de contraseña, aceptación legal y Sign Up.",
                  )}
                </figcaption>
              </figure>

              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "Membership has three tiers: Bronze, Silver, and Gold. Under Compare membership tiers on the sign-up view, plans are shown side by side. New accounts start on Bronze; upgrading unlocks Silver or Gold limits.",
                  "Die Mitgliedschaft hat drei Stufen: Bronze, Silber und Gold. Unter Compare membership tiers auf der Registrierungsansicht werden die Tarife nebeneinander angezeigt. Neue Konten starten mit Bronze; ein Upgrade schaltet Silber‑ oder Gold‑Limits frei.",
                  "La membresía tiene tres niveles: Bronze, Silver y Gold. En Compare membership tiers de la vista de registro los planes aparecen en paralelo. Las cuentas nuevas empiezan en Bronze; al mejorar se desbloquean límites Silver o Gold.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-membership-tiers.png"
                    alt={t(
                      "Bronze, Silver, and Gold membership comparison cards",
                      "Vergleichskarten der Mitgliedschaft Bronze, Silber und Gold",
                      "Tarjetas de comparación de membresía Bronze, Silver y Gold",
                    )}
                    className={guideImgTiers}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Membership comparison: feature summaries for Bronze, Silver, and Gold.",
                    "Mitgliedschaftsvergleich: Funktionsüberblick für Bronze, Silber und Gold.",
                    "Comparación de planes: resumen de funciones para Bronze, Silver y Gold.",
                  )}
                </figcaption>
              </figure>

              <div className="space-y-3 text-[15px] leading-7 text-slate-700">
                <p>
                  <strong>{t("Bronze:", "Bronze:", "Bronze:")}</strong>{" "}
                  {t(
                    "All new members start here. Up to",
                    "Alle neuen Mitglieder starten hier. Bis zu",
                    "Todas las cuentas nuevas empiezan aquí. Hasta",
                  )}{" "}
                  <strong>{BRONZE_MAX_PROJECTS}</strong>{" "}
                  {t("projects,", "Projekte,", "proyectos,")}{" "}
                  <strong>{BRONZE_MAX_BOREHOLES_PER_PROJECT}</strong>{" "}
                  {t(
                    "borehole IDs per project,",
                    "Bohr‑IDs pro Projekt,",
                    "IDs de perforación por proyecto,",
                  )}{" "}
                  <strong>{BRONZE_MAX_SAMPLES_PER_BOREHOLE}</strong>{" "}
                  {t(
                    "samples per borehole. In each tool’s Report tab, completed Create report → Download PDF actions are limited to",
                    "Proben pro Bohrung. Im Report‑Tab jedes Tools sind abgeschlossene Aktionen Create report → Download PDF begrenzt auf",
                    "muestras por perforación. En la pestaña Report de cada herramienta, las descargas PDF completadas (Create report → Download PDF) están limitadas a",
                  )}{" "}
                  <strong>{BRONZE_MAX_REPORTS_PER_DAY}</strong>{" "}
                  {t(
                    "per calendar day (Europe/Istanbul). Save analyses to the cloud. Analyse with AI in tools is not included. The Projects parameter matrix Generate report (AI engineering report) is Gold only and uses a separate weekly quota—not this daily limit. Further questions in blog research articles are Silver or Gold only.",
                    "pro Kalendertag (Europa/Istanbul). Analysen können in der Cloud gespeichert werden. Analyse with AI in den Tools ist nicht enthalten. Generate report in der Parameter‑Matrix unter Projects (KI‑Ingenieurbericht) nur mit Gold, mit separatem Wochenkontingent — nicht dieses Tageslimit. Further questions in Blog‑Artikeln nur mit Silver oder Gold.",
                    "por día natural (Europa/Estambul). Guarde análisis en la nube. Analyse with AI en herramientas no está incluido. Generate report en la matriz de parámetros de Projects (informe de IA de ingeniería) solo con Gold, con cupo semanal aparte: no cuenta para este límite diario. Further questions en artículos del blog solo con Silver o Gold.",
                  )}
                </p>
                <p>
                  <strong>{t("Silver:", "Silver:", "Silver:")}</strong>{" "}
                  {t(
                    "Unlimited projects and boreholes; unlimited Create report → Download PDF use in tools. Parameter matrix Generate report (AI) is not included — Gold only. Further questions (guided follow-ups) in blog research articles. All Bronze features are included.",
                    "Unbegrenzte Projekte und Bohrungen; unbegrenzte Nutzung von Create report → Download PDF in den Tools. Generate report in der Parameter‑Matrix (KI) ist nicht enthalten — nur Gold. Further questions (geführte Nachfragen) in Blog‑Forschungsartikeln. Alle Bronze‑Funktionen sind enthalten.",
                    "Proyectos y perforaciones ilimitados; uso ilimitado de Create report → Download PDF en herramientas. Generate report en la matriz de parámetros (IA) no está incluido: solo Gold. Further questions (seguimientos guiados) en artículos de investigación del blog. Incluye todas las funciones de Bronze.",
                  )}
                </p>
                <p>
                  <strong>{t("Gold:", "Gold:", "Gold:")}</strong>{" "}
                  {t(
                    "Unlimited AI analysis in profile tools (Analyse with AI). On Projects, parameter matrix Generate report (AI engineering report) is included for Gold with a weekly allowance that may be shown. Unlimited projects and tool PDFs in practice; priority access to new features. All Silver features are included.",
                    "Unbegrenzte KI‑Analyse in Profil‑Tools (Analyse with AI). Unter Projects ist Generate report in der Parameter‑Matrix (KI‑Ingenieurbericht) für Gold enthalten, mit wöchentlichem Kontingent. In der Praxis unbegrenzte Projekte und Tool‑PDFs; vorrangiger Zugang zu neuen Funktionen. Alle Silver‑Funktionen sind enthalten.",
                    "Análisis IA ilimitado en herramientas de perfil (Analyse with AI). En Projects, Generate report en la matriz de parámetros (informe de ingeniería IA) está incluido en Gold con cupo semanal que puede mostrarse. Proyectos y PDF de herramientas ilimitados en la práctica; acceso prioritario a novedades. Incluye todas las funciones de Silver.",
                  )}
                </p>
                <p className="text-slate-600">
                  <strong>{t("Note:", "Hinweis:", "Nota:")}</strong>{" "}
                  {t(
                    "You can browse tools and the blog without signing in; cloud projects, saved analyses, and membership quotas require an account.",
                    "Sie können Tools und den Blog ohne Anmeldung durchsuchen; Cloud‑Projekte, gespeicherte Analysen und Mitgliedschaftskontingente erfordern ein Konto.",
                    "Puede explorar herramientas y el blog sin iniciar sesión; proyectos en la nube, análisis guardados y cupos de membresía requieren cuenta.",
                  )}
                </p>
              </div>
            </section>

            <section id="guide-section-3" className="scroll-mt-20 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {L(
                  "3. Hesap: Bilgi ve abonelik",
                  "3. Account: Information and Subscription",
                  "3. Account: Information und Abonnement",
                  "3. Account: información y suscripción",
                )}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "After you sign in, your account unlocks features based on your membership tier. The Account control in the top menu uses tier colours (Bronze, Silver, or Gold); when signed in it also shows a small green checkmark. The Projects link appears next to Account.",
                  "Nach der Anmeldung schaltet Ihr Konto Funktionen je nach Mitgliedschaftsstufe frei. Die Account‑Schaltfläche im oberen Menü nutzt Tier‑Farben (Bronze, Silber oder Gold); bei angemeldetem Status erscheint ein kleines grünes Häkchen. Neben Account erscheint der Link Projects.",
                  "Tras iniciar sesión, su cuenta desbloquea funciones según el nivel. El control Account en la barra superior usa colores de nivel (Bronze, Silver o Gold); al estar conectado muestra una marca verde. Junto a Account aparece el enlace Projects.",
                )}
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "On /account, the information card border uses the same tier palette. You get Subscription (current plan and comparison), Personal Information (email display and password change), and Logout.",
                  "Auf /account nutzt der Rahmen der Informationskarte dieselbe Tier‑Palette. Sie erhalten Subscription (aktueller Plan und Vergleich), Personal Information (E‑Mail‑Anzeige und Passwortänderung) und Logout.",
                  "En /account el borde de la tarjeta de información usa la misma paleta de nivel. Hay Subscription (plan actual y comparación), Personal Information (correo y cambio de contraseña) y Logout.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-header-tier.png"
                    alt={t(
                      "Top menu: Account button styled by membership tier",
                      "Oberes Menü: Account‑Button farbig nach Mitgliedschaftsstufe",
                      "Menú superior: botón Account con estilo según nivel de membresía",
                    )}
                    className={guideImgAccountHeader}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Example: Gold membership — Account button and Projects in the header.",
                    "Beispiel: Gold‑Mitgliedschaft — Account‑Button und Projects in der Kopfzeile.",
                    "Ejemplo: membresía Gold — botón Account y Projects en la cabecera.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-information-panel.png"
                    alt={t(
                      "Account page: Subscription tab and tier cards",
                      "Account‑Seite: Tab Subscription und Tier‑Karten",
                      "Página Account: pestaña Subscription y tarjetas de nivel",
                    )}
                    className={guideImgAccountDashboard}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Account screen: Subscription, Personal Information, Logout; border matches tier.",
                    "Account‑Ansicht: Subscription, Personal Information, Logout; Rahmenfarbe entspricht dem Tier.",
                    "Pantalla Account: Subscription, Personal Information, Logout; el borde coincide con el nivel.",
                  )}
                </figcaption>
              </figure>
            </section>
          </>
        )}

        <section id="guide-section-4" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L("4. Proje: Ekleme ve Düzenleme", "4. Project: Add and Edit", "4. Project: Hinzufügen und Bearbeiten", "4. Project: Añadir y editar")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Üye girişi yaptıktan sonra üst menüde <strong>Projects</strong> bağlantısı görünür.{" "}
                <code className="rounded bg-slate-100 px-1">/projects</code> sayfasında bulut projelerinizi oluşturur,
                seçer, düzenler veya kaldırırsınız; bu ekran proje yaşam döngüsünün merkezidir. Üyelik planınıza göre
                en fazla <strong>{MAX_PROJECTS_PER_USER} proje</strong> tanımlayabilirsiniz; sınıra ulaşıldığında yeni
                proje oluşturma kapatılır.
              </>
            ) : (
              <>
                {t(
                  "After you sign in, the Projects link appears in the top menu.",
                  "Nach der Anmeldung erscheint der Link Projects oben in der Menüleiste.",
                  "Tras iniciar sesión, el enlace Projects aparece en la barra superior.",
                )}{" "}
                <code className="rounded bg-slate-100 px-1">/projects</code>{" "}
                {t(
                  "is where you create, select, edit, or remove cloud projects—the main hub for project management. Depending on your plan you can have up to",
                  "ist der Ort, an dem Sie Cloud‑Projekte anlegen, auswählen, bearbeiten oder entfernen—das zentrale Projekt‑Hub. Je nach Tarif sind bis zu",
                  "es donde crea, selecciona, edita o elimina proyectos en la nube: el centro de gestión. Según su plan, puede tener hasta",
                )}{" "}
                <strong>{MAX_PROJECTS_PER_USER}</strong>{" "}
                {t(
                  "projects; when the limit is reached, creating new projects is disabled.",
                  "Projekte möglich; ist das Limit erreicht, ist „Neues Projekt“ deaktiviert.",
                  "proyectos; al alcanzar el límite, no podrá crear proyectos nuevos.",
                )}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Her proje altında <strong>Boreholes</strong> (sondaj kayıtları), <strong>Saved analyses</strong> (araçlardan
                kaydedilen analizler) ve parametre matrisi kartı (ekranda <strong>Integrated Parameter Matrix</strong> başlığı)
                yer alır; bu kartlar üzerinden ilgili ekranlara geçebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "Each project includes Boreholes, Saved analyses, and a parameter matrix card (on-screen title: Integrated Parameter Matrix)—open the cards to work with borehole data, saved tool runs, and the merged parameter table.",
                  "Jedes Projekt enthält Boreholes, Saved analyses und eine Parameter‑Matrix‑Karte (Anzeigename: Integrated Parameter Matrix) — öffnen Sie die Karten für Bohrdaten, gespeicherte Tool‑Läufe und die zusammengeführte Tabelle.",
                  "Cada proyecto incluye Boreholes, Saved analyses y una tarjeta de matriz de parámetros (título en pantalla: Integrated Parameter Matrix): abra las tarjetas para datos de sondeos, ejecuciones guardadas y la tabla fusionada.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/projects-empty.png"
                alt={
                  lang === "tr"
                    ? "Projects: henüz proje yokken Active Project ve New Project"
                    : t(
                        "Projects: Active Project dropdown when no projects exist yet",
                        "Projects: Active Project‑Auswahl, wenn noch keine Projekte existieren",
                        "Projects: lista Active Project cuando aún no hay proyectos",
                      )
                }
                className={guideImgProjects}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Başlangıç: Active Project listesi boşken New Project ile ilk projenizi oluşturabilirsiniz."
                : t(
                    "Starting out: use New Project when the Active Project list is empty.",
                    "Einstieg: New Project nutzen, wenn die Active Project‑Liste leer ist.",
                    "Al empezar: use New Project cuando la lista Active Project esté vacía.",
                  )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/projects-active.png"
                alt={
                  lang === "tr"
                    ? "Projects: seçili proje ve Boreholes / Saved analyses / parametre matrisi kartları"
                    : t(
                        "Projects: selected project with Boreholes, Saved analyses, and parameter matrix cards",
                        "Projects: ausgewähltes Projekt mit Karten Boreholes, Saved analyses und Parameter‑Matrix",
                        "Projects: proyecto seleccionado con tarjetas Boreholes, Saved analyses y matriz de parámetros",
                      )
                }
                className={guideImgProjects}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Proje seçildiğinde alt kartlardan Boreholes, Saved analyses ve parametre matrisi ekranlarına geçilir."
                : t(
                    "With a project selected, use the cards to open Boreholes, Saved analyses, and the parameter matrix.",
                    "Mit gewähltem Projekt öffnen Sie über die Karten Boreholes, Saved analyses und die Parameter‑Matrix.",
                    "Con un proyecto seleccionado, use las tarjetas para abrir Boreholes, Saved analyses y la matriz de parámetros.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-5" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L(
              "5. Sondajlar (Boreholes): Ekleme ve Düzenleme",
              "5. Boreholes: Add and Edit",
              "5. Boreholes: Hinzufügen und Bearbeiten",
              "5. Boreholes: Añadir y editar",
            )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Proje altında <strong>Boreholes</strong> görünümünde sondaj tanımlayabilir, her sondaja ait temel verileri
                (kimlik, GWT, birim hacim ağırlığı vb.) girebilir ve örnek satırlarını yönetebilirsiniz.{" "}
                <strong>Existing Borehole ID</strong> ile aynı sondaja yeni derinlikte örnek ekledikçe, o sondaj için
                kayıtlı alanlar projeden otomatik doldurulur; yalnızca yeni örneğe özgü değerleri (ör. derinlik, N, PI)
                girmeniz yeterlidir.
              </>
            ) : (
              <>
                {t(
                  "Under each project, open Boreholes to define boreholes and enter their key data (ID, GWT, unit weight, and sample rows). When you add another sample under an existing borehole ID, saved fields for that borehole load from the project automatically—you mainly enter the new sample-specific values (depth, N, PI, and so on).",
                  "Unter jedem Projekt öffnen Sie Boreholes, um Bohrungen anzulegen und Stammdaten (ID, GWT, Wichte, Probenzeilen) einzutragen. Wenn Sie unter einer bestehenden Bohr‑ID eine weitere Probe hinzufügen, werden gespeicherte Felder automatisch aus dem Projekt geladen — Sie tragen vor allem probenspezifische Werte (Tiefe, N, PI usw.) ein.",
                  "En cada proyecto abra Boreholes para definir sondeos y sus datos (ID, GWT, peso unitario y filas de muestra). Si añade otra muestra bajo un ID existente, los campos guardados se cargan del proyecto; usted introduce sobre todo valores de la nueva muestra (profundidad, N, PI, etc.).",
                )}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Add borehole sample</strong> bölümünde <strong>New Borehole ID</strong> yeni bir sondaj adı
                tanımlar; <strong>Existing Borehole ID</strong> aynı sondaja farklı derinlikte ek örnek ekler. Örnek
                derinliği, GWT, birim hacim ağırlığı, zemin davranışı ve N değerleri burada tutulur. Projede{" "}
                <strong>{MAX_BOREHOLES_PER_PROJECT} farklı</strong> sondaj kimliği sınırına ulaşıldığında yalnızca mevcut
                kimliklere örnek ekleyebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "In the Add borehole sample section, New Borehole ID defines a new borehole name; Existing Borehole ID adds another sample depth under the same borehole. Sample depth, GWT, unit weight, soil behaviour and N values are stored here.",
                  "Im Bereich Add borehole sample legt New Borehole ID einen neuen Bohrnamen fest; Existing Borehole ID fügt unter derselben Bohrung eine weitere Probentiefe hinzu. Probentiefe, GWT, Wichte, Bodenverhalten und N‑Werte werden hier gespeichert.",
                  "En Add borehole sample, New Borehole ID define un nuevo sondeo; Existing Borehole ID añade otra profundidad de muestra bajo el mismo sondeo. Aquí se guardan profundidad, GWT, peso unitario, comportamiento del suelo y valores N.",
                )}{" "}
                {t(
                  "Once you reach",
                  "Sobald Sie",
                  "Cuando alcance",
                )}{" "}
                <strong>
                  {MAX_BOREHOLES_PER_PROJECT} {t("distinct", "verschiedene", "distintos")}
                </strong>{" "}
                {t(
                  "borehole IDs per project, you can only add samples to existing IDs.",
                  "Bohr‑IDs pro Projekt erreicht haben, können Sie nur noch Proben zu bestehenden Bohrungen hinzufügen.",
                  "identificadores de perforación distintos por proyecto, solo podrá añadir muestras a sondeos ya existentes.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/boreholes-workspace.png"
                alt={
                  lang === "tr"
                    ? "Boreholes: tablo ve Add borehole sample formu"
                    : t(
                        "Boreholes: data table and Add borehole sample form",
                        "Boreholes: Datentabelle und Formular Add borehole sample",
                        "Boreholes: tabla de datos y formulario Add borehole sample",
                      )
                }
                className={guideImgBoreholes}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Boreholes: örnek tablosu ve Add borehole sample formu. New / Existing Borehole ID ile yeni sondaj veya aynı sondaja ek derinlik eklenebilir."
                : t(
                    "Boreholes: sample table and Add borehole sample form. Use New / Existing Borehole ID to add a new borehole or another depth on an existing one.",
                    "Boreholes: Probentabelle und Formular Add borehole sample. Mit New / Existing Borehole ID neue Bohrung oder weitere Tiefe anlegen.",
                    "Boreholes: tabla de muestras y formulario Add borehole sample. Use New / Existing Borehole ID para un sondeo nuevo u otra profundidad.",
                  )}
            </figcaption>
          </figure>

          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Araç sayfalarında (<strong>/tools/…</strong>) projedeki sondaj verisini kullanmak için üstteki{" "}
                <strong>Projects and Boreholes</strong> panelinden proje ve sondajları seçip{" "}
                <strong>Use in Tools</strong> düğmesine basın; örnekler ilgili araçlarda profile satırlarına otomatik
                dağıtılır. Projeyle bağlantılı otomatik doldurmayı kapatıp elle girmek için{" "}
                <strong>Clear</strong> kullanın; böylece araç içinde yalnızca manuel girdiyle devam edebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "On tool pages (/tools/…), open Projects and Boreholes in the header, pick your project and boreholes, then click Use in Tools—samples are pushed into the tool’s profile rows automatically. Click Clear to detach project data and switch back to manual entry inside the tool.",
                  "Auf Tool‑Seiten (/tools/…) öffnen Sie Projects and Boreholes in der Kopfzeile, wählen Sie Projekt und Bohrungen und klicken Use in Tools — Proben werden automatisch in die Profilzeilen übernommen. Mit Clear lösen Sie die Projektdaten und kehren zur manuellen Eingabe zurück.",
                  "En páginas de herramientas (/tools/…) abra Projects and Boreholes en la cabecera, elija proyecto y sondeos y pulse Use in Tools: las muestras pasan a las filas del perfil. Con Clear desvincula los datos del proyecto y vuelve a la entrada manual.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex justify-center bg-gradient-to-b from-slate-50 to-white px-3 py-4 sm:px-5 sm:py-6">
              <div className="relative w-full max-w-5xl">
                <img
                  src="/images/guide/tools-header-projects-boreholes.jpg"
                  alt={
                    lang === "tr"
                      ? "Geotechnical Tools sayfası üst kısmı; sağ üstte Projects and Boreholes"
                      : t(
                          "Geotechnical Tools page header with Projects and Boreholes control",
                          "Geotechnical Tools: Kopfzeile mit Steuerung Projects and Boreholes",
                          "Geotechnical Tools: cabecera con control Projects and Boreholes",
                        )
                  }
                  className={guideImgToolsHeader}
                />
                {/* Highlight: Projects and Boreholes button (upper-right), tuned for 1024×197 crop */}
                <div
                  className="pointer-events-none absolute rounded-md border-[3px] border-teal-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_0_12px_rgba(20,184,166,0.55)] sm:border-4"
                  style={{
                    top: "5%",
                    right: "1.5%",
                    width: "min(23%, 15.5rem)",
                    height: "22%",
                  }}
                  aria-hidden
                />
              </div>
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Üst sağdaki <strong>Projects and Boreholes</strong> kutusu (teal çerçeve) araç sayfalarında proje ve
                  sondaj seçim panelini açar.
                </>
              ) : (
                <>
                  {t(
                    "The Projects and Boreholes control in the upper right (teal frame) opens the project and borehole picker on tool pages.",
                    "Die Steuerung Projects and Boreholes oben rechts (türkiser Rahmen) öffnet die Projekt‑ und Bohrungsauswahl auf Tool‑Seiten.",
                    "El control Projects and Boreholes arriba a la derecha (marco turquesa) abre el selector de proyecto y sondeos en las herramientas.",
                  )}
                </>
              )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-3 bg-slate-50/80 p-3 md:grid-cols-2">
              <img
                src="/images/guide/boreholes-tools-panel-use-in-tools.png"
                alt={
                  lang === "tr"
                    ? "Projects and Boreholes: Use in Tools ile seçim aktif"
                    : t(
                        "Projects and Boreholes: Use in Tools with active selection",
                        "Projects and Boreholes: Use in Tools mit aktiver Auswahl",
                        "Projects and Boreholes: Use in Tools con selección activa",
                      )
                }
                className="block max-h-[min(22rem,48vh)] w-full rounded-lg border border-slate-200 bg-white object-contain p-1 sm:max-h-[min(26rem,52vh)]"
              />
              <img
                src="/images/guide/boreholes-tools-panel-clear.png"
                alt={
                  lang === "tr"
                    ? "Projects and Boreholes: Clear sonrası manuel girişe dönüş"
                    : t(
                        "Projects and Boreholes: after Clear, manual entry",
                        "Projects and Boreholes: nach Clear, manuelle Eingabe",
                        "Projects and Boreholes: tras Clear, entrada manual",
                      )
                }
                className="block max-h-[min(22rem,48vh)] w-full rounded-lg border border-slate-200 bg-white object-contain p-1 sm:max-h-[min(26rem,52vh)]"
              />
            </div>
            <figcaption className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <p>
                {lang === "tr" ? (
                  <>
                    <strong>Sol:</strong> Use in Tools sonrası örneklerin araçlarda aktif olduğu durum.{" "}
                    <strong>Sağ:</strong> Clear ile seçimin kaldırıldığı, manuel girişe geçilebilecek durum.
                  </>
                ) : (
                  <>
                    {t(
                      "Left: samples active in tools after Use in Tools. Right: selection cleared with Clear—switch to manual input.",
                      "Links: Proben nach Use in Tools aktiv. Rechts: Auswahl mit Clear gelöscht — Wechsel zur manuellen Eingabe.",
                      "Izquierda: muestras activas tras Use in Tools. Derecha: selección borrada con Clear — pase a entrada manual.",
                    )}
                  </>
                )}
              </p>
            </figcaption>
          </figure>
        </section>

        <section className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {lang === "tr"
              ? "Proje verisiyle veya proje olmadan araç kullanımı"
              : t(
                  "Using tools with/without project data",
                  "Tools mit und ohne Projektdaten",
                  "Uso de herramientas con y sin datos del proyecto",
                )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Proje verisi olmadan:</strong> Giriş yapmadan veya üst menüden proje seçmeden araçtaki sayısal
                alanları doğrudan doldurabilirsiniz; sonuçlar yine hesaplanır. Profile araçlarında satırları elle
                girersiniz; header’da proje yoksa veriler projeye bağlanmaz ve otomatik içe aktarım yapılmaz.{" "}
                <strong>Yol:</strong> <code className="rounded bg-slate-100 px-1">/tools</code> → istediğiniz araç
                (manuel).
              </>
            ) : (
              <>
                <strong>
                  {t("Without project data:", "Ohne Projektdaten:", "Sin datos del proyecto:")}
                </strong>{" "}
                {t(
                  "You can fill numeric fields directly without signing in or selecting a project in the header; results are still computed. In profile tools you enter rows manually—if no project is selected, values are not linked to a project and nothing is auto-imported.",
                  "Sie können numerische Felder direkt ausfüllen, ohne sich anzumelden oder im Header ein Projekt zu wählen; Ergebnisse werden dennoch berechnet. In Profil‑Tools geben Sie Zeilen manuell ein—ohne Projekt werden Werte nicht mit einem Projekt verknüpft und es erfolgt kein Auto‑Import.",
                  "Puede rellenar los campos numéricos sin iniciar sesión ni elegir un proyecto en el encabezado; los resultados se calculan igual. En herramientas de perfil introduce filas manualmente: sin proyecto, los valores no se vinculan y no hay importación automática.",
                )}{" "}
                <strong>{t("Path:", "Pfad:", "Ruta:")}</strong>{" "}
                <code className="rounded bg-slate-100 px-1">/tools</code> →{" "}
                {t("any tool (manual).", "beliebiges Tool (manuell).", "cualquier herramienta (manual).")}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Proje verisiyle:</strong> Üst menüden proje ve sondaj seçin. Profile araçlarında satırlara{" "}
                <strong>borehole ID</strong> ve <strong>sample depth</strong> proje listesiyle eşleşir. Projects altında
                tanımlı zemin davranışı, bazı araçlarda satırın kullanılıp kullanılmayacağını etkileyebilir (kısıtlı
                satırlar gri görünebilir).
              </>
            ) : (
              <>
                <strong>{t("With project data:", "Mit Projektdaten:", "Con datos del proyecto:")}</strong>{" "}
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
              src="/images/guide/tools-project-profile-spt-example.png"
              alt={
                lang === "tr"
                  ? "Soil Profile Plot: SPT düzeltmeleri ve projeden gelen GWT / birim hacim ağırlığı"
                  : t(
                      "Soil Profile Plot: SPT corrections with project-linked GWT and unit weight",
                      "Soil Profile Plot: SPT‑Korrekturen mit projektbezogenem GWT und Wichte",
                      "Soil Profile Plot: correcciones SPT con GWT y peso unitario del proyecto",
                    )
              }
              className="block h-auto w-full object-contain object-top"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Örnek (SPT düzeltmeleri): Yer suyu ve birim hacim ağırlığı{" "}
                  <strong>Account → Projects</strong> üzerinden, satır bazında sondaj ve derinlikle eşleşerek gelir;{" "}
                  N<sub>60</sub>, C<sub>N</sub>, (N<sub>1</sub>)<sub>60</sub> vb. sonuçlar profile tablosunda hesaplanır.
                </>
              ) : (
                <>
                  {t(
                    "Example (SPT corrections): GWT and bulk unit weight are pulled from Account → Projects per borehole and depth; corrected N-values (e.g., N60, CN, (N1)60) are computed in the profile table.",
                    "Beispiel (SPT‑Korrekturen): GWT und Wichte kommen aus Account → Projects pro Bohrung/Tiefe; korrigierte N‑Werte (z. B. N60, CN, (N1)60) werden in der Profiltabelle berechnet.",
                    "Ejemplo (correcciones SPT): el nivel freático y el peso unitario provienen de Account → Projects por perforación y profundidad; los N corregidos (p. ej. N60, CN, (N1)60) se calculan en la tabla de perfil.",
                  )}
                </>
              )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/tools-profile-spt-manual-example.png"
              alt={
                lang === "tr"
                  ? "Soil Profile Plot: manuel GWT, BHA ve Add BH ile SPT düzeltmeleri"
                  : t(
                      "Soil Profile Plot: SPT corrections with manual GWT, BHA, and Add BH",
                      "Soil Profile Plot: SPT‑Korrekturen mit manuellem GWT, BHA und Add BH",
                      "Soil Profile Plot: correcciones SPT con GWT, BHA manuales y Add BH",
                    )
              }
              className="block h-auto w-full object-contain object-top"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Örnek: Üst menüden proje seçilmediğinde veya alanları elle girdiğinizde GWT ve birim hacim ağırlığı doğrudan
                  araçta tanımlanır; satırda <strong>Add BH</strong> ile sondaj eklenir, N ve derinlikler manuel girilir,{" "}
                  N<sub>60</sub> ve (N<sub>1</sub>)<sub>60</sub> tabloda hesaplanır.
                </>
              ) : (
                <>
                  {t(
                    "Example: without a project in the header—or when you type values yourself—GWT and bulk unit weight are set in the tool; use Add BH on the row, enter N and depths manually, and corrected N60 / (N1)60 are computed in the table.",
                    "Beispiel: ohne Projekt im Header oder bei manueller Eingabe werden GWT und Wichte im Tool gesetzt; in der Zeile Add BH nutzen, N und Tiefen manuell eintragen – N60 / (N1)60 werden in der Tabelle berechnet.",
                    "Ejemplo: sin proyecto en el encabezado o con valores propios, el GWT y el peso unitario se definen en la herramienta; use Add BH en la fila, introduzca N y profundidades manualmente y se calculan N60 / (N1)60 en la tabla.",
                  )}
                </>
              )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-6" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L("6. Araçların kullanımı", "6. Use of Tools", "6. Nutzung der Tools", "6. Uso de las herramientas")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Sitede aktif olarak kullanıma açık olan araçlar iki ana kategoriye ayrılmıştır:{" "}
                <strong>Site Characterisation Tools</strong> ve <strong>Geotechnical Analysis Tools</strong>. Aşağıdaki
                görselde bu iki grup, sayfanın altındaki kartlar üzerinde renkli çerçevelerle gösterilmiştir.
              </>
            ) : (
              <>
                {t(
                  "Tools available on the site are grouped into two main categories: Site Characterisation Tools and Geotechnical Analysis Tools. In the screenshot below, each group is highlighted on its card at the bottom of the page.",
                  "Die auf der Website verfügbaren Tools sind in zwei Hauptkategorien unterteilt: Site Characterisation Tools und Geotechnical Analysis Tools. Im folgenden Screenshot ist jede Gruppe auf der jeweiligen Karte am unteren Rand der Seite markiert.",
                  "Las herramientas disponibles se agrupan en dos categorías principales: Site Characterisation Tools y Geotechnical Analysis Tools. En la captura siguiente, cada grupo aparece resaltado en su tarjeta en la parte inferior de la página.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex justify-center bg-gradient-to-b from-slate-50 to-white px-3 py-4 sm:px-5 sm:py-6">
              <div className="relative w-full max-w-5xl">
                <img
                  src="/images/guide/tools-landing-two-categories.jpg"
                  alt={
                    lang === "tr"
                      ? "Geotechnical Tools: Site Characterisation ve Geotechnical Analysis kartları"
                      : t(
                          "Geotechnical Tools landing: two category cards",
                          "Geotechnical Tools: zwei Kategorie‑Karten",
                          "Geotechnical Tools: dos tarjetas de categoría",
                        )
                  }
                  className={guideImgToolsLandingCategories}
                />
                {/* ~1024×193 crop: left / right category cards */}
                <div
                  className="pointer-events-none absolute rounded-lg border-[3px] border-teal-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_0_12px_rgba(20,184,166,0.45)] sm:border-4"
                  style={{ top: "53%", left: "2%", width: "46.5%", height: "44%" }}
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute rounded-lg border-[3px] border-indigo-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_0_12px_rgba(99,102,241,0.45)] sm:border-4"
                  style={{ top: "53%", right: "2%", width: "46.5%", height: "44%" }}
                  aria-hidden
                />
              </div>
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  <strong>Teal çerçeve:</strong> Site Characterisation Tools. <strong>İndigo çerçeve:</strong> Geotechnical
                  Analysis Tools.
                </>
              ) : (
                <>
                  {t(
                    "Teal frame: Site Characterisation Tools. Indigo frame: Geotechnical Analysis Tools.",
                    "Türkiser Rahmen: Site Characterisation Tools. Indigo‑Rahmen: Geotechnical Analysis Tools.",
                    "Marco turquesa: Site Characterisation Tools. Marco índigo: Geotechnical Analysis Tools.",
                  )}
                </>
              )}
            </figcaption>
          </figure>

          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Her araçta üst şeritte dört sekme bulunur. Aşağıdaki görselde örnek bir sekme çubuğu; ardından her
                başlığın ne işe yaradığı kısaca listelenmiştir.
              </>
            ) : (
              <>
                {t(
                  "Each tool has four tabs in the header strip. The screenshot below shows a typical tab bar, followed by a short description of each tab.",
                  "Jedes Tool hat vier Registerkarten in der oberen Leiste. Der folgende Screenshot zeigt eine typische Tab‑Leiste; danach folgt eine kurze Beschreibung jeder Karte.",
                  "Cada herramienta tiene cuatro pestañas en la barra superior. La captura siguiente muestra una barra típica; después se resume brevemente cada pestaña.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/tool-interface-four-tabs.png"
                alt={
                  lang === "tr"
                    ? "Tool üst sekmeleri: Calculation, Soil Profile Plot, Report, Information"
                    : t(
                        "Tool tabs: Calculation, Soil Profile Plot, Report, Information",
                        "Tool‑Tabs: Calculation, Soil Profile Plot, Report, Information",
                        "Pestañas: Calculation, Soil Profile Plot, Report, Information",
                      )
                }
                className={guideImgToolTabs}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr" ? (
                <>
                  Örnek araç üst çubuğu: <strong>Soil Profile Plot</strong> bu görüntüde aktif sekmedir.
                </>
              ) : (
                <>
                  {t(
                    "Example tool header strip; Soil Profile Plot is the active tab in this image.",
                    "Beispiel‑Tab‑Leiste; Soil Profile Plot ist hier aktiv.",
                    "Barra de pestañas de ejemplo; Soil Profile Plot está activa en esta imagen.",
                  )}
                </>
              )}
            </figcaption>
          </figure>

          <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <li>
                  <strong>Calculation</strong> — Sayısal girdi alanları ve anlık hesap: ilgili parametreleri girersiniz;
                  araç tanımlı formüllere göre sonucu (ara değerlerle birlikte) üretir. Tek seferlik “hesap makinesi”
                  kullanımı buradadır.
                </li>
                <li>
                  <strong>Soil Profile Plot</strong> — Örnek satırları (elle veya projeden) derinlik / profil ekseninde
                  işler; zemin modeline göre parametreleri hesaplar ve sonuçları grafik olarak gösterir. Profil
                  görünümünün ana ekranıdır.
                </li>
                <li>
                  <strong>Report</strong> — Hesaplanmış örnekler ve araç çıktılarından rapor oluşturma / dışa aktarma
                  (ör. yazdırılabilir özet). Hangi satırların rapora dahil edileceğini buradan yönetirsiniz.
                </li>
                <li>
                  <strong>Information</strong> — Bu araçta kullanılan semboller, varsayımlar, kullanılan denklemler ve
                  akademik / standart kaynakça; referansları incelemek için salt okunur bilgi sekmesidir.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Calculation</strong> —{" "}
                  {t(
                    "Numeric inputs and on-the-fly computation: enter the relevant parameters and the tool evaluates the defined equations and shows the result (and intermediate values where applicable). This is the quick “calculator” workflow.",
                    "Numerische Eingaben und Live‑Berechnung: Parameter eingeben, das Tool wertet die definierten Gleichungen aus und zeigt das Ergebnis (ggf. Zwischenwerte). Das ist der schnelle „Taschenrechner“-Workflow.",
                    "Entradas numéricas y cálculo al vuelo: introduzca los parámetros y la herramienta aplica las ecuaciones definidas y muestra el resultado (y valores intermedios si aplica). Es el flujo tipo “calculadora”.",
                  )}
                </li>
                <li>
                  <strong>Soil Profile Plot</strong> —{" "}
                  {t(
                    "Works with sample rows (manual or from the project) along depth / profile axes, computes parameters for the soil model, and plots the outcome. This is the main profile and chart view.",
                    "Arbeitet mit Probenzeilen (manuell oder aus dem Projekt) über die Tiefe/Profilachse, berechnet Parameter für das Bodenmodell und stellt das Ergebnis grafisch dar. Das ist die Hauptansicht für Profile und Diagramme.",
                    "Trabaja con filas de muestra (manual o del proyecto) a lo largo del eje de profundidad/perfil, calcula parámetros del modelo de suelo y muestra el resultado en gráficos. Es la vista principal de perfil.",
                  )}
                </li>
                <li>
                  <strong>Report</strong> —{" "}
                  {t(
                    "Build or export a report from calculated samples and tool outputs (e.g. printable summary). You choose which rows and results to include.",
                    "Berichte aus berechneten Proben und Tool‑Ausgaben erstellen/exportieren (z. B. druckfähige Zusammenfassung). Sie wählen, welche Zeilen und Ergebnisse einfließen.",
                    "Generar o exportar un informe a partir de muestras calculadas y salidas de la herramienta (p. ej. resumen imprimible). Usted elige qué filas y resultados incluir.",
                  )}
                </li>
                <li>
                  <strong>Information</strong> —{" "}
                  {t(
                    "Read-only reference: notation, assumptions, equations used in the tool, and academic / standard citations.",
                    "Nur‑Lese‑Referenz: Notation, Annahmen, verwendete Gleichungen sowie akademische/Norm‑Literatur.",
                    "Referencia de solo lectura: notación, supuestos, ecuaciones usadas en la herramienta y citas académicas/normativas.",
                  )}
                </li>
              </>
            )}
          </ul>
        </section>

        <section id="guide-section-7" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L("7. Rapor", "7. Reports", "7. Berichte", "7. Informes")}
          </h2>

          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Rapor sekmesinde her araç için ayrıntılı bir rapor şablonu bulunur. <strong>Create report</strong> ile
                literatürden alınmış ve yorumlanmış giriş metni ile ilgili formül ve şekiller yer alır; girilen verilere
                göre elde edilen <strong>parametre tablosu</strong> ve <strong>Soil Profile Plot</strong> çıktıları rapora
                otomatik işlenir. Raporun sonunda <strong>Harvard</strong> referans sistemine uygun akademik kaynakça
                bulunur.
              </>
            ) : (
              <>
                {t(
                  "The Report tab provides a detailed template for each tool. Create report includes literature-based introductions and commentary, plus relevant equations and figures; the parameter table and Soil Profile Plot from your inputs are embedded automatically. Academic references at the end follow Harvard-style citations.",
                  "Der Report‑Tab enthält eine ausführliche Vorlage pro Tool. Create report umfasst einleitende Literaturtexte mit Kommentar sowie Gleichungen und Abbildungen; Parametertabelle und Soil Profile Plot aus Ihren Eingaben werden automatisch eingefügt. Am Ende folgen akademische Quellenangaben im Harvard‑Stil.",
                  "La pestaña Report ofrece una plantilla detallada por herramienta. Create report incluye introducciones basadas en la literatura con comentarios, ecuaciones y figuras; la tabla de parámetros y el Soil Profile Plot calculados a partir de sus datos se insertan automáticamente. Al final figuran referencias académicas estilo Harvard.",
                )}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Bronze</strong> üyelikte, bu sekmede tamamlanan her{" "}
                <strong>Create report → Download PDF</strong> işlemi günlük kotaya girer: Avrupa/İstanbul takvim günü
                başına en fazla <strong>{BRONZE_MAX_REPORTS_PER_DAY}</strong> kez. <strong>Silver</strong> ve{" "}
                <strong>Gold</strong>’da bu günlük tavan yoktur. Projects ekranındaki parametre matrisi{" "}
                <strong>Generate report</strong> (yapay zekâ mühendislik raporu) yalnızca <strong>Gold</strong> ile açılır ve
                bu günlük kotadan sayılmaz.
              </>
            ) : (
              <>
                {t(
                  "Bronze: each completed Create report → Download PDF from this tab counts toward a daily allowance of up to",
                  "Bronze: Jede abgeschlossene Aktion Create report → Download PDF in diesem Tab zählt auf ein Tageskontingent von bis zu",
                  "Bronze: cada descarga PDF completada (Create report → Download PDF) en esta pestaña cuenta para un máximo de",
                )}{" "}
                <strong>{BRONZE_MAX_REPORTS_PER_DAY}</strong>{" "}
                {t(
                  "uses per calendar day (Europe/Istanbul). Silver and Gold have no daily cap on that. The Projects parameter matrix Generate report (AI engineering report) is Gold only and does not use this daily allowance.",
                  "pro Kalendertag (Europa/Istanbul). Silver und Gold haben dafür kein Tageslimit. Generate report in der Parameter‑Matrix unter Projects (KI‑Ingenieurbericht) ist nur für Gold und nutzt nicht dieses Tageskontingent.",
                  "usos por día natural (Europa/Estambul). Silver y Gold no tienen tope diario para eso. Generate report en la matriz de parámetros de Projects (informe IA de ingeniería) solo Gold y no usa este cupo diario.",
                )}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                <strong>Gold</strong> üyelikte etkinleşen{" "}
                <span className="font-semibold text-[#c9a227]">Analyse with AI</span>, özel olarak eğitilmiş ve sınanmış
                mühendislik <strong>prompt</strong> çerçevesinde veriyi yorumlar ve sayfada özet çıktı üretir.
              </>
            ) : (
              <>
                {t("For Gold members, ", "Für Gold‑Mitglieder ", "Para miembros Gold, ")}
                <span className="font-semibold text-[#c9a227]">Analyse with AI</span>
                {t(
                  " runs a tested engineering prompt to interpret the data and show a concise on-page summary.",
                  " interpretiert die Daten mit einem geprüften Engineering‑Prompt und zeigt eine kurze Zusammenfassung auf der Seite.",
                  " ejecuta un prompt de ingeniería probado para interpretar los datos y muestra un resumen breve en la página.",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/report-tab-overview.png"
                alt={
                  lang === "tr"
                    ? "Report sekmesi: Create report, altın Analyse with AI ve REPORT TYPES bilgi kutusu"
                    : t(
                        "Report tab: Create report, gold Analyse with AI, and REPORT TYPES info panel",
                        "Report: Create report, goldfarbenes Analyse with AI und REPORT TYPES‑Infokasten",
                        "Pestaña Report: Create report, Analyse with AI en dorado y panel REPORT TYPES",
                      )
                }
                className={guideImgReportTab}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Create report taslak önizlemeyi açar; Download PDF uygun hesaplarda Soil Profile Plot hazır olduğunda kullanılabilir (Bronze’da günlük kota). Altın Analyse with AI, tablo ve profil plotuna hızlı yapay zekâ yorumu üretir. REPORT TYPES kutusu her seçeneğin kapsamını özetler."
                : t(
                    "Create report opens the on-page draft; Download PDF is available for eligible accounts once Soil Profile Plot is ready (Bronze has a daily allowance). Gold Analyse with AI gives a quick AI read of tabulated values and the profile plot. REPORT TYPES summarizes what each option includes.",
                    "Create report öffnet die Seitenvorschau; Download PDF steht bei berechtigten Konten zur Verfügung, sobald Soil Profile Plot vorliegt (Bronze hat ein Tageskontingent). Gold Analyse with AI liefert eine schnelle KI‑Auswertung von Tabellen und Profilplot. REPORT TYPES fasst den Umfang jeder Option zusammen.",
                    "Create report abre el borrador en la página; Download PDF está disponible para cuentas elegibles cuando Soil Profile Plot esté listo (Bronze tiene cupo diario). Analyse with AI (dorado) ofrece una lectura rápida con IA de tablas y el gráfico de perfil. REPORT TYPES resume el alcance de cada opción.",
                  )}
            </figcaption>
          </figure>

          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>Rapor çıktısı PDF formatında indirmeye uygun biçimde düzenlenir.</>
            ) : (
              <>
                {t(
                  "The report layout is designed for PDF download.",
                  "Das Reportlayout ist für den PDF‑Download ausgelegt.",
                  "El diseño del informe está pensado para descargarlo en PDF.",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/guide-report-download-close.png"
              alt={
                lang === "tr"
                  ? "Download Report ve Close Report düğmeleri"
                  : t(
                      "Download Report and Close Report buttons",
                      "Schaltflächen Download Report und Close Report",
                      "Botones Download Report y Close Report",
                    )
              }
              className="block h-auto w-full object-contain object-top"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Oluşturulan raporu indirebilir veya Close Report ile önizlemeyi kapatabilirsiniz."
                : t(
                    "Download the generated report or close the preview with Close Report.",
                    "Laden Sie den erzeugten Bericht herunter oder schließen Sie die Vorschau mit Close Report.",
                    "Descargue el informe generado o cierre la vista previa con Close Report.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-8" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L(
              "8. Plotlar ve analiz kaydı",
              "8. Plots and Analysis Save",
              "8. Plots und Analyse speichern",
              "8. Gráficos y guardar análisis",
            )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Her araç ilgili hesaplamaları yaptıktan sonra derinlik bazlı plotlar çizer. Bu grafikler çoğunlukla{" "}
                <strong>Soil Profile Plot</strong> sekmesinde yer alır; özellikle AI destekli yorumlarda öncelikle
                incelenen çıktılardandır.
              </>
            ) : (
              <>
                {t(
                  "After each tool runs its calculations, it draws depth-based plots—typically on the Soil Profile Plot tab. These charts are among the first outputs reviewed in AI-assisted interpretation.",
                  "Nach den Berechnungen zeichnet jedes Tool tiefenbasierte Plots – typischerweise im Tab Soil Profile Plot. Diese Diagramme gehören bei KI‑gestützter Auswertung zu den zuerst geprüften Ergebnissen.",
                  "Tras los cálculos, cada herramienta dibuja gráficos en función de la profundidad (habitualmente en la pestaña Soil Profile Plot). Son de las primeras salidas que se revisan en interpretaciones asistidas por IA.",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/plot-depth-vs-cu-example.png"
              alt={
                lang === "tr"
                  ? "Örnek derinlik–parametre grafiği (Depth vs cu)"
                  : t(
                      "Example depth–parameter plot (Depth vs cu)",
                      "Beispiel: Parameter–Tiefe‑Plot (Depth vs cu)",
                      "Ejemplo: gráfico profundidad–parámetro (Depth vs cu)",
                    )
              }
              className="block max-h-[520px] w-full object-contain"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Örnek: derinliğe karşı parametre (ör. cu) scatter grafiği; seçilen sondaja göre işaretler Soil Profile Plot’ta listelenir."
                : t(
                    "Example: parameter vs depth (e.g., cu); markers reflect the selected borehole(s) on Soil Profile Plot.",
                    "Beispiel: Parameter gegen Tiefe (z. B. cu); Markierungen entsprechen dem/den gewählten Borehole(s) im Soil Profile Plot.",
                    "Ejemplo: parámetro frente a profundidad (p. ej., cu); los puntos corresponden al/los sondeo(s) elegido(s) en Soil Profile Plot.",
                  )}
            </figcaption>
          </figure>

          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Profile araçlarında <strong>Save Profile Analysis</strong> / <strong>Save Analysis to Project</strong>{" "}
                paneli bulunur. Bu düğme, yapılan analizi proje dosyasına kaydeder; girdi tabloları ile birlikte plot
                görselleri de saklanır ve daha sonra görüntüleme ile geri yükleme imkânı sunar. Aktif proje ve oturum
                gerekir.
              </>
            ) : (
              <>
                {t(
                  "Profile tools also include a Save Profile Analysis / Save Analysis to Project control. It writes the current analysis into the project folder—input tables and plot images—so you can reopen and restore the work later. You must be signed in with an active project.",
                  "Profil‑Tools enthalten Save Profile Analysis / Save Analysis to Project. Damit wird die Analyse im Projektordner abgelegt – Eingabetabellen und Plot‑Bilder – zur späteren Ansicht und Wiederherstellung. Anmeldung und aktives Projekt sind erforderlich.",
                  "Las herramientas de perfil incluyen Save Profile Analysis / Save Analysis to Project: guarda el análisis en la carpeta del proyecto (tablas de entrada e imágenes de gráficos) para verlo y restaurarlo después. Requiere sesión iniciada y un proyecto activo.",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/save-analysis-to-project-panel.png"
              alt={
                lang === "tr"
                  ? "Save Profile Analysis paneli ve başarılı kayıt özeti"
                  : t(
                      "Save Profile Analysis panel with success summary",
                      "Save Profile Analysis mit Erfolgsmeldung",
                      "Panel Save Profile Analysis con resumen de guardado correcto",
                    )
              }
              className="block max-h-[min(32rem,78vh)] w-full object-contain"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Kayıt sonrası özet: yakalanan alan sayısı, tablo ve plot görüntüleri ile indekslenen parametreler bildirilir; isteğe Projects ekranına geçilebilir."
                : t(
                    "After saving, a summary lists captured fields, tables, plot images, and indexed parameters; you can jump to Projects from the panel.",
                    "Nach dem Speichern zeigt eine Zusammenfassung erfasste Felder, Tabellen, Plot‑Bilder und indizierte Parameter; optional Wechsel zur Projektansicht.",
                    "Tras guardar, un resumen indica campos capturados, tablas, imágenes de gráficos y parámetros indexados; puede ir a Projects desde el panel.",
                  )}
            </figcaption>
          </figure>

          <p className="rounded-lg border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-[15px] leading-7 text-slate-800">
            {lang === "tr" ? (
              <>
                <strong>Önemli not!</strong> <strong>Save Analysis to Project</strong> yapıldığı takdirde, bir aracın
                çıktısı olan değer ilgili başka bir aracın girdisi olabilir ve bu değer otomatik olarak oraya aktarılır
                (örneğin <em>c′</em> hesabındaki girdi olan <em>c<sub>u</sub></em> değeri,{" "}
                <strong>Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)</strong> aracında
                hesaplanan değerden otomatik olarak çekilir).
              </>
            ) : (
              <>
                <strong>{t("Important note!", "Wichtiger Hinweis!", "¡Nota importante!")}</strong>{" "}
                {t(
                  "After Save Analysis to Project, an output from one tool can feed another tool’s inputs automatically (for example, the cu used as an input for the c′ calculation is pulled from results computed in Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)).",
                  "Nach Save Analysis to Project kann die Ausgabe eines Tools automatisch Eingaben eines anderen Tools speisen (z. B. wird cu für die c′‑Berechnung aus den Ergebnissen von Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI) übernommen).",
                  "Tras Save Analysis to Project, la salida de una herramienta puede alimentar automáticamente las entradas de otra (por ejemplo, el cu usado en el cálculo de c′ se toma de Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI)).",
                )}
              </>
            )}
          </p>

          <figure className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/soil-profile-cu-autofill-example.png"
              alt={
                lang === "tr"
                  ? "Soil Profile Plot: cu alanının başka bir tool çıktısından otomatik doldurulması"
                  : t(
                      "Soil Profile Plot: cu auto-filled from another tool’s saved output",
                      "Soil Profile Plot: cu automatisch aus gespeicherten Ergebnissen eines anderen Tools",
                      "Soil Profile Plot: cu rellenado automáticamente desde la salida guardada de otra herramienta",
                    )
              }
              className="block max-h-[min(36rem,82vh)] w-full object-contain"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Örnek: c′ hesap aracında cu hücresi, kayıtlı projede Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI) analizinden otomatik doldurulur (yeşil etiket)."
                : t(
                    "Example: in the c′ tool, cu is auto-filled from the saved Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI) analysis (green badge).",
                    "Beispiel: Im c′‑Tool wird cu aus der gespeicherten Analyse Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI) automatisch eingetragen (grünes Label).",
                    "Ejemplo: en la herramienta c′, cu se rellena desde el análisis guardado Undrained Shear Strength (cu) from SPT (N60) and Plasticity Index (PI) (etiqueta verde).",
                  )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-9" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {L(
              "9. Kayıtlı analizleri görüntüleme",
              "9. Viewing Saved Analysis",
              "9. Gespeicherte Analysen ansehen",
              "9. Ver análisis guardados",
            )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Kaydedilmiş analizleri görmek için <strong>Projects</strong> (hesap) menüsünden aktif projenizi açın ve{" "}
                <strong>Saved analyses</strong> sekmesine geçin. Listede her kaydın <strong>tarih ve saatini</strong>{" "}
                görürsünüz; <strong>View</strong> ile analize ait plotu inceleyebilir,{" "}
                <strong>Load to Tool</strong> ile aynı analizi ilgili araçta yeniden yükleyebilirsiniz.{" "}
                <strong>Remove</strong> kaydı listeden siler.
              </>
            ) : (
              <>
                {t(
                  "To review saved analyses, open your active project from the Projects (account) area and go to the Saved analyses tab. Each row shows the save date and time. Use View to inspect the plot for that run, Load to Tool to reopen the analysis in the originating tool, and Remove to delete the record.",
                  "Öffnen Sie Ihr aktives Projekt unter Projects (Account) und wechseln Sie zum Tab Saved analyses. Pro Zeile sehen Sie Datum und Uhrzeit. View zeigt den Plot, Load to Tool öffnet die Analyse wieder im jeweiligen Tool, Remove löscht den Eintrag.",
                  "Para revisar análisis guardados, abra su proyecto activo en Projects (cuenta) y vaya a la pestaña Saved analyses. Cada fila muestra fecha y hora. Use View para ver el gráfico, Load to Tool para volver a cargar el análisis en la herramienta de origen, y Remove para eliminar el registro.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/saved-analyses.png"
              alt={
                lang === "tr"
                  ? "Proje ekranı: Saved analyses sekmesi ve kayıt listesi"
                  : t(
                      "Project workspace: Saved analyses tab with record list",
                      "Projektansicht: Tab Saved analyses mit Liste",
                      "Proyecto: pestaña Saved analyses con la lista",
                    )
              }
              className="block h-auto w-full object-contain object-top"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Saved analyses: üstteki sekmelerden erişilir; tabloda araç adı, kayıt zamanı ve View / Load to Tool / Remove eylemleri yer alır."
                : t(
                    "Saved analyses is opened from the project tabs; the table lists tool name, timestamp, and View / Load to Tool / Remove.",
                    "Saved analyses erreichen Sie über die Projekt‑Tabs; die Tabelle zeigt Tool, Zeitstempel sowie View / Load to Tool / Remove.",
                    "Saved analyses se abre desde las pestañas del proyecto; la tabla muestra la herramienta, la marca de tiempo y View / Load to Tool / Remove.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-10" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold text-[#c9a227]">
            {L(
              "10. Parametre matrisi (Projects)",
              "10. Parameter matrix (Projects)",
              "10. Parameter‑Matrix (Projects)",
              "10. Matriz de parámetros (Projects)",
            )}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Bu ekran (başlık: <strong>Integrated Parameter Matrix</strong>), ilgili projedeki sondaj örnekleriyle
                ilişkili ve <strong>Save Analysis to Project</strong> ile kaydedilen araç analizlerinden birleşen parametre
                tablosunu gösterir. <strong>Refresh</strong> ve <strong>Export Excel</strong> uygun üyeliklerle kullanılabilir.
                Altın renkli <span className="font-semibold text-[#c9a227]">Generate report</span> düğmesi yalnızca{" "}
                <strong>Gold</strong> üyelikte çalışır; uzun bir yapay zekâ <strong>prompt</strong> ile mühendislik raporu
                üretir ve haftalık kota satırı gösterebilir. Bu rapor, araçlardaki günlük{" "}
                <strong>Create report → Download PDF</strong> kotasından tamamen ayrıdır.
              </>
            ) : (
              <>
                {t(
                  "This screen (title on the app: Integrated Parameter Matrix) shows parameters merged from tool analyses saved to the project with borehole samples. Refresh and Export Excel are available where your plan allows. The gold ",
                  "Diese Ansicht (Titel in der App: Integrated Parameter Matrix) zeigt Parameter aus gespeicherten Tool‑Analysen mit Bohrproben. Refresh und Export Excel sind je nach Tarif verfügbar. Der goldfarbene Button ",
                  "Esta pantalla (título en la app: Integrated Parameter Matrix) muestra parámetros fusionados a partir de análisis guardados con muestras de sondeos. Refresh y Export Excel están disponibles según el plan. El botón dorado ",
                )}
                <span className="font-semibold text-[#c9a227]">Generate report</span>
                {t(
                  " button is Gold only: it runs a long AI prompt to produce an engineering report and may show a weekly allowance line. This is separate from the daily Create report → Download PDF limit in tools.",
                  " ist nur für Gold: erzeugt einen KI‑Ingenieurbericht und kann ein wöchentliches Kontingent anzeigen. Das ist getrennt vom täglichen Limit für Create report → Download PDF in den Tools.",
                  " solo está disponible en Gold: ejecuta un prompt de IA largo para un informe de ingeniería y puede mostrar cupo semanal. Esto es independiente del límite diario de Create report → Download PDF en herramientas.",
                )}
              </>
            )}
          </p>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <img
              src="/images/guide/integrated-parameter-matrix.png"
              alt={
                lang === "tr"
                  ? "Parametre matrisi: tablo, Refresh, Export Excel ve Generate report (Gold)"
                  : t(
                      "Parameter matrix: table, Refresh, Export Excel, and Generate report (Gold)",
                      "Parameter‑Matrix: Tabelle, Refresh, Export Excel und Generate report (Gold)",
                      "Matriz de parámetros: tabla, Refresh, Export Excel y Generate report (Gold)",
                    )
              }
              className="block h-auto w-full object-contain object-top"
            />
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Generate report yalnızca Gold; haftalık kota satırı görünebilir. Araçlardaki Create report günlük kotası bundan ayrıdır."
                : t(
                    "Generate report is Gold only; a weekly allowance line may appear. Tool Create report daily limits are separate.",
                    "Generate report nur für Gold; eine Wochenkontingent‑Zeile kann erscheinen. Das Tageslimit für Create report in Tools ist getrennt.",
                    "Generate report solo Gold; puede aparecer línea de cupo semanal. El límite diario de Create report en herramientas es aparte.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section id="guide-section-11" className="scroll-mt-20 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {L("11. Sıkça sorulan sorular", "11. FAQ", "11. Häufige Fragen", "11. Preguntas frecuentes")}
          </h2>
          <p className="text-[15px] leading-7 text-slate-700">
            {L(
              "Aşağıda sık sorulan kısa sorular ve yanıtlar yer alır; menü yolları sitedeki İngilizce düğme adlarıyla birlikte verilmiştir.",
              "Below are short answers to common “how do I…” questions. Paths are shown with the on-site English control names.",
              "Kurze Antworten auf häufige „Wie kann ich …?“-Fragen. Pfade nennen die englischen Bezeichnungen in der Oberfläche.",
              "Respuestas breves a preguntas frecuentes del tipo «¿cómo hago…?». Las rutas usan los nombres en inglés de la interfaz.",
            )}
          </p>
          <dl className="space-y-6">
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Yeni bir projeyi nasıl oluştururum?",
                  "How do I create a new project?",
                  "Wie lege ich ein neues Projekt an?",
                  "¿Cómo creo un proyecto nuevo?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Oturum açın → üst menüden Projects → /projects sayfasında Active Project alanında New Project (yeni proje) ile ad verip oluşturun. Proje limitiniz doluysa yeni proje düğmesi kapalı olur.",
                  "Sign in → open Projects from the top bar → on /projects use New Project under Active Project, name the project, and save. If you have reached your project limit, creating a new project is disabled.",
                  "Anmelden → Projects in der oberen Leiste → auf /projects unter Active Project mit New Project anlegen und speichern. Wenn Ihr Projektlimit erreicht ist, ist „Neues Projekt“ deaktiviert.",
                  "Inicie sesión → Projects en la barra superior → en /projects use New Project bajo Active Project, ponga nombre y guarde. Si alcanzó el límite de proyectos, no podrá crear otro.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Giriş yapmak için nereye tıklamalıyım?",
                  "Where do I click to log in?",
                  "Wo klicke ich mich ein?",
                  "¿Dónde inicio sesión?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Üst menüden Account → /account sayfasında Log in to your account: e‑posta ve şifre ile giriş yapın. Şifrenizi unuttuysanız Forgot password? bağlantısını kullanın.",
                  "Use Account in the top bar → on /account open Log in to your account and enter email and password. Use Forgot password? if you need a reset.",
                  "Account in der oberen Leiste → auf /account Log in to your account mit E‑Mail und Passwort. Für eine Zurücksetzung: Forgot password?.",
                  "Account en la barra superior → en /account use Log in to your account con correo y contraseña. Para restablecer: Forgot password?.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Araç sayfasında proje ve sondaj verisini nasıl bağlarım?",
                  "How do I attach project / borehole data on a tool page?",
                  "Wie binde ich Projekt-/Bohrdaten auf einer Tool‑Seite ein?",
                  "¿Cómo vinculo datos de proyecto y sondeos en una herramienta?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Bir araçta (/tools/…) üst kısımdaki Projects and Boreholes düğmesini açın, proje ve sondajları seçin, ardından Use in Tools’a basın. Projeyi ayırmak için Clear kullanın.",
                  "On a tool page (/tools/…), open Projects and Boreholes in the header, select your project and boreholes, then click Use in Tools. Use Clear to detach project data.",
                  "Auf einer Tool‑Seite (/tools/…) Projects and Boreholes öffnen, Projekt und Bohrungen wählen, dann Use in Tools. Mit Clear lösen Sie die Projektdaten wieder.",
                  "En una herramienta (/tools/…) abra Projects and Boreholes, elija proyecto y sondeos y pulse Use in Tools. Use Clear para desvincular.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Kayıtlı analizleri nerede bulurum?",
                  "Where do I find saved analyses?",
                  "Wo finde ich gespeicherte Analysen?",
                  "¿Dónde están los análisis guardados?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Projects → ilgili projeyi açın → Saved analyses sekmesi. Satırda View, Load to Tool ve Remove eylemleri vardır.",
                  "Open Projects → choose your project → the Saved analyses tab. Each row offers View, Load to Tool, and Remove.",
                  "Projects → Projekt öffnen → Tab Saved analyses. Pro Zeile: View, Load to Tool, Remove.",
                  "Projects → abra el proyecto → pestaña Saved analyses. Cada fila: View, Load to Tool, Remove.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Parametre matrisi ekranına nasıl giderim?",
                  "How do I open the parameter matrix?",
                  "Wie öffne ich die Parameter‑Matrix?",
                  "¿Cómo abro la matriz de parámetros?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Projects → projenizi seçin → parametre matrisi kartına tıklayın (ekran başlığı Integrated Parameter Matrix). Tablo, projeye kaydedilmiş araç analizlerinden birleşir.",
                  "Go to Projects → select your project → open the parameter matrix card (on-screen title: Integrated Parameter Matrix). The table merges parameters from analyses saved to that project.",
                  "Projects → Projekt wählen → Parameter‑Matrix‑Karte öffnen (Anzeigename: Integrated Parameter Matrix). Die Tabelle führt gespeicherte Tool‑Analysen zusammen.",
                  "Vaya a Projects → elija el proyecto → tarjeta de matriz de parámetros (título en pantalla: Integrated Parameter Matrix). La tabla fusiona análisis guardados en el proyecto.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Araçta rapor önizlemesi ve PDF indirme nerede?",
                  "Where is the report preview and PDF download in a tool?",
                  "Wo sind Berichtsvorschau und PDF‑Download im Tool?",
                  "¿Dónde está la vista previa del informe y la descarga PDF?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "İlgili araçta Report sekmesine geçin → Create report taslak önizlemeyi açar. Uygun üyelik ve Soil Profile Plot hazırsa Download PDF kullanılabilir; Bronze’da bu indirmeler günlük kota ile sınırlıdır (Projects’teki Generate report değil).",
                  "Open the Report tab in the tool → Create report opens the draft preview. Download PDF is available for eligible accounts when Soil Profile Plot is ready; on Bronze, downloads count toward a daily allowance (separate from Projects → parameter matrix Generate report).",
                  "Im Tool den Tab Report → Create report öffnet die Vorschau. Download PDF steht bei berechtigten Konten zur Verfügung, sobald Soil Profile Plot vorliegt; bei Bronze zählen Downloads auf ein Tageskontingent (getrennt von Generate report in der Parameter‑Matrix unter Projects).",
                  "En la herramienta, pestaña Report → Create report abre el borrador. Download PDF está disponible para cuentas elegibles cuando Soil Profile Plot esté listo; en Bronze cuentan para un cupo diario (aparte de Generate report en la matriz de parámetros en Projects).",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Sondaja yeni örnek satırı nasıl eklerim?",
                  "How do I add a new sample row to a borehole?",
                  "Wie füge ich eine neue Probenzeile zu einer Bohrung hinzu?",
                  "¿Cómo añado una nueva fila de muestra a un sondeo?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Projects → Boreholes → Add borehole sample bölümünde New Borehole ID ile yeni sondaj adı tanımlayın veya Existing Borehole ID ile aynı sondaja farklı derinlikte örnek ekleyin.",
                  "Under Projects → Boreholes, use Add borehole sample: New Borehole ID creates a new borehole name; Existing Borehole ID adds another depth under the same borehole.",
                  "Unter Projects → Boreholes im Bereich Add borehole sample: New Borehole ID legt eine neue Bohrung an, Existing Borehole ID fügt eine weitere Tiefe derselben Bohrung hinzu.",
                  "En Projects → Boreholes, en Add borehole sample: New Borehole ID define un nuevo sondeo; Existing Borehole ID añade otra profundidad al mismo sondeo.",
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[15px] font-semibold text-slate-900">
                {L(
                  "Bu kullanım kılavuzunun PDF’ini nasıl indiririm?",
                  "How do I download this user guide as a PDF?",
                  "Wie lade ich dieses Handbuch als PDF herunter?",
                  "¿Cómo descargo esta guía en PDF?",
                )}
              </dt>
              <dd className="mt-2 text-[15px] leading-7 text-slate-700">
                {L(
                  "Tarayıcıda Yazdır (Ctrl+P) → PDF olarak kaydet / Hedef olarak PDF seçerek bu sayfayı çok sayfalı bir PDF olarak kaydedebilirsiniz.",
                  "Use your browser’s Print dialog (Ctrl+P) → Save as PDF / Microsoft Print to PDF to save this guide as a multi-page PDF.",
                  "Nutzen Sie Drucken (Strg+P) → Als PDF speichern bzw. „Microsoft Print to PDF“, um die Anleitung mehrseitig als PDF zu speichern.",
                  "Use Imprimir (Ctrl+P) → Guardar como PDF (o Microsoft Print to PDF) para guardar esta guía en varias páginas como PDF.",
                )}
              </dd>
            </div>
          </dl>
        </section>

      </div>
    </div>
  );
}

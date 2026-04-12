"use client";

import { useEffect, useRef, useState } from "react";

import { downloadElementAsPdf } from "@/lib/download-user-guide-pdf";
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
              <h2 className="text-xl font-semibold text-slate-900">1. Site and Menu</h2>
              <p className="text-[15px] leading-7 text-slate-700">
                Siteye girdiğinizde karşınıza çıkan ana sayfada, hesaplayıcılara ve teknik içeriklere hızlıca geçmek için{" "}
                <strong>Explore Tools</strong> ve <strong>Read Blog</strong> düğmelerini kullanabilirsiniz. Alt bölümdeki{" "}
                <strong>Başlangıç kılavuzu</strong> bağlantısı ise araçlar, hesap, projeler ve kayıtlı analizler hakkında
                özet bir yol haritası sunar.
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

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">2. Account: Login and Sign Up</h2>
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
                  <strong>{BRONZE_MAX_SAMPLES_PER_BOREHOLE} örnek</strong> tanımlayabilirsiniz. Entegre parametre raporları
                  için günde en fazla <strong>{BRONZE_MAX_REPORTS_PER_DAY} PDF</strong> (Avrupa/İstanbul takvimine göre)
                  üretebilir; analizleri ve matrisi buluta kaydedebilirsiniz. Profil araçlarında{" "}
                  <strong>AI yorumu</strong> bu planda yer almaz. Blog araştırma yazılarındaki{" "}
                  <strong>Further questions</strong> (ek sorular) yalnızca Silver veya Gold ile sunulur.
                </p>
                <p>
                  <strong>Silver:</strong> <strong>Sınırsız proje ve borehole</strong>; entegre raporlar ve PDF dışa aktarımda
                  sınır yoktur. Blog araştırma içeriklerinde rehberli takip niteliğinde{" "}
                  <strong>Further questions</strong> kullanılabilir. Bronze’daki tüm özellikler Silver’a dahildir.
                </p>
                <p>
                  <strong>Gold:</strong> Entegre raporlar ve profil araçlarında <strong>sınırsız AI analizi</strong>; proje,
                  rapor ve dışa aktarımda pratikte sınırsız kullanım. Yeni özelliklere öncelikli erişim ve Silver’daki tüm
                  özellikler Gold kapsamındadır.
                </p>
                <p className="text-slate-600">
                  <strong>Not:</strong> Araçları ve blogu hesap açmadan da gezebilir; bulut projesi, kayıtlı analiz ve üyelikle
                  gelen kota özellikleri için hesap gerekir.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">3. Account: Information</h2>
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
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("1. Site and Menu", "1. Website und Menü", "1. Sitio y menú")}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "On the home page, use Explore Tools and Read Blog to jump straight to calculators and articles. The Getting started guide link at the bottom gives a short overview of tools, account, projects, and saved analyses.",
                  "On the home page, use Explore Tools and Read Blog to jump straight to calculators and articles. The Getting started guide link at the bottom gives a short overview of tools, account, projects, and saved analyses.",
                  "On the home page, use Explore Tools and Read Blog to jump straight to calculators and articles. The Getting started guide link at the bottom gives a short overview of tools, account, projects, and saved analyses.",
                )}
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "The top navigation lists Home, Tools, Blog, Contact, and Account. Use Account to sign up, sign in, and manage your profile; Contact for messages. The active page is highlighted in the menu.",
                  "The top navigation lists Home, Tools, Blog, Contact, and Account. Use Account to sign up, sign in, and manage your profile; Contact for messages. The active page is highlighted in the menu.",
                  "The top navigation lists Home, Tools, Blog, Contact, and Account. Use Account to sign up, sign in, and manage your profile; Contact for messages. The active page is highlighted in the menu.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-hero.png"
                    alt={t(
                      "Home: Geotechnical Insights Hub with Explore Tools and Read Blog",
                      "Home: Geotechnical Insights Hub with Explore Tools and Read Blog",
                      "Home: Geotechnical Insights Hub with Explore Tools and Read Blog",
                    )}
                    className={guideImgHero}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Home page: quick links to tools and blog, plus the getting started guide.",
                    "Home page: quick links to tools and blog, plus the getting started guide.",
                    "Home page: quick links to tools and blog, plus the getting started guide.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/site-main-navigation.png"
                    alt={t(
                      "Site header: logo and primary navigation (Home, Tools, Blog, Contact, Account)",
                      "Site header: logo and primary navigation (Home, Tools, Blog, Contact, Account)",
                      "Site header: logo and primary navigation (Home, Tools, Blog, Contact, Account)",
                    )}
                    className={guideImgNav}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Site header: logo and main menu. Home, Tools, Blog, Contact, and Account; the current page is highlighted.",
                    "Site header: logo and main menu. Home, Tools, Blog, Contact, and Account; the current page is highlighted.",
                    "Site header: logo and main menu. Home, Tools, Blog, Contact, and Account; the current page is highlighted.",
                  )}
                </figcaption>
              </figure>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("2. Account: Login and Sign Up", "2. Account: Login and Sign Up", "2. Account: Login and Sign Up")}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "Click Account in the top menu to open /account. Use Log in to your account with email and password, or Forgot password? for a reset. If you are new, choose Register now. to switch to Create your account: meet the password rules, accept the legal terms, then Sign Up.",
                  "Click Account in the top menu to open /account. Use Log in to your account with email and password, or Forgot password? for a reset. If you are new, choose Register now. to switch to Create your account: meet the password rules, accept the legal terms, then Sign Up.",
                  "Click Account in the top menu to open /account. Use Log in to your account with email and password, or Forgot password? for a reset. If you are new, choose Register now. to switch to Create your account: meet the password rules, accept the legal terms, then Sign Up.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-login.png"
                    alt={t(
                      "Account: Log in to your account form",
                      "Account: Log in to your account form",
                      "Account: Log in to your account form",
                    )}
                    className={guideImgLogin}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Sign-in screen: email, password, Log In, and Register now.",
                    "Sign-in screen: email, password, Log In, and Register now.",
                    "Sign-in screen: email, password, Log In, and Register now.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-signup.png"
                    alt={t(
                      "Account: Create your account registration form",
                      "Account: Create your account registration form",
                      "Account: Create your account registration form",
                    )}
                    className={guideImgSignup}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Sign-up screen: password requirements, legal acknowledgement, and Sign Up.",
                    "Sign-up screen: password requirements, legal acknowledgement, and Sign Up.",
                    "Sign-up screen: password requirements, legal acknowledgement, and Sign Up.",
                  )}
                </figcaption>
              </figure>

              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "Membership has three tiers: Bronze, Silver, and Gold. Under Compare membership tiers on the sign-up view, plans are shown side by side. New accounts start on Bronze; upgrading unlocks Silver or Gold limits.",
                  "Membership has three tiers: Bronze, Silver, and Gold. Under Compare membership tiers on the sign-up view, plans are shown side by side. New accounts start on Bronze; upgrading unlocks Silver or Gold limits.",
                  "Membership has three tiers: Bronze, Silver, and Gold. Under Compare membership tiers on the sign-up view, plans are shown side by side. New accounts start on Bronze; upgrading unlocks Silver or Gold limits.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-membership-tiers.png"
                    alt={t(
                      "Bronze, Silver, and Gold membership comparison cards",
                      "Bronze, Silver, and Gold membership comparison cards",
                      "Bronze, Silver, and Gold membership comparison cards",
                    )}
                    className={guideImgTiers}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Membership comparison: feature summaries for Bronze, Silver, and Gold.",
                    "Membership comparison: feature summaries for Bronze, Silver, and Gold.",
                    "Membership comparison: feature summaries for Bronze, Silver, and Gold.",
                  )}
                </figcaption>
              </figure>

              <div className="space-y-3 text-[15px] leading-7 text-slate-700">
                <p>
                  <strong>{t("Bronze:", "Bronze:", "Bronze:")}</strong>{" "}
                  {t(
                    "All new members start here. Up to",
                    "All new members start here. Up to",
                    "All new members start here. Up to",
                  )}{" "}
                  <strong>{BRONZE_MAX_PROJECTS}</strong>{" "}
                  {t("projects,", "projects,", "projects,")}{" "}
                  <strong>{BRONZE_MAX_BOREHOLES_PER_PROJECT}</strong>{" "}
                  {t("borehole IDs per project,", "borehole IDs per project,", "borehole IDs per project,")}{" "}
                  <strong>{BRONZE_MAX_SAMPLES_PER_BOREHOLE}</strong>{" "}
                  {t(
                    "samples per borehole. Integrated parameter reports: up to",
                    "samples per borehole. Integrated parameter reports: up to",
                    "samples per borehole. Integrated parameter reports: up to",
                  )}{" "}
                  <strong>{BRONZE_MAX_REPORTS_PER_DAY}</strong>{" "}
                  {t(
                    "PDFs per day (Europe/Istanbul calendar). Save analyses and the matrix to the cloud. AI profile interpretation is not included. Further questions in blog research articles are Silver or Gold only.",
                    "PDFs per day (Europe/Istanbul calendar). Save analyses and the matrix to the cloud. AI profile interpretation is not included. Further questions in blog research articles are Silver or Gold only.",
                    "PDFs per day (Europe/Istanbul calendar). Save analyses and the matrix to the cloud. AI profile interpretation is not included. Further questions in blog research articles are Silver or Gold only.",
                  )}
                </p>
                <p>
                  <strong>{t("Silver:", "Silver:", "Silver:")}</strong>{" "}
                  {t(
                    "Unlimited projects and boreholes; unlimited integrated reports and PDF exports. Further questions (guided follow-ups) in blog research articles. All Bronze features are included.",
                    "Unlimited projects and boreholes; unlimited integrated reports and PDF exports. Further questions (guided follow-ups) in blog research articles. All Bronze features are included.",
                    "Unlimited projects and boreholes; unlimited integrated reports and PDF exports. Further questions (guided follow-ups) in blog research articles. All Bronze features are included.",
                  )}
                </p>
                <p>
                  <strong>{t("Gold:", "Gold:", "Gold:")}</strong>{" "}
                  {t(
                    "Unlimited AI analysis for integrated reports and profile tools; unlimited projects, reports, and exports in practice; priority access to new features. All Silver features are included.",
                    "Unlimited AI analysis for integrated reports and profile tools; unlimited projects, reports, and exports in practice; priority access to new features. All Silver features are included.",
                    "Unlimited AI analysis for integrated reports and profile tools; unlimited projects, reports, and exports in practice; priority access to new features. All Silver features are included.",
                  )}
                </p>
                <p className="text-slate-600">
                  <strong>{t("Note:", "Note:", "Note:")}</strong>{" "}
                  {t(
                    "You can browse tools and the blog without signing in; cloud projects, saved analyses, and membership quotas require an account.",
                    "You can browse tools and the blog without signing in; cloud projects, saved analyses, and membership quotas require an account.",
                    "You can browse tools and the blog without signing in; cloud projects, saved analyses, and membership quotas require an account.",
                  )}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {t("3. Account: Information", "3. Account: Information", "3. Account: Information")}
              </h2>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "After you sign in, your account unlocks features based on your membership tier. The Account control in the top menu uses tier colours (Bronze, Silver, or Gold); when signed in it also shows a small green checkmark. The Projects link appears next to Account.",
                  "After you sign in, your account unlocks features based on your membership tier. The Account control in the top menu uses tier colours (Bronze, Silver, or Gold); when signed in it also shows a small green checkmark. The Projects link appears next to Account.",
                  "After you sign in, your account unlocks features based on your membership tier. The Account control in the top menu uses tier colours (Bronze, Silver, or Gold); when signed in it also shows a small green checkmark. The Projects link appears next to Account.",
                )}
              </p>
              <p className="text-[15px] leading-7 text-slate-700">
                {t(
                  "On /account, the information card border uses the same tier palette. You get Subscription (current plan and comparison), Personal Information (email display and password change), and Logout.",
                  "On /account, the information card border uses the same tier palette. You get Subscription (current plan and comparison), Personal Information (email display and password change), and Logout.",
                  "On /account, the information card border uses the same tier palette. You get Subscription (current plan and comparison), Personal Information (email display and password change), and Logout.",
                )}
              </p>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-header-tier.png"
                    alt={t(
                      "Top menu: Account button styled by membership tier",
                      "Top menu: Account button styled by membership tier",
                      "Top menu: Account button styled by membership tier",
                    )}
                    className={guideImgAccountHeader}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Example: Gold membership — Account button and Projects in the header.",
                    "Example: Gold membership — Account button and Projects in the header.",
                    "Example: Gold membership — Account button and Projects in the header.",
                  )}
                </figcaption>
              </figure>

              <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className={guideShotFrame}>
                  <img
                    src="/images/guide/account-information-panel.png"
                    alt={t(
                      "Account page: Subscription tab and tier cards",
                      "Account page: Subscription tab and tier cards",
                      "Account page: Subscription tab and tier cards",
                    )}
                    className={guideImgAccountDashboard}
                  />
                </div>
                <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  {t(
                    "Account screen: Subscription, Personal Information, Logout; border matches tier.",
                    "Account screen: Subscription, Personal Information, Logout; border matches tier.",
                    "Account screen: Subscription, Personal Information, Logout; border matches tier.",
                  )}
                </figcaption>
              </figure>
            </section>
          </>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr" ? "4. Project" : t("4. Project", "4. Project", "4. Project")}
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
                  "After you sign in, the Projects link appears in the top menu.",
                  "After you sign in, the Projects link appears in the top menu.",
                )}{" "}
                <code className="rounded bg-slate-100 px-1">/projects</code>{" "}
                {t(
                  "is where you create, select, edit, or remove cloud projects—the main hub for project management. Depending on your plan you can have up to",
                  "is where you create, select, edit, or remove cloud projects—the main hub for project management. Depending on your plan you can have up to",
                  "is where you create, select, edit, or remove cloud projects—the main hub for project management. Depending on your plan you can have up to",
                )}{" "}
                <strong>{MAX_PROJECTS_PER_USER}</strong>{" "}
                {t("projects; when the limit is reached, creating new projects is disabled.", "projects; when the limit is reached, creating new projects is disabled.", "projects; when the limit is reached, creating new projects is disabled.")}
              </>
            )}
          </p>
          <p className="text-[15px] leading-7 text-slate-700">
            {lang === "tr" ? (
              <>
                Her proje altında <strong>Boreholes</strong> (sondaj kayıtları), <strong>Saved analyses</strong> (araçlardan
                kaydedilen analizler) ve <strong>Integrated parameter matrix</strong> (birleşik parametre görünümü)
                bölümleri yer alır; bu kartlar üzerinden ilgili ekranlara geçebilirsiniz.
              </>
            ) : (
              <>
                {t(
                  "Each project includes Boreholes, Saved analyses, and the Integrated parameter matrix—open the matching cards to work with borehole data, saved tool runs, and the merged parameter table.",
                  "Each project includes Boreholes, Saved analyses, and the Integrated parameter matrix—open the matching cards to work with borehole data, saved tool runs, and the merged parameter table.",
                  "Each project includes Boreholes, Saved analyses, and the Integrated parameter matrix—open the matching cards to work with borehole data, saved tool runs, and the merged parameter table.",
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
                        "Projects: Active Project dropdown when no projects exist yet",
                        "Projects: Active Project dropdown when no projects exist yet",
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
                    "Starting out: use New Project when the Active Project list is empty.",
                    "Starting out: use New Project when the Active Project list is empty.",
                  )}
            </figcaption>
          </figure>

          <figure className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={guideShotFrame}>
              <img
                src="/images/guide/projects-active.png"
                alt={
                  lang === "tr"
                    ? "Projects: seçili proje ve Boreholes / Saved analyses / Integrated parameter matrix kartları"
                    : t(
                        "Projects: selected project with Boreholes, Saved analyses, and Integrated parameter matrix cards",
                        "Projects: selected project with Boreholes, Saved analyses, and Integrated parameter matrix cards",
                        "Projects: selected project with Boreholes, Saved analyses, and Integrated parameter matrix cards",
                      )
                }
                className={guideImgProjects}
              />
            </div>
            <figcaption className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              {lang === "tr"
                ? "Proje seçildiğinde alt kartlardan Boreholes, Saved analyses ve Integrated parameter matrix ekranlarına geçilir."
                : t(
                    "With a project selected, use the cards to open Boreholes, Saved analyses, and the Integrated parameter matrix.",
                    "With a project selected, use the cards to open Boreholes, Saved analyses, and the Integrated parameter matrix.",
                    "With a project selected, use the cards to open Boreholes, Saved analyses, and the Integrated parameter matrix.",
                  )}
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr" ? "5. Boreholes" : t("5. Boreholes", "5. Boreholes", "5. Boreholes")}
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
                  "Under each project, open Boreholes to define boreholes and enter their key data (ID, GWT, unit weight, and sample rows). When you add another sample under an existing borehole ID, saved fields for that borehole load from the project automatically—you mainly enter the new sample-specific values (depth, N, PI, and so on).",
                  "Under each project, open Boreholes to define boreholes and enter their key data (ID, GWT, unit weight, and sample rows). When you add another sample under an existing borehole ID, saved fields for that borehole load from the project automatically—you mainly enter the new sample-specific values (depth, N, PI, and so on).",
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
                  "In the Add borehole sample section, New Borehole ID defines a new borehole name; Existing Borehole ID adds another sample depth under the same borehole. Sample depth, GWT, unit weight, soil behaviour and N values are stored here.",
                  "In the Add borehole sample section, New Borehole ID defines a new borehole name; Existing Borehole ID adds another sample depth under the same borehole. Sample depth, GWT, unit weight, soil behaviour and N values are stored here.",
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
            <div className={guideShotFrame}>
              <img
                src="/images/guide/boreholes-workspace.png"
                alt={
                  lang === "tr"
                    ? "Boreholes: tablo ve Add borehole sample formu"
                    : t(
                        "Boreholes: data table and Add borehole sample form",
                        "Boreholes: data table and Add borehole sample form",
                        "Boreholes: data table and Add borehole sample form",
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
                    "Boreholes: sample table and Add borehole sample form. Use New / Existing Borehole ID to add a new borehole or another depth on an existing one.",
                    "Boreholes: sample table and Add borehole sample form. Use New / Existing Borehole ID to add a new borehole or another depth on an existing one.",
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
                  "On tool pages (/tools/…), open Projects and Boreholes in the header, pick your project and boreholes, then click Use in Tools—samples are pushed into the tool’s profile rows automatically. Click Clear to detach project data and switch back to manual entry inside the tool.",
                  "On tool pages (/tools/…), open Projects and Boreholes in the header, pick your project and boreholes, then click Use in Tools—samples are pushed into the tool’s profile rows automatically. Click Clear to detach project data and switch back to manual entry inside the tool.",
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
                          "Geotechnical Tools page header with Projects and Boreholes control",
                          "Geotechnical Tools page header with Projects and Boreholes control",
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
                    "The Projects and Boreholes control in the upper right (teal frame) opens the project and borehole picker on tool pages.",
                    "The Projects and Boreholes control in the upper right (teal frame) opens the project and borehole picker on tool pages.",
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
                        "Projects and Boreholes: Use in Tools with active selection",
                        "Projects and Boreholes: Use in Tools with active selection",
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
                        "Projects and Boreholes: after Clear, manual entry",
                        "Projects and Boreholes: after Clear, manual entry",
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
                      "Left: samples active in tools after Use in Tools. Right: selection cleared with Clear—switch to manual input.",
                      "Left: samples active in tools after Use in Tools. Right: selection cleared with Clear—switch to manual input.",
                    )}
                  </>
                )}
              </p>
            </figcaption>
          </figure>
        </section>

        <section className="space-y-4">
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "6. Use of Tools"
              : t("6. Use of Tools", "6. Use of Tools", "6. Use of Tools")}
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
                    "Teal: Site Characterisation Tools. Indigo: Geotechnical Analysis Tools.",
                    "Teal: Site Characterisation Tools. Índigo: Geotechnical Analysis Tools.",
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "7. Plotlar ve analiz kaydı"
              : t("7. Plots and Analysis Save", "7. Plots und Analyse speichern", "7. Gráficos y guardar análisis")}
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "8. Kayıtlı analizleri görüntüleme"
              : t(
                  "8. Viewing Saved Analysis",
                  "8. Gespeicherte Analysen ansehen",
                  "8. Ver análisis guardados",
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "9. Rapor (PDF) ve Excel"
              : t("9. Report (PDF) and Excel exports", "9. Report (PDF) und Excel‑Exporte", "9. Informe (PDF) y exportaciones a Excel")}
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
                  indirir. <strong>Analyse with AI</strong> yapılandırılmışsa ek değerlendirme üretir.
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
                    "If Analyse with AI is enabled, it adds extra evaluation content.",
                    "Wenn Analyse with AI aktiviert ist, wird zusätzlicher Bewertungstext hinzugefügt.",
                    "Si Analyse with AI está habilitado, añade contenido adicional de evaluación.",
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

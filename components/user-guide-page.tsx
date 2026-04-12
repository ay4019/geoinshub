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
          <h2 className="text-xl font-semibold text-slate-900">
            {lang === "tr"
              ? "6. Tools sayfasında proje / sondaj seçimi"
              : t(
                  "6. Selecting project / boreholes in Tools",
                  "6. Projekt / Boreholes in Tools auswählen",
                  "6. Seleccionar proyecto / perforaciones en Tools",
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
              ? "7. Borehole kullanmadan araç kullanımı"
              : t("7. Using tools without boreholes", "7. Tools ohne Boreholes nutzen", "7. Usar herramientas sin perforaciones")}
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
              ? "8. Proje verisiyle araç kullanımı"
              : t("8. Using tools with project data", "8. Tools mit Projektdaten nutzen", "8. Usar herramientas con datos del proyecto")}
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
              ? "9. Sekmeler: Parameters, Soil Profile Plot, Information, Report"
              : t(
                  "9. Tabs: Parameters, Soil Profile Plot, Information, Report",
                  "9. Tabs: Parameters, Soil Profile Plot, Information, Report",
                  "9. Pestañas: Parameters, Soil Profile Plot, Information, Report",
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
              ? "10. Plotlar (grafikler) nerede?"
              : t("10. Where are the plots?", "10. Wo sind die Plots?", "10. ¿Dónde están los gráficos?")}
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
              ? "11. Analizi projeye kaydetme"
              : t("11. Saving an analysis to a project", "11. Analyse in einem Projekt speichern", "11. Guardar un análisis en un proyecto")}
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
              ? "12. Kayıtlı sonuçları görüntüleme"
              : t("12. Viewing saved analyses", "12. Gespeicherte Analysen anzeigen", "12. Ver análisis guardados")}
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
              ? "13. Rapor (PDF) ve Excel"
              : t("13. Report (PDF) and Excel exports", "13. Report (PDF) und Excel‑Exporte", "13. Informe (PDF) y exportaciones a Excel")}
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

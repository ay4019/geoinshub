import type { Metadata } from "next";

import { UserGuidePage } from "@/components/user-guide-page";

export const metadata: Metadata = {
  title: "Kullanım Kılavuzu",
  description:
    "Geotechnical Insights Hub: hesap, proje ve sondaj yönetimi, araç kullanımı, kayıt, grafikler ve rapor alma.",
};

export default function KullanimKilavuzuPage() {
  return <UserGuidePage />;
}

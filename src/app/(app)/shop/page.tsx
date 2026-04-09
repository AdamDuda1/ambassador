import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslatedPageMetadata } from "@/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return getTranslatedPageMetadata("shop.metadata.title");
}

export default async function ShopPage() {
  redirect("/dashboard");
}

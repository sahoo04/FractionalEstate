"use client";

import { MainLayout } from "@/components/layouts/MainLayout";
import { ExplorerContent } from "@/components/explorer/ExplorerContent";

export default function ExplorerPage({
  params,
}: {
  params: { wallet: string };
}) {
  return (
    <MainLayout>
      <ExplorerContent wallet={params.wallet} />
    </MainLayout>
  );
}

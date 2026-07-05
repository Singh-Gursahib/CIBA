"use server";

import { revalidatePath } from "next/cache";
import { patchDiscovery, markAllSeen } from "./data";
import type { DiscoveryStatus } from "@/types/grants";

export async function setDiscoveryStatus(id: string, status: DiscoveryStatus) {
  await patchDiscovery(id, { status });
  revalidatePath("/grants");
}

export async function markDiscoveriesSeen() {
  await markAllSeen();
  revalidatePath("/grants");
  revalidatePath("/");
}

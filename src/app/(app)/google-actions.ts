"use server";

// Google-Konto wieder trennen (gespeicherte Tokens loeschen).
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function disconnectGoogle() {
  const session = await auth();
  if (!session?.user?.id) return;
  await prisma.googleAccount.deleteMany({ where: { userId: session.user.id } });
  revalidatePath("/kalender");
  revalidatePath("/mails");
  revalidatePath("/");
}

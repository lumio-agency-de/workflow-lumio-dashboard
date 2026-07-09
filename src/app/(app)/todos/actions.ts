"use server";

// Server-Funktionen fuer die To-Do-Liste (anlegen, abhaken, loeschen).
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
}

export async function createTodo(formData: FormData) {
  await requireAuth();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  await prisma.todo.create({ data: { text } });
  revalidatePath("/todos");
  revalidatePath("/");
}

export async function toggleTodo(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) return;
  await prisma.todo.update({ where: { id }, data: { done: !todo.done } });
  revalidatePath("/todos");
  revalidatePath("/");
}

export async function deleteTodo(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.todo.delete({ where: { id } });
  revalidatePath("/todos");
  revalidatePath("/");
}

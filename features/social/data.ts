import "server-only";
import { readJson, updateJson } from "@/lib/store/json";
import type { SocialPost } from "@/types/social";

const POSTS_FILE = "social/posts.json";

export async function listPosts(): Promise<SocialPost[]> {
  const posts = await readJson<SocialPost[]>(POSTS_FILE, []);
  return [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(id: string): Promise<SocialPost | undefined> {
  const posts = await readJson<SocialPost[]>(POSTS_FILE, []);
  return posts.find((p) => p.id === id);
}

export async function insertPost(post: SocialPost): Promise<void> {
  await updateJson<SocialPost[]>(POSTS_FILE, [], (posts) => [...posts, post]);
}

export async function patchPost(
  id: string,
  patch: Partial<SocialPost> | ((post: SocialPost) => SocialPost)
): Promise<SocialPost | undefined> {
  let result: SocialPost | undefined;
  await updateJson<SocialPost[]>(POSTS_FILE, [], (posts) =>
    posts.map((p) => {
      if (p.id !== id) return p;
      result = typeof patch === "function" ? patch(p) : { ...p, ...patch };
      return result;
    })
  );
  return result;
}

export async function deletePost(id: string): Promise<void> {
  await updateJson<SocialPost[]>(POSTS_FILE, [], (posts) => posts.filter((p) => p.id !== id));
}

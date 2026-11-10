"use client";

import { SCHEMA_VERSION, parseDocument, type HouseDocument } from "@/domain/document";
import { getSupabase } from "./supabase/client";

export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: string;
  document: HouseDocument | null;
};

export type Project = { id: string; name: string; updatedAt: string; document: HouseDocument };

type Row = { id: string; name: string; updated_at: string; document: unknown };

const COLUMNS = "id, name, updated_at, document";

function toSummary(row: Row): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updated_at,
    document: parseDocument(row.document),
  };
}

/** 내 프로젝트 목록 (최근 수정 순). RLS가 본인 것만 돌려준다 */
export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(toSummary);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const document = parseDocument((data as Row).document);
  if (!document) throw new Error("저장된 문서 형식을 읽을 수 없어요");
  return { id: data.id, name: data.name, updatedAt: data.updated_at, document };
}

export async function createProject(document: HouseDocument): Promise<string> {
  const { data, error } = await getSupabase()
    .from("projects")
    .insert({ name: document.name, document, schema_version: SCHEMA_VERSION })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveProject(id: string, document: HouseDocument): Promise<string> {
  const { data, error } = await getSupabase()
    .from("projects")
    .update({ name: document.name, document, schema_version: SCHEMA_VERSION })
    .eq("id", id)
    .select("updated_at")
    .single();
  if (error) throw error;
  return data.updated_at as string;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getSupabase().from("projects").delete().eq("id", id);
  if (error) throw error;
}

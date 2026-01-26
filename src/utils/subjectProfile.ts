import { v5 as uuidv5 } from "uuid";
import { normalizeText } from "./textFilter";

const SUBJECT_PROFILE_NAMESPACE = "14923a76-bfe8-4f7a-aa67-0a492adefaf3";
const SUBJECT_PROFILE_MAX_LENGTH = 255;
const SUBJECT_PROFILE_HASH_CHARS = 6;

const normalizeRawText = (value: string | null | undefined): string => {
  return normalizeText(value ?? "");
};

export const generateSubjectProfileId = (subjectName: string | null | undefined): string | null => {
  if (!subjectName) return null;
  const normalizedName = normalizeRawText(subjectName);
  if (!normalizedName) return null;

  if (normalizedName.length <= SUBJECT_PROFILE_MAX_LENGTH) {
    return normalizedName;
  }

  const hash = uuidv5(normalizedName, SUBJECT_PROFILE_NAMESPACE)
    .replace(/-/g, "")
    .slice(0, SUBJECT_PROFILE_HASH_CHARS);
  return `${normalizedName.slice(0, SUBJECT_PROFILE_MAX_LENGTH - SUBJECT_PROFILE_HASH_CHARS)}${hash}`;
};

const normalizeProfileEntry = (value: string | null | undefined): string => {
  if (!value) return "";
  const generatedId = generateSubjectProfileId(value);
  if (generatedId) return generatedId;
  return normalizeRawText(value);
};

export const teacherCanTeachSubject = (
  perfil: string[] | null | undefined,
  subjectId?: string | null,
  subjectName?: string | null
): boolean => {
  if (!perfil || perfil.length === 0) return false;

  const normalizedPerfil = new Set<string>();
  perfil.forEach((entry) => {
    const normalizedEntry = normalizeProfileEntry(entry);
    if (normalizedEntry) {
      normalizedPerfil.add(normalizedEntry);
    }
  });

  if (subjectId) {
    const normalizedSubjectId = normalizeProfileEntry(subjectId);
    if (normalizedSubjectId && normalizedPerfil.has(normalizedSubjectId)) {
      return true;
    }
  }

  const profileIdFromName = generateSubjectProfileId(subjectName);
  if (!profileIdFromName) return false;
  const normalizedProfileId = normalizeProfileEntry(profileIdFromName);
  return normalizedPerfil.has(normalizedProfileId);
};

export const shareProfileSubjects = (perfilA?: string[] | null, perfilB?: string[] | null): boolean => {
  if (!perfilA?.length || !perfilB?.length) return false;
  const normalizedSetA = new Set<string>();
  perfilA.forEach((entry) => {
    const normalizedEntry = normalizeProfileEntry(entry);
    if (normalizedEntry) normalizedSetA.add(normalizedEntry);
  });
  return perfilB.some((entry) => {
    const normalizedEntry = normalizeProfileEntry(entry);
    return normalizedEntry ? normalizedSetA.has(normalizedEntry) : false;
  });
};

import { v5 as uuidv5 } from 'uuid'
import Subjects from '#models/subjects.js'

const SUBJECT_PROFILE_NAMESPACE = '14923a76-bfe8-4f7a-aa67-0a492adefaf3'
const SUBJECT_PROFILE_MAX_LENGTH = 255
const SUBJECT_PROFILE_HASH_CHARS = 6
const SUBJECT_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000

let cachedMaps = null
let cachedMapsTimestamp = 0

export function normalizeProfileEntry(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase()
    .replace(/\s/g, '')
}

export function generateSubjectProfileId(subjectName) {
  if (!subjectName) return null

  const normalizedName = normalizeProfileEntry(subjectName)
  if (!normalizedName) return null

  if (normalizedName.length <= SUBJECT_PROFILE_MAX_LENGTH) {
    return normalizedName
  }

  const hash = uuidv5(normalizedName, SUBJECT_PROFILE_NAMESPACE)
    .replace(/-/g, '')
    .slice(0, SUBJECT_PROFILE_HASH_CHARS)

  return `${normalizedName.slice(0, SUBJECT_PROFILE_MAX_LENGTH - SUBJECT_PROFILE_HASH_CHARS)}${hash}`
}

export async function buildSubjectProfileMaps() {
  const subjects = await Subjects.findAll({ attributes: ['id', 'name'], raw: true })
  const byLegacyId = new Map()
  const byNormalizedId = new Map()

  subjects.forEach((subject) => {
    const normalizedId = generateSubjectProfileId(subject.name)
    if (normalizedId) {
      byNormalizedId.set(normalizedId, subject.name)
    }
    byLegacyId.set(subject.id, subject.name)
  })

  return { byLegacyId, byNormalizedId }
}

export async function getSubjectProfileMaps({ forceRefresh = false } = {}) {
  const isCacheExpired = Date.now() - cachedMapsTimestamp > SUBJECT_PROFILE_CACHE_TTL_MS
  if (!cachedMaps || forceRefresh || isCacheExpired) {
    cachedMaps = await buildSubjectProfileMaps()
    cachedMapsTimestamp = Date.now()
  }
  return cachedMaps
}

export function resolveSubjectMetadata(subjectIdentifier, maps) {
  if (!subjectIdentifier) {
    return { normalizedId: null, subjectName: null, legacyId: null }
  }

  if (maps?.byLegacyId?.has(subjectIdentifier)) {
    const subjectName = maps.byLegacyId.get(subjectIdentifier)
    return {
      normalizedId: generateSubjectProfileId(subjectName),
      subjectName,
      legacyId: subjectIdentifier
    }
  }

  const normalizedSubjectId = normalizeProfileEntry(subjectIdentifier)
  if (normalizedSubjectId && maps?.byNormalizedId?.has(normalizedSubjectId)) {
    return {
      normalizedId: normalizedSubjectId,
      subjectName: maps.byNormalizedId.get(normalizedSubjectId),
      legacyId: null
    }
  }

  return {
    normalizedId: normalizedSubjectId || null,
    subjectName: null,
    legacyId: null
  }
}

export function formatPerfilRecord(perfil, maps) {
  const metadata = resolveSubjectMetadata(perfil?.subject_id || perfil?.subject_name, maps)
  const normalizedId = metadata.normalizedId || perfil?.subject_id || null
  const subjectName = perfil?.subject_name || metadata.subjectName || perfil?.subject_id || null

  return {
    ...perfil,
    subject_id: normalizedId,
    subject_name: subjectName,
    legacy_subject_id: metadata.legacyId && metadata.legacyId !== normalizedId ? metadata.legacyId : null
  }
}

export async function formatPerfilRecords(perfiles) {
  const maps = await getSubjectProfileMaps()
  return perfiles.map((perfil) => formatPerfilRecord(perfil, maps))
}

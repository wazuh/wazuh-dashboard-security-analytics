export const ALLOWED_ENRICHMENTS = [
  'geo',
  'hash_sha256',
  'hash_sha1',
  'hash_md5',
  'url_domain',
  'url_full',
  'connection',
] as const;

export type EnrichmentType = typeof ALLOWED_ENRICHMENTS[number];

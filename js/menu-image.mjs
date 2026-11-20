const pathSegment = '[A-Za-z0-9_-][A-Za-z0-9._-]*';
const localImage = new RegExp('^/?(?:' + pathSegment + '/)*' + pathSegment + '\\.(?:avif|gif|ico|jpeg|jpg|png|svg|webp)$', 'i');
const publicImage = new RegExp('^/storage/v1/object/public/' + pathSegment + '/(?:' + pathSegment +
  '/)*' + pathSegment + '\\.(?:jpeg|jpg|png|webp)$', 'i');

export function menuImageUrl(value, projectUrl) {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (localImage.test(candidate)) return candidate;
  try {
    const {origin, protocol} = new URL(projectUrl);
    if ((protocol === 'https:' || protocol === 'http:') && candidate.startsWith(origin + '/') &&
        publicImage.test(candidate.slice(origin.length))) return candidate;
  } catch {
    // A missing project URL disables Storage URLs.
  }
  return '';
}

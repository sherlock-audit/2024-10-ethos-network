export function useIsExternalReferer() {
  const referrer = document.referrer;

  return !referrer.includes(window.location.hostname);
}

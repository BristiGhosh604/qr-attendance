export function navigateTo(path, { replace = false } = {}) {
  const nextHash = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
    window.dispatchEvent(new Event('hashchange'));
  } else {
    window.location.hash = nextHash;
  }
}

export function currentRoute() {
  const route = window.location.hash.replace(/^#/, '');
  return route.startsWith('/') ? route : '/';
}

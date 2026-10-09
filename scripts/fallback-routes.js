/*
 * Fallback routes: URLs without their own document that one template document renders,
 * e.g. every /celulares/{sku} is painted by the celulares/producto document (product-detail
 * reads the sku from the URL).
 *
 * Called only by 404.html, before scripts.js: Edge Delivery answers 404 for /celulares/{sku}
 * (there is no document with that name), so the 404 page loads the template document into
 * <main> and then scripts.js decorates it like any page. Any other missing URL keeps the
 * normal 404 page. With folder mapping in the site configuration (/celulares/ →
 * /celulares/producto) the server answers the template directly and this file is not used.
 *
 * To add a route: { folder: '/accesorios/', page: '/accesorios/producto' }.
 */
const FALLBACK_ROUTES = [
  { folder: '/celulares/', page: '/celulares/producto' },
];

/**
 * The template page for the current URL: one more part after a route folder
 * (/celulares/iph-15-128-blk → /celulares/producto); the template itself does not count.
 * @param {string} pathname
 * @returns {string|null}
 */
function findFallbackPage(pathname) {
  const route = FALLBACK_ROUTES.find(({ folder }) => pathname.startsWith(folder));
  if (!route) return null;
  const rest = pathname.slice(route.folder.length);
  if (!rest || rest.includes('/') || pathname === route.page) return null;
  return route.page;
}

/**
 * Puts the template document in <main> and copies its title and description, so scripts.js
 * decorates it as a normal page.
 * @returns {Promise<boolean>} true when a template was rendered
 */
export default async function renderFallbackRoute() {
  const page = findFallbackPage(window.location.pathname);
  if (!page) return false;
  try {
    const response = await fetch(page);
    if (!response.ok) return false;
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const content = doc.querySelector('main');
    const main = document.querySelector('main');
    if (!content || !main) return false;

    // media of the template page are relative to it (./media_…)
    const pageUrl = new URL(page, window.location);
    content.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((media) => {
      const attr = media.tagName === 'IMG' ? 'src' : 'srcset';
      media.setAttribute(attr, new URL(media.getAttribute(attr), pageUrl).href);
    });
    main.className = '';
    main.replaceChildren(...[...content.childNodes].map((node) => document.importNode(node, true)));

    const title = doc.querySelector('title')?.textContent
      || doc.querySelector('meta[property="og:title" i]')?.content;
    if (title) document.title = title;
    const description = doc.querySelector('meta[name="description" i]')?.content;
    if (description) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.append(meta);
    }
    window.isErrorPage = false;
    return true;
  } catch {
    return false;
  }
}

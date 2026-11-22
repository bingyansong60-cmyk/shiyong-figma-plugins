const catalogImageFallbacks = new Map();

function fillCatalogImages(plugin) {
  if (!/^\d{15,22}$/.test(plugin.id) || !plugin.url) return;

  const params = '?resource_id=' + plugin.id + '&resource_type=plugin';
  function communityImage(kind, fallback = '') {
    const url = 'https://www.figma.com/community/' + kind + params;
    catalogImageFallbacks.set(url, fallback);
    return url;
  }

  const local = globalThis.catalogCommunityMedia[plugin.id];
  if (local?.icon) {
    plugin.logo = 'community-media/' + plugin.id + '-icon.webp';
    plugin.logoSize = [128, 128];
  } else if (!plugin.logo) {
    plugin.logo = communityImage('icon');
  }

  if (local?.cover) {
    if (!plugin.images?.length || (plugin.imageSizes?.[0]?.[0] ?? 0) < 960) {
      plugin.images = [
        'community-media/' + plugin.id + '-cover.webp',
        ...(plugin.images?.slice(1) || [])
      ];
      plugin.imageSizes = [local.cover, ...(plugin.imageSizes?.slice(1) || [])];
      plugin.communityMedia = true;
    }
  } else if (!plugin.images?.length || (plugin.imageSizes?.[0]?.[0] ?? 0) < 960) {
    plugin.images = [
      communityImage('thumbnail', plugin.images?.[0]),
      ...(plugin.images?.slice(1) || [])
    ];
    plugin.imageSizes = [[1920, 1080], ...(plugin.imageSizes?.slice(1) || [])];
    plugin.communityMedia = true;
  }
}

document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !catalogImageFallbacks.has(image.src)) return;
  const fallback = catalogImageFallbacks.get(image.src);
  if (fallback) {
    image.src = fallback;
    return;
  }
  if (image.matches('.plugin-logo')) {
    const label = document.createElement('span');
    label.className = 'logo-empty';
    label.setAttribute('aria-label', '社区图标暂不可用');
    image.replaceWith(label);
    return;
  }

  const button = image.closest('.gallery-image');
  if (!button) return;
  const label = document.createElement('small');
  label.textContent = '社区封面暂不可用';
  button.classList.add('gallery-unavailable');
  button.replaceChildren(label);
}, true);

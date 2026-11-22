const catalogImageFallbacks = new Map();
const catalogPalettes = [
  ['#edf1ff', '#4055bd'], ['#e7f6ef', '#286a54'], ['#fff1e4', '#a04b26'],
  ['#f3edfc', '#7046a6'], ['#e6f5f9', '#286b80'], ['#fff0f3', '#9a4566']
];

function fillCatalogImages(plugin) {
  const [light, dark] = catalogPalettes[Number(plugin.i) % catalogPalettes.length];
  const xml = value => String(value).replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;'})[char]);
  const svg = markup => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup)
    .replaceAll("'", '%27');
  const initials = xml(plugin.name.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    .slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase() || 'F');
  const name = xml(Array.from(plugin.name).slice(0, 40).join(''));
  const purpose = xml(Array.from(plugin.cn || plugin.cat).slice(0, 27).join(''));
  const category = xml(plugin.cat);
  const logo = () => svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="21" fill="${light}"/><text x="48" y="59" text-anchor="middle"
    fill="${dark}" font-family="sans-serif" font-size="32" font-weight="700">${initials}</text></svg>`);
  const cover = () => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"
    viewBox="0 0 960 540"><rect width="960" height="540" fill="${light}"/>
    <circle cx="854" cy="420" r="238" fill="${dark}" opacity=".07"/>
    <circle cx="854" cy="420" r="157" fill="none" stroke="${dark}" stroke-width="2" opacity=".3"/>
    <rect x="704" y="138" width="156" height="156" rx="40" fill="${dark}"/>
    <g font-family="system-ui,sans-serif" fill="${dark}">
      <text x="782" y="241" text-anchor="middle" fill="white" font-size="64" font-weight="700">${initials}</text>
      <text x="70" y="106" font-size="25">拾用 · 功能示意 · ${category}</text>
      <text x="70" y="265" font-size="41" font-weight="700">${name}</text>
      <text x="70" y="326" font-size="30">${purpose}</text>
    </g></svg>`);
  const community = /^\d{15,22}$/.test(plugin.id) ? '?resource_id=' + plugin.id + '&resource_type=plugin' : '';
  function source(type, fallback) {
    if (!community || !plugin.url) return fallback();
    const url = 'https://www.figma.com/community/' + type + community;
    catalogImageFallbacks.set(url, {fallback, type});
    return url;
  }
  if (!plugin.logo) {
    plugin.logo = source('icon', logo);
    plugin.logoSize = [96, 96];
  }
  if (!plugin.images?.length) {
    plugin.images = [source('thumbnail', cover)];
    plugin.imageSizes = [[960, 540]];
    plugin.communityMedia = Boolean(community && plugin.url);
  }
}

document.addEventListener('error', event => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  const entry = catalogImageFallbacks.get(image.src);
  if (!entry) return;
  image.alt = entry.type === 'thumbnail' ? '拾用功能示意' : '拾用插件识别图标';
  image.src = entry.fallback();
}, true);

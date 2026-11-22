async function loadCatalog() {
  const fetchFile = async file => {
    const response = await fetch(file);
    if (!response.ok) throw new Error(file + ' HTTP ' + response.status);
    return response;
  };
  const [base, additions] = await Promise.all([
    fetchFile('catalog-base.html').then(response => response.text()),
    fetchFile('catalog-additions.json').then(response => response.json())
  ]);

  const application = '<script>const data=';
  const start = base.indexOf(application);
  if (start < 0 || !Array.isArray(additions)) throw new Error('插件目录格式错误');
  const split = start + application.length;
  const records = JSON.stringify(additions).replaceAll('<', '\\u003c');
  const header = base.slice(0, start)
    .replaceAll('579 个', (579 + additions.length) + ' 个')
    .replace('按 Figma 社区首次上线年月归档；未核实的日期单独列出。', '按本站收录月份查看新增插件。')
    .replace('<span>本月收录</span>', '');
  const app = base.slice(split)
    .replace('for(const d of data){d.addedAt', 'data.forEach((d,i)=>{d.i=String(i);fillCatalogImages(d)});for(const d of data){d.addedAt')
    .replace('latestMonth=\'2026-10\'', 'latestMonth=null')
    .replace(/function releaseMonth\(d\)\{[^\n]+/, "function releaseMonth(d){return d.addedAt.slice(0,7)}")
    .replace("const months=[...known,...(data.some(d=>releaseMonth(d)==='unknown')?['unknown']:[])];", 'const months=known;')
    .replace("const label=m=>m==='unknown'?'上线时间待核实':m.replace('-',' 年 ')+' 月';", "const label=m=>m.replace('-',' 年 ')+' 月';")
    .replaceAll("b.communityPublishedAt||''", "b.addedAt||''")
    .replaceAll("a.communityPublishedAt||''", "a.addedAt||''")
    .replace("m?'来自用户提供的社区截图，2026-10-20 录入，非实时数据'", "m?esc(m.source+' · '+m.recordedAt+' 记录')")
    .replace('效果图 ${pos%photos.length+1}', "${d.communityMedia ? '社区封面' : '效果图 '+(pos%photos.length+1)}");
  document.open();
  document.write(header + '<script src="catalog-media.js"><\/script>' +
    application + app.replace('];\nconst $=', '].concat(' + records + ');\nconst $='));
  document.close();
}

loadCatalog().catch(error => {
  console.error(error);
  const status = document.getElementById('catalog-status');
  status.textContent = '插件目录加载失败，请刷新重试。';
});

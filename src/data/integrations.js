<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Anime Explorer</title>
  <style>
    :root{--bg:#0f1724;--card:#0b1220;--muted:#9aa4b2;--accent:#ff6b6b}
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial;background:linear-gradient(180deg,#071024 0%,var(--bg) 100%);color:#e6eef6}
    header{padding:18px 20px;display:flex;gap:12px;align-items:center;justify-content:space-between}
    .brand{display:flex;gap:12px;align-items:center}
    .logo{width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#ff9a9e,#fad0c4);display:flex;align-items:center;justify-content:center;font-weight:700;color:#071024}
    .title{font-size:18px;font-weight:700}
    .controls{display:flex;gap:8px;align-items:center}
    input[type=search]{padding:10px 12px;border-radius:10px;border:none;min-width:260px;background:#061222;color:inherit}
    select{padding:10px;border-radius:10px;border:none;background:#061222;color:inherit}
    main{padding:0 20px 60px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px}
    .card{background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);padding:10px;border-radius:10px;display:flex;flex-direction:column;gap:8px;cursor:pointer;transition:transform .12s}
    .card:hover{transform:translateY(-6px)}
    .thumb{width:100%;aspect-ratio:2/3;background:#08141f;border-radius:8px;object-fit:cover}
    .name{font-size:14px;font-weight:600;line-height:1.2}
    .sub{font-size:12px;color:var(--muted)}
    .load-more{display:block;margin:20px auto;padding:10px 18px;border-radius:8px;border:none;background:var(--accent);color:#071022;font-weight:700;cursor:pointer}
    .empty{padding:40px;text-align:center;color:var(--muted)}
    /* modal */
    .modal-backdrop{position:fixed;inset:0;background:rgba(2,6,23,0.65);display:none;align-items:center;justify-content:center;padding:18px}
    .modal{background:var(--card);max-width:900px;width:100%;border-radius:12px;padding:18px;display:grid;grid-template-columns:220px 1fr;gap:14px}
    .modal .thumb{aspect-ratio:3/4}
    .close{position:absolute;right:18px;top:14px;background:transparent;border:none;color:var(--muted);font-size:18px;cursor:pointer}
    footer{padding:18px;text-align:center;color:var(--muted)}
    @media (max-width:700px){.modal{grid-template-columns:1fr;}}
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo"><img src="logo.png" width="70" height="67"></div>
      <div>
        <div class="title">Anime Explorer</div>
        <div style="font-size:12px;color:var(--muted)">Search & browse anime powered by Jikan (MyAnimeList)</div>
      </div>
    </div>
    <div class="controls">
      <input id="search" type="search" placeholder="Search anime by title... (press Enter)" />
      <select id="filterType" title="Sort / filter">
        <option value="popularity">Sort by: Popularity</option>
        <option value="favorites">Sort by: Favorites</option>
        <option value="rating">Sort by: Score</option>
      </select>
      <button id="refresh" title="Refresh">⟳</button>
    </div>
  </header>
  <main>
    <section id="results" class="grid"></section>
    <div id="empty" class="empty" style="display:none">No results — try different keywords.</div>
    <button id="loadMore" class="load-more">Load more</button>
  </main>

  <div id="modalBackdrop" class="modal-backdrop">
    <div class="modal" role="dialog" aria-modal="true">
      <button id="modalClose" class="close">✕</button>
      <img id="modalThumb" class="thumb" src="" alt="poster" />
      <div>
        <h2 id="modalTitle" style="margin:0 0 6px 0"></h2>
        <div id="modalInfo" style="font-size:13px;color:var(--muted);margin-bottom:8px"></div>
        <p id="modalSynopsis" style="margin-top:8px;color:#dbe9fb"></p>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a id="malLink" href="#" target="_blank" rel="noopener" style="padding:8px 10px;border-radius:8px;background:#0b1622;color:var(--muted);text-decoration:none">Open on MyAnimeList</a>
          <button id="watchBtn" style="padding:8px 10px;border-radius:8px;border:none;background:var(--accent);color:#071022;font-weight:700">Watch (external)</button>
        </div>
      </div>
    </div>
  </div>

  <footer>Built with ❤️ • Data from Jikan (MyAnimeList)</footer>

  <script>
    // Simple Anime Explorer (Vanilla JS)
    // Uses Jikan REST API v4: https://api.jikan.moe/v4

    const resultsEl = document.getElementById('results');
    const emptyEl = document.getElementById('empty');
    const loadMoreBtn = document.getElementById('loadMore');
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('filterType');
    const refreshBtn = document.getElementById('refresh');

    // Modal elements
    const modalBackdrop = document.getElementById('modalBackdrop');
    const modalClose = document.getElementById('modalClose');
    const modalTitle = document.getElementById('modalTitle');
    const modalInfo = document.getElementById('modalInfo');
    const modalSynopsis = document.getElementById('modalSynopsis');
    const modalThumb = document.getElementById('modalThumb');
    const malLink = document.getElementById('malLink');
    const watchBtn = document.getElementById('watchBtn');

    let page = 1;
    let q = '';
    let isLoading = false;
    let lastResults = [];

    function buildCard(anime){
      const div = document.createElement('div');
      div.className = 'card';
      div.tabIndex = 0;
      div.innerHTML = `
        <img class="thumb" loading="lazy" src="${anime.images?.jpg?.image_url || ''}" alt="${escapeHtml(anime.title)}">
        <div class="name">${escapeHtml(anime.title)}</div>
        <div class="sub">${anime.type || ''} • ${anime.year || ''} • score: ${anime.score ?? '—'}</div>
      `;
      div.addEventListener('click', ()=> openDetails(anime.mal_id));
      div.addEventListener('keypress', (e)=>{ if(e.key === 'Enter') openDetails(anime.mal_id); });
      return div;
    }

    async function fetchAnime({query = '', page=1, order='popularity'}){
      isLoading = true;
      loadMoreBtn.disabled = true;
      loadMoreBtn.textContent = 'Loading...';
      try{
        const params = new URLSearchParams({q: query, page: page});
        // order_by mapping
        if(order === 'rating') params.set('order_by','score');
        else if(order === 'favorites') params.set('order_by','favorites');
        else params.set('order_by','popularity');
        // limit results per page
        params.set('limit','24');
        const url = `https://api.jikan.moe/v4/anime?${params.toString()}`;
        const res = await fetch(url);
        if(!res.ok) throw new Error('API error');
        const data = await res.json();
        isLoading = false;
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load more';
        return data;
      }catch(err){
        console.error(err);
        isLoading = false;
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load more';
        return {data:[], pagination:{has_next_page:false}};
      }
    }

    async function loadInitial(reset=false){
      if(isLoading) return;
      if(reset){ page = 1; resultsEl.innerHTML = ''; lastResults = []; }
      const order = filterSelect.value;
      const resp = await fetchAnime({query: q, page, order});
      const items = resp.data || [];
      if(items.length === 0 && page === 1){ emptyEl.style.display = 'block'; loadMoreBtn.style.display = 'none'; }
      else{ emptyEl.style.display = 'none'; loadMoreBtn.style.display = resp.pagination?.has_next_page ? 'block' : 'none'; }
      items.forEach(it => { lastResults.push(it); resultsEl.appendChild(buildCard(it)); });
      page += 1;
    }

    async function openDetails(mal_id){
      // fetch detailed anime
      try{
        const res = await fetch(`https://api.jikan.moe/v4/anime/${mal_id}/full`);
        if(!res.ok) throw new Error('failed');
        const json = await res.json();
        const a = json.data;
        modalTitle.textContent = a.title;
        modalInfo.textContent = `${a.type || ''} • ${a.year || ''} • Episodes: ${a.episodes ?? '—'} • Score: ${a.score ?? '—'}`;
        modalSynopsis.textContent = a.synopsis || 'No synopsis available.';
        modalThumb.src = a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || '';
        malLink.href = a.url || `https://myanimelist.net/anime/${mal_id}`;
        watchBtn.onclick = ()=> window.open(a.trailer?.url || a.url || `https://myanimelist.net/anime/${mal_id}`, '_blank');
        modalBackdrop.style.display = 'flex';
      }catch(err){ console.error(err); alert('Failed to load details. Try again.'); }
    }

    function closeModal(){ modalBackdrop.style.display = 'none'; }

    // helpers
    function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>\"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s])); }

    // events
    loadMoreBtn.addEventListener('click', ()=> loadInitial(false));
    filterSelect.addEventListener('change', ()=> loadInitial(true));
    refreshBtn.addEventListener('click', ()=> { q=''; searchInput.value=''; loadInitial(true); });

    searchInput.addEventListener('keypress', (e)=>{
      if(e.key === 'Enter'){
        q = searchInput.value.trim();
        loadInitial(true);
      }
    });

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e)=>{ if(e.target === modalBackdrop) closeModal(); });

    // initial load
    loadInitial(true);
  </script>
</body>
</html>

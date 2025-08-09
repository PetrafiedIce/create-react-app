(function(){
  const params = new URLSearchParams(location.search);
  const src = params.get('src');
  const loop = params.get('loop') === 'true';
  const controls = params.get('controls') === '1' || params.get('controls') === 'true';
  const stage = document.getElementById('stage');
  const overlay = document.getElementById('overlay');

  if(!src){
    showForm();
    return;
  }

  if(isYouTube(src)){
    createYouTubePlayer(src);
  } else if (src.endsWith('.m3u8')){
    createHlsPlayer(src);
  } else {
    showForm();
  }

  function isYouTube(val){
    return !!extractYouTubeId(val);
  }

  function extractYouTubeId(val){
    val = val.trim();
    if(/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;
    try {
      const u = new URL(val);
      if(u.hostname.includes('youtube.com')){
        if(u.searchParams.get('v')) return u.searchParams.get('v');
        const parts = u.pathname.split('/');
        const idx = parts.indexOf('embed');
        if(idx !== -1 && parts[idx+1]) return parts[idx+1];
      } else if(u.hostname === 'youtu.be'){
        return u.pathname.slice(1);
      }
    } catch(e) {}
    return null;
  }

  function createYouTubePlayer(input){
    const id = extractYouTubeId(input);
    if(!id){
      showForm();
      return;
    }
    let url = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&controls=${controls?1:0}&modestbranding=1`;
    if(loop){
      url += `&loop=1&playlist=${id}`;
    }
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.allow = 'autoplay; picture-in-picture';
    iframe.frameBorder = '0';
    iframe.className = 'player';
    iframe.allowFullscreen = true;
    stage.appendChild(iframe);
  }

  function createHlsPlayer(url){
    const video = document.createElement('video');
    video.className = 'player';
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.controls = false;
    if(loop) video.loop = true;

    if(video.canPlayType('application/vnd.apple.mpegURL')){
      video.src = url;
    } else if(window.Hls){
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
    }
    stage.appendChild(video);
    overlay.classList.remove('hidden');

    const attempt = video.play();
    if(attempt && typeof attempt.then === 'function'){
      attempt.catch(()=>{});
    }

    overlay.addEventListener('click', function handler(){
      overlay.classList.add('hidden');
      video.muted = false;
      video.play();
    }, {once:true});
  }

  function showForm(){
    const form = document.createElement('form');
    form.className = 'center';
    form.innerHTML = `
      <input type="text" name="src" placeholder="YouTube link or .m3u8 URL" required>
      <button type="submit">Load</button>
    `;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const val = form.src.value.trim();
      if(val){
        location.href = '?src=' + encodeURIComponent(val);
      }
    });
    stage.appendChild(form);
  }

  function toggleFullscreen(){
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen();
    }
  }
  document.addEventListener('dblclick', toggleFullscreen);
  document.addEventListener('keydown', e => {
    if(e.key.toLowerCase() === 'f') toggleFullscreen();
  });
})();

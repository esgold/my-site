// Weather widget script — uses Open-Meteo (no API key) and browser geolocation.
(function(){
  const el = document.getElementById('weather');
  if(!el) return;

  function setContent(temp, emoji, desc){
    el.innerHTML = '';
    const e = document.createElement('div'); e.className='weather-emoji'; e.textContent = emoji;
    const info = document.createElement('div'); info.className = 'weather-info';
    const t = document.createElement('p'); t.className='weather-temp'; t.textContent = `${Math.round(temp)}°F`;
    const d = document.createElement('p'); d.className='weather-desc'; d.textContent = desc;
    info.appendChild(t); info.appendChild(d);
    el.appendChild(e); el.appendChild(info);
  }

  function weatherCodeToEmoji(code){
    // Open-Meteo weathercode mapping simplified
    if(code === 0) return ['☀️','Clear'];
    if(code >=1 && code <=3) return ['⛅','Partly cloudy'];
    if(code === 45 || code === 48) return ['🌫️','Fog'];
    if(code >=51 && code <=67) return ['🌦️','Drizzle/Snow mix'];
    if(code >=71 && code <=77) return ['❄️','Snow'];
    if(code >=80 && code <=82) return ['🌧️','Rain showers'];
    if(code >=95 && code <=99) return ['⛈️','Thunderstorm'];
    return ['☁️','Cloudy'];
  }

  function showError(msg){ el.textContent = msg; }

  function fetchWeather(lat, lon){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&daily=temperature_2m_max,weathercode&timezone=auto`;
    fetch(url).then(r=>{
      if(!r.ok) throw new Error('Weather fetch failed');
      return r.json();
    }).then(data=>{
      if(!data || !data.current_weather) throw new Error('No weather data');
      const cw = data.current_weather;
      const temp = cw.temperature;
      const code = cw.weathercode;
      const [emoji, desc] = weatherCodeToEmoji(code);
      setContent(temp, emoji, desc);
      // Render 3-day forecast if available
      const fEl = document.getElementById('forecast');
      if(fEl && data.daily && data.daily.time){
        fEl.innerHTML = '';
        // use today + next 2 days (chronological left-to-right)
        const times = data.daily.time.slice(0,3);
        const temps = (data.daily.temperature_2m_max || []).slice(0,3);
        const codes = (data.daily.weathercode || []).slice(0,3);
        for(let i=0;i<times.length;i++){
          const day = document.createElement('div'); day.className='forecast-day';
          const em = document.createElement('div'); em.className='forecast-emoji'; em.textContent = weatherCodeToEmoji(codes[i]||-1)[0];
          const text = document.createElement('div'); text.className='forecast-text';
          const tp = document.createElement('div'); tp.className='forecast-temp'; tp.textContent = `${Math.round(temps[i]||temp)}°`;
          const dt = new Date(times[i]);
          const label = document.createElement('div'); label.className='forecast-label'; label.textContent = dt.toLocaleDateString(undefined,{weekday:'short'}).slice(0,3);
          text.appendChild(tp); text.appendChild(label);
          day.appendChild(em); day.appendChild(text);
          fEl.appendChild(day);
        }
        // after rendering, measure and set offset so the main card shifts left by exactly the forecast width + gap
        requestAnimationFrame(()=>{
          const anchor = document.querySelector('.weather-anchor');
          if(anchor){
            const gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--forecast-gap')) || 16;
            const width = Math.ceil(fEl.getBoundingClientRect().width + gap);
            anchor.style.setProperty('--forecast-offset', width + 'px');
          }
        });
      }
    }).catch(err=>{
      console.error(err);
      showError('Weather unavailable');
    });
  }

  if('geolocation' in navigator){
    navigator.geolocation.getCurrentPosition(pos=>{
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    }, err=>{
      console.warn('Geolocation error', err);
      // If the user denied permission, show a friendly, actionable message.
      // GeolocationPositionError.PERMISSION_DENIED is usually code === 1.
      if(err && (err.code === 1)){
        showError('Enable location to see your weather');
      } else {
        showError('Location unavailable');
      }
    }, {timeout:10000});
  } else {
    showError('Geolocation not supported');
  }
})();

// Improve card hover expansion to avoid flicker: toggle .is-expanded class on mouseenter/leave
(function(){
  const grid = document.querySelector('.grid');
  if(!grid) return;
  const cards = Array.from(grid.querySelectorAll('.card'));
  let active = null;

  function expandCard(card){
    if(active === card) return;
    collapseActive();
    card.classList.add('is-expanded');
    grid.classList.add('grid-hovering');
    active = card;
  }

  function collapseActive(){
    if(!active) return;
    active.classList.remove('is-expanded');
    grid.classList.remove('grid-hovering');
    active = null;
  }

  cards.forEach(card=>{
    card.addEventListener('mouseenter', ()=> expandCard(card));
    card.addEventListener('mouseleave', ()=> collapseActive());
    // also support focus/blur for keyboard
    card.addEventListener('focusin', ()=> expandCard(card));
    card.addEventListener('focusout', ()=> collapseActive());
  });

  // collapse on scroll or resize to avoid misplacement
  window.addEventListener('scroll', collapseActive, {passive:true});
  window.addEventListener('resize', collapseActive);
})();

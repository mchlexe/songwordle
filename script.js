let currentYTUrl = "";
let ytWindow = null;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

document.addEventListener("DOMContentLoaded", () => {
    loadSearchHistory();

    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const ytPopupBtn = document.getElementById('yt-popup-btn');
    const verifyBtn = document.getElementById('verify-btn');

    // Mapeia o Enter na caixa de pesquisa
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            searchSong();
        }
    });

    // Mapeia os cliques nos botões
    searchBtn.addEventListener('click', searchSong);
    ytPopupBtn.addEventListener('click', openYouTubePopup);
    verifyBtn.addEventListener('click', checkAnswers);
});

// Gerencia o histórico salvo no navegador
function loadSearchHistory() {
    const history = JSON.parse(localStorage.getItem("songwordle_history") || "[]");
    const datalist = document.getElementById("search-history");
    datalist.innerHTML = "";
    history.forEach(item => {
        const option = document.createElement("option");
        option.value = item;
        datalist.appendChild(option);
    });
}

function saveSearch(query) {
    let history = JSON.parse(localStorage.getItem("songwordle_history") || "[]");
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase()); // Evita duplicados
    history.unshift(query);
    if (history.length > 10) history.pop(); // Mantém apenas as 10 últimas buscas
    localStorage.setItem("songwordle_history", JSON.stringify(history));
    loadSearchHistory();
}

async function searchSong() {
    const input = document.getElementById('search-input');
    const btn = document.getElementById('search-btn');
    const q = input.value.trim();
    const appContent = document.getElementById('app-content');
    const info = document.getElementById('song-info');
    
    if(!q) return alert("Digite o nome da música.");

    saveSearch(q);
    input.blur(); // Remove foco para fechar teclados mobile

    btn.innerText = 'Buscando...';
    info.innerHTML = 'Procurando letra...';
    appContent.style.display = 'none';

    try {
        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const song = data.find(d => d.plainLyrics);

        if (song) {
            info.innerHTML = `Música: <strong>${song.trackName}</strong> - ${song.artistName}`;
            
            // Hack usando DuckDuckGo (!ducky) para pular a pesquisa e ir direto pro vídeo "Official Audio"
            const searchQuery = `!ducky site:youtube.com ${song.artistName} ${song.trackName} official audio`;
            currentYTUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;
            
            // Se o pop-up já estiver aberto, este comando atualiza a mesma janela (não abre outra)
            if (ytWindow && !ytWindow.closed) {
                ytWindow = window.open(currentYTUrl, "SongWordleYT");
            }

            processLyrics(song.plainLyrics);
            appContent.style.display = 'flex';
        } else {
            info.innerHTML = 'Nenhuma letra encontrada. Tente outra música.';
        }
    } catch (e) {
        info.innerHTML = 'Erro na busca.';
    }
    btn.innerText = 'Buscar';
}

function openYouTubePopup() {
    if (currentYTUrl) {
        // A tag "SongWordleYT" obriga o navegador a usar sempre a mesma aba/janela, prevenindo flood
        ytWindow = window.open(currentYTUrl, "SongWordleYT", "width=800,height=600,menubar=no,toolbar=no,location=no,status=no");
    }
}

function processLyrics(lyrics) {
    const container = document.getElementById('lyrics-container');
    container.innerHTML = '';
    const lines = lyrics.split('\n'); 

    lines.forEach(line => {
        if (!line.trim()) { 
            container.innerHTML += '<br>'; 
            return; 
        }
        const words = line.split(' ');
        
        // Pula palavras muito curtas para facilitar
        if (words.length > 3) {
            let targetIdx = -1, attempts = 0;
            while (targetIdx === -1 && attempts < 10) {
                let idx = Math.floor(Math.random() * words.length);
                let cleanWord = words[idx].replace(/[^a-zA-Z0-9]/g, '');
                if (cleanWord.length >= 3) targetIdx = idx;
                attempts++;
            }
            
            if (targetIdx !== -1) {
                let cleanWord = words[targetIdx].replace(/[^a-zA-Z0-9]/g, '');
                words[targetIdx] = words[targetIdx].replace(cleanWord, `<input type="text" class="blank-input" data-answer="${cleanWord.toLowerCase()}" style="width: ${cleanWord.length + 1}ch;" maxlength="${cleanWord.length}">`);
            }
        }
        container.innerHTML += words.join(' ') + '<br>';
    });
}

function checkAnswers() {
    let correct = 0;
    const inputs = document.querySelectorAll('.blank-input');
    
    inputs.forEach(i => {
        if (i.value.trim().toLowerCase() === i.getAttribute('data-answer')) {
            i.classList.add('correct'); 
            i.disabled = true; 
            i.style.borderColor = 'var(--correct-color)'; 
            correct++;
        } else {
            i.style.borderColor = '#d32f2f';
        }
    });
    
    if (inputs.length > 0) {
        if (correct === inputs.length) {
            alert('Parabéns! Você acertou tudo!');
        } else {
            alert(`Você acertou ${correct} de ${inputs.length} palavras.`);
        }
    }
}
const products = [
    { id: '1', category: 'hamburger', name: 'Hamburger di Trota', sheetColumn: 'B', emoji: '🍔', desc: '100% trota, speziato.', price: '3,00/pz' },
    { id: '2', category: 'surgelato', name: 'Filetto Surgelato', sheetColumn: 'C', emoji: '❄️', desc: 'Pulito e abbattuto sottovuoto.', price: '20,00/kg' },
    { id: '3', category: 'affumicato', name: 'Filetto Affumicato', sheetColumn: 'D', emoji: '🔥', desc: 'Affumicatura a legna tradizionale.', price: '30,00/kg' },
    { id: '4', category: 'affumicato', name: 'Filetto Affumicato allo Speck', sheetColumn: 'E', emoji: '🔥', desc: 'Affumicatura a legna tradizionale.', price: '30,00/kg' },
    { id: '5', category: 'marinato', name: 'Vasetto Marinato', sheetColumn: 'F', emoji: '🥫', desc: 'In olio e erbe aromatiche.', price: '5,00/pz' },
    { id: '6', category: 'marinato', name: 'Vasetto Marinato con Porro e Sedano', sheetColumn: 'G', emoji: '🥫', desc: 'In olio e erbe aromatiche.', price: '5,00/pz' }
];

let cart = {}; 
let currentFilter = 'all';

// ⚠️ SOSTITUISCI CON L'URL DEL TUO WEB APP DI GOOGLE APPS SCRIPT
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxfHQbIfgmu7APL3aQurbua4i057qr3q00c3fobhdS3ZfmTyO9L7pMko3bob1ZkjlLOog/exec';

function render() {
    const grid = document.getElementById('productsGrid');
    const filtered = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
    
    grid.innerHTML = filtered.map(p => {
        const qty = cart[p.id] || 0;
        return `
            <div class="product-card">
                <div class="product-emoji">${p.emoji}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
                <div class="product-meta">
                    <span>💰 €${p.price}</span>
                </div>
                <div class="qty-controls ${qty > 0 ? 'has-items' : ''}" data-id="${p.id}">
                    <button class="qty-btn qty-minus" onclick="updateQty('${p.id}', -1)">−</button>
                    <span class="qty-display">${qty}</span>
                    <button class="qty-btn qty-plus" onclick="updateQty('${p.id}', 1)">+</button>
                    <button class="btn-add" onclick="updateQty('${p.id}', 1)">🛒 Aggiungi</button>
                </div>
            </div>
        `;
    }).join('');

    updateCartUI();
}

function updateQty(id, delta) {
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    render();
}

function updateCartUI() {
    const summary = document.getElementById('cartSummary');
    const cartText = document.getElementById('cartText');
    
    const items = Object.entries(cart);
    const total = items.reduce((acc, curr) => acc + curr[1], 0);

    if (total > 0) {
        summary.style.display = 'flex';
        cartText.innerText = `Articoli nel carrello: ${total}`;
    } else {
        summary.style.display = 'none';
    }
}

// Gestione filtri
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    };
});

// Svuota carrello
document.getElementById('btnClearCart').onclick = () => {
    cart = {};
    render();
};

// Apri modale ordine
document.getElementById('btnOpenOrder').onclick = () => {
    if (Object.keys(cart).length === 0) {
        showToast('⚠️ Il carrello è vuoto!', 'error');
        return;
    }
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('customerName').value = '';
    document.getElementById('modalError').style.display = 'none';
    setTimeout(() => document.getElementById('customerName').focus(), 100);
};

// Chiudi modale
document.getElementById('btnCancelOrder').onclick = () => {
    document.getElementById('modalOverlay').style.display = 'none';
};

// Click fuori dal modale per chiudere
document.getElementById('modalOverlay').onclick = (e) => {
    if (e.target === document.getElementById('modalOverlay')) {
        document.getElementById('modalOverlay').style.display = 'none';
    }
};

// Invio ordine
document.getElementById('btnConfirmOrder').onclick = async () => {
    const name = document.getElementById('customerName').value.trim();
    
    if (!name || name.length < 2) {
        document.getElementById('modalError').style.display = 'block';
        document.getElementById('customerName').focus();
        return;
    }

    document.getElementById('btnConfirmOrder').disabled = true;
    document.getElementById('btnConfirmOrder').innerHTML = '⏳ Invio in corso...';

    try {
        await sendToGoogleSheet(name);
        document.getElementById('modalOverlay').style.display = 'none';
        showToast('✅ Ordine inviato con successo!', 'success');
        cart = {};
        render();
    } catch (error) {
        console.error('Errore invio ordine:', error);
        showToast('❌ Errore nell\'invio. Riprova.', 'error');
    } finally {
        document.getElementById('btnConfirmOrder').disabled = false;
        document.getElementById('btnConfirmOrder').innerHTML = '✅ Invia Ordine';
    }
};

async function sendToGoogleSheet(customerName) {
    // Prepara i dati per ogni colonna del foglio
    const orderData = {
        nome: customerName,
        hamburger: cart['1'] || 0,
        surgelato: cart['2'] || 0,
        affumicato: cart['3'] || 0,
        affumicatoSpeck: cart['4'] || 0,
        vasetto: cart['5'] || 0,
        vasettoPorro: cart['6'] || 0,
        timestamp: new Date().toISOString()
    };

    const response = await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante per CORS con Google Apps Script
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    });

    // Con no-cors non possiamo leggere la risposta, ma l'invio funziona
    return response;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// Invio con tasto Enter nel campo nome
document.getElementById('customerName').onkeypress = (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btnConfirmOrder').click();
    }
};

render();
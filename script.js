const isBookingOpen = 1; // 1 = aperto, 0 = chiuso

const products = [
    { id: '1', category: 'hamburger', name: 'Hamburger di Trota', sheetColumn: 'B', emoji: '🍔', desc: '100% trota, speziato.', price: '3,00/pz', soldOut: false },
    { id: '2', category: 'surgelato', name: 'Filetto Surgelato', sheetColumn: 'C', emoji: '❄️', desc: 'Pulito e abbattuto sottovuoto.', price: '20,00/kg', soldOut: false },
    { id: '3', category: 'affumicato', name: 'Filetto Affumicato', sheetColumn: 'D', emoji: '🔥', desc: 'Affumicatura a legna tradizionale.', price: '30,00/kg', soldOut: false },
    { id: '4', category: 'affumicato', name: 'Filetto Affumicato allo Speck', sheetColumn: 'E', emoji: '🔥', desc: 'Affumicatura a legna tradizionale.', price: '30,00/kg', soldOut: false },
    { id: '5', category: 'marinato', name: 'Vasetto Marinato', sheetColumn: 'F', emoji: '🥫', desc: 'In olio e erbe aromatiche.', price: '5,00/pz', soldOut: false },
    { id: '6', category: 'marinato', name: 'Vasetto Marinato con Porro e Sedano', sheetColumn: 'G', emoji: '🥫', desc: 'In olio e erbe aromatiche.', price: '5,00/pz', soldOut: false }
];

let cart = {}; 
let currentFilter = 'all';

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxfHQbIfgmu7APL3aQurbua4i057qr3q00c3fobhdS3ZfmTyO9L7pMko3bob1ZkjlLOog/exec';

function render() {
    const grid = document.getElementById('productsGrid');
    const statusMsg = document.getElementById('statusMessage');
    const closedBanner = document.getElementById('closedBanner');
    const filtered = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
    
    if (!isBookingOpen) {
        closedBanner.style.display = "block";
        grid.classList.add('grid-closed');
    } else {
        statusMsg.style.display = "block";
        closedBanner.style.display = "none";
        grid.classList.remove('grid-closed');
    }

    grid.innerHTML = filtered.map(p => {
        const qty = cart[p.id] || 0;
        const isSoldOut = p.soldOut || !isBookingOpen; 
        const disabledAttr = isSoldOut ? 'disabled' : '';
        const addBtnText = isSoldOut ? '🔒 Esaurito' : '🛒 Aggiungi';
        const cardClass = isSoldOut ? 'card-disabled' : '';

        return `
            <div class="product-card ${cardClass}">
                <div class="product-emoji">${p.emoji}</div>
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
                <div class="product-meta">
                    <span>💰 €${p.price}</span>
                </div>
                <div class="qty-controls ${qty > 0 ? 'has-items' : ''}" data-id="${p.id}">
                    <button class="qty-btn qty-minus" onclick="updateQty('${p.id}', -1)" ${disabledAttr}>−</button>
                    <span class="qty-display">${qty}</span>
                    <button class="qty-btn qty-plus" onclick="updateQty('${p.id}', 1)" ${disabledAttr}>+</button>
                    <button class="btn-add" onclick="updateQty('${p.id}', 1)" ${disabledAttr}>${addBtnText}</button>
                </div>
            </div>
        `;
    }).join('');

    updateCartUI();
}

function updateQty(id, delta) {
    const product = products.find(p => p.id === id);
    if (!isBookingOpen || (product && product.soldOut)) return;

    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    render();
}

function updateCartUI() {
    const summary = document.getElementById('cartSummary');
    const cartText = document.getElementById('cartText');
    const items = Object.entries(cart);
    const total = items.reduce((acc, curr) => acc + curr[1], 0);

    if (total > 0 && isBookingOpen) {
        summary.style.display = 'flex';
        cartText.innerText = `Articoli nel carrello: ${total}`;
    } else {
        summary.style.display = 'none';
    }
}

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    };
});

document.getElementById('btnClearCart').onclick = () => {
    cart = {};
    render();
};

document.getElementById('btnOpenOrder').onclick = () => {
    if (!isBookingOpen) return;
    if (Object.keys(cart).length === 0) {
        showToast('⚠️ Il carrello è vuoto!', 'error');
        return;
    }
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('customerName').value = '';
    document.getElementById('modalError').style.display = 'none';
    setTimeout(() => document.getElementById('customerName').focus(), 100);
};

document.getElementById('btnCancelOrder').onclick = () => {
    document.getElementById('modalOverlay').style.display = 'none';
};

document.getElementById('modalOverlay').onclick = (e) => {
    if (e.target === document.getElementById('modalOverlay')) {
        document.getElementById('modalOverlay').style.display = 'none';
    }
};

// Nuovo listener per chiudere la modale di successo
document.getElementById('btnCloseSuccess').onclick = () => {
    document.getElementById('successOverlay').style.display = 'none';
};

document.getElementById('successOverlay').onclick = (e) => {
    if (e.target === document.getElementById('successOverlay')) {
        document.getElementById('successOverlay').style.display = 'none';
    }
};

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
        document.getElementById('modalOverlay').style.display = 'none'; // Nascondi modale nome
        
        // Mostra modale di successo con il nome del cliente
        document.getElementById('successCustomerName').innerText = name;
        document.getElementById('successOverlay').style.display = 'flex';
        
        cart = {};
        render();
    } catch (error) {
        showToast('❌ Errore nell\'invio. Riprova.', 'error');
    } finally {
        document.getElementById('btnConfirmOrder').disabled = false;
        document.getElementById('btnConfirmOrder').innerHTML = '✅ Invia Ordine';
    }
};

async function sendToGoogleSheet(customerName) {
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

    return await fetch(GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

document.getElementById('customerName').onkeypress = (e) => {
    if (e.key === 'Enter') document.getElementById('btnConfirmOrder').click();
};

render();
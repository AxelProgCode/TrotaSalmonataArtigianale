const isBookingOpen = 1; // 1 = aperto, 0 = chiuso

const products = [
    { id: '1', name: 'Hamburger', sheetColumn: 'B', img: 'img/hamburger.jpeg', desc: '100% trota, speziato.', price: '3,00/pz', soldOut: false, isExtra: false },
    { id: '2', name: 'Filetto Surgelato', sheetColumn: 'C', img: 'img/filetto-surgelato.jpeg', desc: 'Pulito e sfilettato.', price: '20,00/kg', soldOut: false, isExtra: false },
    { id: '3', name: 'Filetto Affumicato', sheetColumn: 'D', img: 'img/filetto-affumicato.jpeg', desc: 'Sfilettato, aromatizzato e sottovuoto.', price: '30,00/kg', soldOut: false, isExtra: false },
    { id: '4', name: 'Filetto Affumicato allo Speck', sheetColumn: 'E', img: 'img/filetto-affumicato-speck.jpeg', desc: 'Sfilettato, aromatizzato e sottovuoto.', price: '30,00/kg', soldOut: false, isExtra: false },
    { id: '5', name: 'Bocconcini Marinati', sheetColumn: 'F', img: 'img/bocconcini-marinati.jpeg', desc: 'In olio con erbe aromatiche.', price: '5,00/pz', soldOut: false, isExtra: false },
    { id: '6', name: 'Bocconcini Marinati con Porro e Sedano', sheetColumn: 'G', img: 'img/bocconcini-marinati-porro-e-sedano.jpeg', desc: 'In olio con erbe aromatiche.', price: '5,00/pz', soldOut: false, isExtra: false }
];

let cart = {};

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxfHQbIfgmu7APL3aQurbua4i057qr3q00c3fobhdS3ZfmTyO9L7pMko3bob1ZkjlLOog/exec';

function render() {
    const productsGrid = document.getElementById('productsGrid');
    const statusMsg = document.getElementById('statusMessage');
    const closedBanner = document.getElementById('closedBanner');
    
    if (!isBookingOpen) {
        closedBanner.style.display = "block";
        productsGrid.classList.add('grid-closed');
    } else {
        statusMsg.style.display = "block";
        closedBanner.style.display = "none";
        productsGrid.classList.remove('grid-closed');
    }

    productsGrid.innerHTML = products.map(p => {
        const qty = cart[p.id] || 0;
        const isSoldOut = p.soldOut || !isBookingOpen; 
        const disabledAttr = isSoldOut ? 'disabled' : '';
        const addBtnText = isSoldOut ? '🔒 Esaurito' : '🛒 Aggiungi';
        const cardClass = isSoldOut ? 'card-disabled' : '';

        return `
            <div class="product-card ${cardClass}">
                <div class="product-image">
                    <img src="${p.img}" alt="${p.name}" onerror="this.parentElement.innerHTML='<div class=\\'product-emoji\\'>🐟</div>'">
                </div>
                <div class="product-name">${p.name}</div>
                <div class="product-desc">${p.desc}</div>
                <div class="product-meta">
                    <span>€${p.price}</span>
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
        let text = `Articoli nel carrello: ${total}`;
        cartText.innerText = text;
    } else {
        summary.style.display = 'none';
    }
}

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
    document.getElementById('offerCoffee').checked = false;
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
    const coffeeSelected = document.getElementById('offerCoffee').checked;
    
    if (!name || name.length < 2) {
        document.getElementById('modalError').style.display = 'block';
        document.getElementById('customerName').focus();
        return;
    }

    document.getElementById('btnConfirmOrder').disabled = true;
    document.getElementById('btnConfirmOrder').innerHTML = '⏳ Invio in corso...';

    try {
        await sendToGoogleSheet(name, coffeeSelected);
        document.getElementById('modalOverlay').style.display = 'none';
        
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

async function sendToGoogleSheet(customerName, coffeeSelected) {
    const orderData = {
        nome: customerName,
        hamburger: cart['1'] || 0,
        surgelato: cart['2'] || 0,
        affumicato: cart['3'] || 0,
        affumicatoSpeck: cart['4'] || 0,
        vasetto: cart['5'] || 0,
        vasettoPorro: cart['6'] || 0,
        caffeSviluppatore: coffeeSelected ? 1 : 0,
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
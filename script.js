const isBookingOpen = 1; // 2 = prenotazione, 1 = aperto, 0 = chiuso

const products = [
    { id: '1', name: 'Filetto Surgelato', sheetColumn: 'B', img: 'img/filetto-surgelato.jpeg', desc: 'Pulito e sfilettato.', price: '20,00/kg', soldOut: false },
    { id: '2', name: 'Filetto Affumicato', sheetColumn: 'C', img: 'img/filetto-affumicato.jpeg', desc: 'Sfilettato, aromatizzato e sottovuoto.', price: '30,00/kg', soldOut: false },
    { id: '3', name: 'Filetto Affumicato allo Speck', sheetColumn: 'D', img: 'img/filetto-affumicato-speck.jpeg', desc: 'Sfilettato, aromatizzato e sottovuoto.', price: '30,00/kg', soldOut: false },
    { id: '4', name: 'Bocconcini Marinati', sheetColumn: 'E', img: 'img/bocconcini-marinati.jpeg', desc: 'In olio con erbe aromatiche.', price: '5,00/pz', soldOut: false },
    { id: '5', name: 'Bocconcini Marinati con Porro e Sedano', sheetColumn: 'F', img: 'img/bocconcini-marinati-porro-e-sedano.jpeg', desc: 'In olio con erbe aromatiche.', price: '5,00/pz', soldOut: false },
    { id: '6', name: 'Hamburger Surgelato', sheetColumn: 'G', img: 'img/hamburger.jpeg', desc: '100% trota, speziato.', price: '3,00/pz', soldOut: false, badge: 'Novità' },
    { id: '7', name: 'Cubetti per Sugo Surgelati', sheetColumn: 'H', img: 'img/cubetti-sugo.jpeg', desc: 'Trito precotto (si consigliano 2 cubetti ogni etto di pasta).', price: '0,50/pz', soldOut: false }
];

let cart = {};

const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbxfHQbIfgmu7APL3aQurbua4i057qr3q00c3fobhdS3ZfmTyO9L7pMko3bob1ZkjlLOog/exec';

function render() {
    const productsGrid = document.getElementById('productsGrid');
    const statusMsg = document.getElementById('statusMessage');
    const banner = document.getElementById('banner');
    
    // Gestione banner in base allo stato
    if (isBookingOpen === 0) {
        // Chiuso
        banner.style.display = "block";
        banner.innerHTML = `
            <h2>🚫 Ordinazioni Chiuse</h2>
            <p>Siamo spiacenti, le ordinazioni sono momentaneamente non disponibili.</p>
        `;
        banner.className = 'banner banner-closed';
        productsGrid.classList.add('grid-closed');
        statusMsg.style.display = "block";
        statusMsg.textContent = "❌ Le ordinazioni al momento sono chiuse.";
    } else if (isBookingOpen === 2) {
        // Prenotazione
        banner.style.display = "block";
        banner.innerHTML = `
            <h2>📋 Prenotazioni Aperte</h2>
            <p>Le ordinazioni ufficiali sono chiuse, ma puoi prenotare il tuo ordine in anticipo. La tua prenotazione verrà salvata e processata quando le ordinazioni riapriranno.</p>
        `;
        banner.className = 'banner banner-reservation';
        productsGrid.classList.remove('grid-closed');
        statusMsg.style.display = "block";
        statusMsg.textContent = "⚠️ Modalità prenotazione: gli ordini verranno processati in seguito.";
    } else {
        // Aperto
        banner.style.display = "none";
        productsGrid.classList.remove('grid-closed');
        statusMsg.style.display = "block";
        statusMsg.textContent = "✅ Sistema attivo. Seleziona i prodotti e invia l'ordine.";
    }

    productsGrid.innerHTML = products.map(p => {
        const qty = cart[p.id] || 0;
        const isSoldOut = p.soldOut || isBookingOpen === 0; 
        const disabledAttr = isSoldOut ? 'disabled' : '';
        const addBtnText = isSoldOut ? '🔒 Esaurito' : 
                          isBookingOpen === 2 ? '📋 Prenota' : '🛒 Aggiungi';
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
    if (isBookingOpen === 0 || (product && product.soldOut)) return;

    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    render();
}

function updateCartUI() {
    const summary = document.getElementById('cartSummary');
    const cartText = document.getElementById('cartText');
    const items = Object.entries(cart);
    const total = items.reduce((acc, curr) => acc + curr[1], 0);

    if (total > 0 && isBookingOpen !== 0) {
        summary.style.display = 'flex';
        cartText.innerText = `Articoli nel carrello: ${total}`;
    } else {
        summary.style.display = 'none';
    }
}

document.getElementById('btnClearCart').onclick = () => {
    cart = {};
    render();
};

document.getElementById('btnOpenOrder').onclick = () => {
    if (isBookingOpen === 0) return;
    if (Object.keys(cart).length === 0) {
        showToast('⚠️ Il carrello è vuoto!', 'error');
        return;
    }
    
    // Aggiorna il riepilogo ordine
    updateOrderSummary();
    
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('customerName').value = '';
    document.getElementById('orderNotes').value = '';
    document.getElementById('modalError').style.display = 'none';
    
    // Personalizza il titolo del modal in base allo stato
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = isBookingOpen === 2 ? '📋 Prenota il tuo ordine' : '📝 Inserisci il nominativo';
    }
    
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
    let name = document.getElementById('customerName').value.trim();
    name = name.replace(/\b\w/g, char => char.toUpperCase());

    if (!name || name.length < 3) {
        document.getElementById('modalError').style.display = 'block';
        document.getElementById('customerName').focus();
        return;
    }

    const notes = document.getElementById('orderNotes').value.trim();

    document.getElementById('btnConfirmOrder').disabled = true;
    document.getElementById('btnConfirmOrder').innerHTML = '⏳ Invio in corso...';

    try {
        await sendToGoogleSheet(name, notes);
        document.getElementById('modalOverlay').style.display = 'none';
        
        document.getElementById('successCustomerName').innerText = name;
        
        // Personalizza il messaggio di successo
        const successMessage = document.querySelector('#successOverlay .modal p');
        if (successMessage) {
            if (isBookingOpen === 2) {
                successMessage.innerHTML = `Grazie <strong id="successCustomerName">${name}</strong>,<br>la tua prenotazione è stata registrata con successo.`;
            } else {
                successMessage.innerHTML = `Grazie <strong id="successCustomerName">${name}</strong>,<br>il tuo ordine è stato registrato con successo.`;
            }
        }
        
        document.getElementById('successOverlay').style.display = 'flex';
        
        cart = {};
        render();
    } catch (error) {
        console.error('Errore invio:', error);
        showToast('❌ Errore nell\'invio. Riprova.', 'error');
    } finally {
        document.getElementById('btnConfirmOrder').disabled = false;
        document.getElementById('btnConfirmOrder').innerHTML = '✅ Invia Ordine';
    }
};

function updateOrderSummary() {
    const summaryDiv = document.getElementById('orderSummary');
    const summaryContent = document.getElementById('orderSummaryContent');
    const items = Object.entries(cart);
    
    if (items.length === 0) {
        summaryDiv.style.display = 'none';
        return;
    }
    
    summaryDiv.style.display = 'block';
    
    let totalItems = 0;
    let html = '';
    
    items.forEach(([id, qty]) => {
        const product = products.find(p => p.id === id);
        if (product && qty > 0) {
            totalItems += qty;
            
            html += `
                <div class="order-summary-item">
                    <span>${product.name}</span>
                    <span>${qty}</span>
                </div>
            `;
        }
    });
    
    html += `
        <div class="order-summary-item">
            <span><strong>Totale prodotti</strong></span>
            <span><strong>${totalItems}</strong></span>
        </div>
    `;
    
    summaryContent.innerHTML = html;
}

async function sendToGoogleSheet(customerName, notes) {
    const orderData = {
        nome: customerName,
        surgelato: cart['1'] || 0,
        affumicato: cart['2'] || 0,
        affumicatoSpeck: cart['3'] || 0,
        vasetto: cart['4'] || 0,
        vasettoPorro: cart['5'] || 0,
        hamburger: cart['6'] || 0,
        cubetti: cart['7'] || 0,
        note: notes || '',
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(GOOGLE_SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        return { success: true };
        
    } catch (error) {
        console.error('Errore invio:', error);
        throw new Error('Errore di rete. Verifica la connessione e riprova.');
    }
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
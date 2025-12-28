// --- CONFIGURATION ---
// നിലവിലെ Google Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbyZj30SPovjsZhY7ZQMDXROIj_2GwL0D0hP6VGiZpXEZEWEH5ngVI_sc8LHSCzbdgE/exec"; 

let allServices = [], allBarbers = [], allBookings = [];
let selectedService = null, selectedBarber = null, selectedTime = null;

// --- INITIALIZATION ---
// പേജ് ലോഡ് ആകുമ്പോൾ പ്രവർത്തിക്കുന്ന കോഡ്
window.onload = async () => {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        allServices = data.services;
        allBarbers = data.barbers;
        allBookings = data.bookings;

        // ലോഡിംഗ് ടെക്സ്റ്റ് മാറ്റി കണ്ടന്റ് കാണിക്കുന്നു
        document.getElementById('loading-text').style.display = 'none';
        document.getElementById('app-content').classList.remove('hidden');
        populateServices();
    } catch (err) {
        alert("ഡാറ്റ ലോഡ് ചെയ്യാൻ സാധിച്ചില്ല. ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.");
        console.error(err);
        document.getElementById('loading-text').textContent = "Error loading data. Please refresh.";
    }
};

// സേവനങ്ങൾ (Services) ലിസ്റ്റ് ചെയ്യുന്നു
function populateServices() {
    const select = document.getElementById('serviceSelect');
    select.innerHTML = '<option value="">-- Choose Service --</option>'; // Clear default
    allServices.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.duration} min)`;
        select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
        selectedService = allServices.find(s => s.id == e.target.value);
        if(selectedService) loadBarbers();
    });
}

// ബാർബർമാരെ (Barbers) ലിസ്റ്റ് ചെയ്യുന്നു
function loadBarbers() {
    const select = document.getElementById('barberSelect');
    select.innerHTML = '<option value="">-- Choose Barber --</option>';
    
    // Skills അനുസരിച്ച് ബാർബർമാരെ ഫിൽറ്റർ ചെയ്യുന്നു
    const skilledBarbers = allBarbers.filter(b => {
        const skills = String(b.skills).split(',').map(s => s.trim());
        return skills.includes(String(selectedService.id));
    });

    skilledBarbers.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        select.appendChild(opt);
    });

    const step2 = document.getElementById('step-2');
    step2.classList.remove('hidden');
    step2.scrollIntoView({behavior: "smooth"});
    
    // പഴയ ഇവന്റ് ലിസണർ ഒഴിവാക്കാൻ ക്ലോൺ ചെയ്യുന്നു
    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);

    newSelect.addEventListener('change', (e) => {
        selectedBarber = allBarbers.find(b => b.id == e.target.value);
        if(selectedBarber) {
            document.getElementById('step-3').classList.remove('hidden');
            
            // Reset Date Picker
            const dateInput = document.getElementById('dateInput');
            dateInput.valueAsDate = new Date();
            dateInput.min = new Date().toISOString().split('T')[0];
            dateInput.onchange = generateSlots;
            generateSlots(); // Auto generate for today
            
            setTimeout(() => document.getElementById('step-3').scrollIntoView({behavior: "smooth"}), 100);
        }
    });
}

// ---------------------------------------------------------
// സമയക്രമം (Slots) ഉണ്ടാക്കുന്നു
// ---------------------------------------------------------
function generateSlots() {
    const date = document.getElementById('dateInput').value;
    const container = document.getElementById('slotsGrid');
    container.innerHTML = '';
    selectedTime = null;
    document.getElementById('confirm-section').classList.add('hidden');

    if (!selectedBarber || !date) return;

    // ബാർബറുടെ ആ ദിവസത്തെ ബുക്കിംഗുകൾ എടുക്കുന്നു
    const barberBookings = allBookings.filter(b => 
        String(b.barber_id) === String(selectedBarber.id) && 
        String(b.date) === date 
    );

    // രാവിലെ 9:00 മുതൽ രാത്രി 8:00 (20:00) വരെ
    for (let h = 9; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
            const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            
            // ചെക്കിംഗ്: ഈ സമയത്ത് പുതിയ സർവീസ് ചെയ്യാൻ പറ്റുമോ?
            const isFree = checkAvailability(timeStr, selectedService.duration, barberBookings);

            const btn = document.createElement('div');
            btn.className = `slot ${!isFree ? 'booked' : ''}`;
            btn.textContent = timeStr;

            if (!isFree) {
                btn.title = "Already Booked";
            } else {
                btn.onclick = () => {
                    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedTime = timeStr;
                    document.getElementById('confirm-section').classList.remove('hidden');
                    document.getElementById('confirm-section').scrollIntoView({behavior: "smooth"});
                };
            }
            container.appendChild(btn);
        }
    }
}

// ബുക്കിംഗ് കൂട്ടിമുട്ടുന്നുണ്ടോ എന്ന് പരിശോധിക്കുന്നു
function checkAvailability(newTimeStr, newDuration, existingBookings) {
    const newStart = timeToMin(newTimeStr);
    const newEnd = newStart + Number(newDuration); 

    for (let booking of existingBookings) {
        const bookedStart = timeToMin(booking.time);
        const bookedDuration = booking.duration ? Number(booking.duration) : 30;
        const bookedEnd = bookedStart + bookedDuration;

        if (newStart < bookedEnd && newEnd > bookedStart) {
            return false; // കൂട്ടിമുട്ടുന്നു (Busy)
        }
    }
    return true; // ഒഴിവുണ്ട് (Available)
        }

function timeToMin(t) {
    if(!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

// ---------------------------------------------------------
// ബുക്കിംഗ് സേവ് ചെയ്യുകയും വാട്സാപ്പിലേക്ക് അയക്കുകയും ചെയ്യുന്നു
// ---------------------------------------------------------
document.getElementById('saveBtn').addEventListener('click', async () => {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;

    if (!name) { alert("Please enter your name"); return; }

    const btn = document.getElementById('saveBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    const bookingData = {
        date: document.getElementById('dateInput').value,
        time: selectedTime,
        barber_id: selectedBarber.id,
        service_id: selectedService.id,
        customer_name: name,
        customer_phone: phone,
        duration: selectedService.duration
    };

    try {
        // 1. ഗൂഗിൾ ഷീറ്റിലേക്ക് സേവ് ചെയ്യുന്നു
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bookingData)
        });

        // 2. സേവ് ചെയ്ത് കഴിഞ്ഞാൽ ഫോമുകൾ മറയ്ക്കുന്നു
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-3').classList.add('hidden');
        document.getElementById('confirm-section').classList.add('hidden');
        document.querySelector('header').style.display = 'none'; // ഹെഡർ മറയ്ക്കുന്നു

        // 3. വാട്സാപ്പ് ലിങ്ക് തയ്യാറാക്കുന്നു
        const barberPhone = selectedBarber.phone; 
        
        const msg = `*📅 New Appointment Request* %0A%0A` +
                    `💈 *Barber:* ${selectedBarber.name} %0A` +
                    `👤 *Customer:* ${name} %0A` +
                    `📞 *Phone:* ${phone} %0A` +
                    `✂️ *Service:* ${selectedService.name} %0A` +
                    `🗓️ *Date:* ${bookingData.date} %0A` +
                    `🕙 *Time:* ${bookingData.time}`;
        
        const waLink = document.getElementById('waLink');
        waLink.href = `https://wa.me/${barberPhone}?text=${msg}`;
        
        // 4. സക്സസ് സ്ക്രീൻ കാണിക്കുന്നു
        document.getElementById('success-section').classList.remove('hidden');

    } catch (error) {
        console.error(error);
        alert("Error saving booking! Please try again.");
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});
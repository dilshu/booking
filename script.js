// --- CONFIGURATION ---
// പുതിയ Google Script Web App URL ഇവിടെ നൽകുക
const API_URL = "https://script.google.com/macros/s/AKfycbyZj30SPovjsZhY7ZQMDXROIj_2GwL0D0hP6VGiZpXEZEWEH5ngVI_sc8LHSCzbdgE/exec"; 

let allServices = [], allBarbers = [], allBookings = [];
let selectedService = null, selectedBarber = null, selectedTime = null;

// --- INITIALIZATION ---
window.onload = async () => {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        allServices = data.services;
        allBarbers = data.barbers;
        allBookings = data.bookings;

        document.getElementById('loading-text').style.display = 'none';
        document.getElementById('app-content').classList.remove('hidden');
        populateServices();
    } catch (err) {
        alert("ഡാറ്റ ലോഡ് ചെയ്യാൻ സാധിച്ചില്ല. ഇന്റർനെറ്റ് കണക്ഷൻ പരിശോധിക്കുക.");
        console.error(err);
    }
};

function populateServices() {
    const select = document.getElementById('serviceSelect');
    allServices.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.duration} min)`;
        select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
        selectedService = allServices.find(s => s.id == e.target.value);
        loadBarbers();
    });
}

function loadBarbers() {
    if (!selectedService) return;
    const select = document.getElementById('barberSelect');
    select.innerHTML = '<option value="">-- Choose Barber --</option>';
    
    // Skills Filtering
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

    document.getElementById('step-2').classList.remove('hidden');
    
    select.addEventListener('change', (e) => {
        selectedBarber = allBarbers.find(b => b.id == e.target.value);
        document.getElementById('step-3').classList.remove('hidden');
        
        // Reset Date Picker
        const dateInput = document.getElementById('dateInput');
        dateInput.valueAsDate = new Date();
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.onchange = generateSlots;
        generateSlots();
    });
}

// ---------------------------------------------------------
// 🔥 FIX 1: DURATION & OVERLAP CHECK
// ---------------------------------------------------------
function generateSlots() {
    const date = document.getElementById('dateInput').value;
    const container = document.getElementById('slotsGrid');
    container.innerHTML = '';
    selectedTime = null;
    document.getElementById('confirm-section').classList.add('hidden');

    if (!selectedBarber || !date) return;

    // Filter bookings for this barber & date
    const barberBookings = allBookings.filter(b => 
        String(b.barber_id) === String(selectedBarber.id) && 
        String(b.date) === date // Direct string comparison works due to getDisplayValues()
    );

    // Generate 9:00 to 20:00
    for (let h = 9; h < 20; h++) {
        for (let m = 0; m < 60; m += 30) {
            const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            
            // ചെക്കിംഗ്: ഈ സമയത്ത് പുതിയ സർവീസ് ചെയ്യാൻ പറ്റുമോ?
            const isFree = checkAvailability(timeStr, selectedService.duration, barberBookings);

            const btn = document.createElement('div');
            btn.className = `slot ${!isFree ? 'booked' : ''}`;
            btn.textContent = timeStr;

            if (!isFree) {
                btn.title = "Busy";
            } else {
                btn.onclick = () => {
                    document.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedTime = timeStr;
                    document.getElementById('confirm-section').classList.remove('hidden');
                };
            }
            container.appendChild(btn);
        }
    }
}

function checkAvailability(newTimeStr, newDuration, existingBookings) {
    // എല്ലാ സമയവും മിനിറ്റിലേക്ക് മാറ്റുന്നു (09:00 -> 540)
    const newStart = timeToMin(newTimeStr);
    const newEnd = newStart + Number(newDuration); // പുതിയ ജോലിയുടെ അവസാന സമയം

    for (let booking of existingBookings) {
        // പഴയ ബുക്കിംഗിന്റെ സമയം എടുക്കുന്നു
        const bookedStart = timeToMin(booking.time);
        
        // പഴയ ബുക്കിംഗിന്റെ Duration ഷീറ്റിൽ ഇല്ലെങ്കിൽ 30 മിനിറ്റ് എന്ന് കണക്കാക്കും
        const bookedDuration = booking.duration ? Number(booking.duration) : 30;
        const bookedEnd = bookedStart + bookedDuration;

        // നിയമം: പുതിയ സമയം പഴയ സമയത്തിനുള്ളിൽ വരുന്നുണ്ടോ?
        // (StartA < EndB) AND (EndA > StartB)
        if (newStart < bookedEnd && newEnd > bookedStart) {
            return false; // കൂട്ടിമുട്ടുന്നു (തിരക്കാണ്)
        }
    }
    return true; // ഒഴിവുണ്ട്
}

function timeToMin(t) {
    if(!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

// ---------------------------------------------------------
// 🔥 FIX 2: WHATSAPP BUTTON LOGIC
// ---------------------------------------------------------
document.getElementById('saveBtn').addEventListener('click', async () => {
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;

    if (!name) { alert("Please enter your name"); return; }

    const btn = document.getElementById('saveBtn');
    btn.textContent = "Saving...";
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

        // 3. വാട്സാപ്പ് ബട്ടൺ സെറ്റ് ചെയ്യുന്നു (ഈ ലിങ്ക് നേരിട്ട് കസ്റ്റമർ ക്ലിക്ക് ചെയ്യണം)
        const barberPhone = selectedBarber.phone; // ബാർബറുടെ ഫോൺ നമ്പർ ഷീറ്റിൽ നിന്ന്
        
        // ബാർബറുടെ പേര് കൂടി മെസ്സേജിൽ ചേർക്കുന്നു
const msg = `*📅 New Appointment Request* %0A%0A` +
            `💈 *Barber:* ${selectedBarber.name} %0A` +  // ബാർബറുടെ പേര്
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
        alert("Error saving booking!");
        btn.disabled = false;
        btn.textContent = "Confirm Booking";
    }
});
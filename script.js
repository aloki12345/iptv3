// تهيئة المشغل مع إعدادات HLS
const player = videojs('my-video', {
    html5: {
        hls: {
            overrideNative: true,
            withCredentials: false
        }
    },
    techOrder: ['html5']
});

// إعدادات المستخدم
let savedSettings = JSON.parse(localStorage.getItem('xtreamSettings'));

// تحميل الإعدادات عند البدء
window.onload = () => {
    if (savedSettings) {
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('settingsBox').style.display = 'none';
        loadCategories();
    }
};

// حفظ الإعدادات
function saveSettings() {
    const settings = {
        serverUrl: document.getElementById('serverUrl').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    
    localStorage.setItem('xtreamSettings', JSON.stringify(settings));
    location.reload();
}

// جلب البيانات من السيرفر
async function fetchData(action, extraParams = '') {
    try {
        const response = await fetch(
            `${savedSettings.serverUrl}/player_api.php?` +
            `username=${savedSettings.username}&` +
            `password=${savedSettings.password}&` +
            `action=${action}${extraParams}`
        );
        return await response.json();
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        player.error({ code: 1001, message: 'خطأ في الاتصال بالسيرفر' });
    }
}

// تحميل التصنيفات
async function loadCategories() {
    try {
        const categories = await fetchData('get_live_categories');
        const buttonsContainer = document.getElementById('categoryButtons');
        
        buttonsContainer.innerHTML = categories.map(cat => `
            <button class="category-btn" onclick="loadCategory('${cat.category_id}', 'live')">
                ${cat.category_name}
            </button>
        `).join('');
        
        buttonsContainer.innerHTML += `
            <button class="category-btn" onclick="loadVodCategories()">الأفلام</button>
            <button class="category-btn" onclick="loadSeriesCategories()">المسلسلات</button>
        `;
    } catch (error) {
        console.error('خطأ في تحميل التصنيفات:', error);
    }
}

// تشغيل المحتوى مع دعم HLS
function playStream(streamUrl) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(player.tech().el);
        hls.on(Hls.Events.MANIFEST_PARSED, () => player.play());
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src({ src: streamUrl, type: 'application/x-mpegURL' });
        player.play();
    } else {
        player.error({ code: 1002, message: 'التنسيق غير مدعوم' });
    }
}

// معالجة الأخطاء
player.on('error', (error) => {
    const errorMessages = {
        1001: 'خطأ في الاتصال بالسيرفر',
        1002: 'التنسيق غير مدعوم',
        4: 'الرابط غير صالح'
    };
    
    alert(`خطأ التشغيل: ${errorMessages[player.error().code] || 'خطأ غير معروف'}`);
});

// باقي الدوال (loadCategory, loadVodCategories, loadSeriesCategories, etc.) تبقى كما هي
// [يمكنك إضافة الدوال الأخرى من الإجابات السابقة هنا]
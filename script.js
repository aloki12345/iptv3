// تهيئة المشغل مع إعدادات متقدمة
const player = videojs('my-video', {
    html5: {
        hls: {
            overrideNative: true,
            withCredentials: false,
            debug: true // تفعيل وضع التصحيح
        }
    },
    techOrder: ['html5'],
    autoplay: false,
    controls: true
});

// إعدادات المستخدم
let savedSettings = JSON.parse(localStorage.getItem('xtreamSettings'));
let currentHls = null; // متغير لتتبع مثيل HLS

// تحميل الإعدادات عند البدء
window.onload = async () => {
    if (savedSettings) {
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('settingsBox').style.display = 'none';
        await testServerConnection(); // اختبار اتصال السيرفر أولاً
        await loadCategories();
    }
};

// اختبار اتصال السيرفر
async function testServerConnection() {
    try {
        const test = await fetch(
            `${savedSettings.serverUrl}/player_api.php?` +
            `username=${savedSettings.username}&` +
            `password=${savedSettings.password}&` +
            `action=get_live_categories`
        );
        
        if (!test.ok) throw new Error('فشل الاتصال بالسيرفر');
    } catch (error) {
        console.error('خطأ الاتصال:', error);
        alert('الاتصال بالسيرفر فشل! تأكد من البيانات أو حاول لاحقًا');
        localStorage.removeItem('xtreamSettings');
        location.reload();
    }
}

// تشغيل المحتوى (الإصدار المعدل)
async function playStream(streamUrl) {
    try {
        // تنظيف أي مثيل HLS سابق
        if (currentHls) {
            currentHls.destroy();
            currentHls = null;
        }

        // التحقق من صحة الرابط
        if (!isValidUrl(streamUrl)) {
            throw new Error('رابط التشغيل غير صالح');
        }

        // إضافة طابع زمني لمنع التخزين المؤقت
        const finalUrl = `${streamUrl}?t=${Date.now()}`;

        if (Hls.isSupported()) {
            currentHls = new Hls({
                enableWorker: false,
                xhrSetup: (xhr) => {
                    xhr.withCredentials = true;
                }
            });
            
            currentHls.loadSource(finalUrl);
            currentHls.attachMedia(player.tech().el);
            
            currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
                player.play();
            });
            
            currentHls.on(Hls.Events.ERROR, (_, data) => {
                console.error('HLS Error:', data);
                handlePlayerError('HLS Error: ' + data.details);
            });
            
        } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
            player.src({ src: finalUrl, type: 'application/x-mpegURL' });
            player.play();
        } else {
            throw new Error('التنسيق غير مدعوم في هذا المتصفح');
        }
    } catch (error) {
        handlePlayerError(error.message);
    }
}

// التحقق من صحة الرابط
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

// معالجة الأخطاء (محدث)
function handlePlayerError(message) {
    const errorMap = {
        'manifestLoadError': 'الرابط غير صالح أو منتهي الصلاحية',
        'networkError': 'مشكلة في الشبكة أو السيرفر',
        'mediaError': 'تنسيق الملف غير مدعوم'
    };

    const friendlyMessage = errorMap[message] || message;
    
    player.error({
        code: 1003,
        message: friendlyMessage
    });
    
    alert(`خطأ التشغيل: ${friendlyMessage}`);
    console.error('تفاصيل الخطأ:', message);
}

// تحديث دالة جلب البيانات
async function fetchData(action, extraParams = '') {
    try {
        const response = await fetch(
            `${savedSettings.serverUrl}/player_api.php?` +
            `username=${savedSettings.username}&` +
            `password=${savedSettings.password}&` +
            `action=${action}${extraParams}`,
            {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            }
        );
        
        if (!response.ok) throw new Error('استجابة غير صالحة من السيرفر');
        
        const data = await response.json();
        if (data.status === 'error') throw new Error(data.message);
        
        return data;
    } catch (error) {
        handlePlayerError(error.message);
        return [];
    }
}

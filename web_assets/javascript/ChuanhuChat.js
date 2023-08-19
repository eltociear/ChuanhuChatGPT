
// ChuanhuChat core javascript

const MAX_HISTORY_LENGTH = 32;

var key_down_history = [];
var currentIndex = -1;

var gradioContainer = null;
var user_input_ta = null;
var user_input_tb = null;
var userInfoDiv = null;
var appTitleDiv = null;
var chatbot = null;
var chatbotWrap = null;
var apSwitch = null;
var messageBotDivs = null;
var loginUserForm = null;
var logginUser = null;
var updateToast = null;
var sendBtn = null;
var cancelBtn = null;
var sliders = null;
var updateChuanhuBtn = null;
var statusDisplay = null;


var isInIframe = (window.self !== window.top);
var currentTime = new Date().getTime();
var initialized = false;

// gradio 页面加载好了么??? 我能动你的元素了么??
function gradioLoaded(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length) {
            if (initialized) {
                observer.disconnect(); // 停止监听
                return;
            }
            initialize();
        }
    }
}

function initialize() {
    var needInit = {gradioContainer, apSwitch, user_input_tb, userInfoDiv, appTitleDiv, chatbot, chatbotWrap, statusDisplay, sliders, updateChuanhuBtn};
    initialized = true;

    loginUserForm = gradioApp().querySelector(".gradio-container > .main > .wrap > .panel > .form")
    gradioContainer = gradioApp().querySelector(".gradio-container");
    user_input_tb = gradioApp().getElementById('user-input-tb');
    userInfoDiv = gradioApp().getElementById("user-info");
    appTitleDiv = gradioApp().getElementById("app-title");
    chatbot = gradioApp().querySelector('#chuanhu-chatbot');
    chatbotWrap = gradioApp().querySelector('#chuanhu-chatbot > .wrapper > .wrap');
    apSwitch = gradioApp().querySelector('.apSwitch input[type="checkbox"]');
    updateToast = gradioApp().querySelector("#toast-update");
    sendBtn = gradioApp().getElementById("submit-btn");
    cancelBtn = gradioApp().getElementById("cancel-btn");
    sliders = gradioApp().querySelectorAll('input[type="range"]');
    updateChuanhuBtn = gradioApp().getElementById("update-chuanhu-btn");
    statusDisplay = gradioApp().querySelector('#status-display');

    if (loginUserForm) {
        localStorage.setItem("userLogged", true);
        userLogged = true;
    }

    for (let elem in needInit) {
        if (needInit[elem] == null) {
            initialized = false;
            return;
        }
    }

    if (initialized) {
        adjustDarkMode();
        selectHistory();
        setTimeout(showOrHideUserInfo(), 2000);
        setChatbotHeight();
        setChatbotScroll();
        setSlider();
        if (!historyLoaded) loadHistoryHtml();
        if (!usernameGotten) getUserInfo();
        mObserver.observe(chatbotWrap, { attributes: true, childList: true, subtree: true, characterData: true });
        submitObserver.observe(cancelBtn, { attributes: true, characterData: true });

        const lastCheckTime = localStorage.getItem('lastCheckTime') || 0;
        const longTimeNoCheck = currentTime - lastCheckTime > 3 * 24 * 60 * 60 * 1000;
        if (longTimeNoCheck && !updateInfoGotten && !isLatestVersion || isLatestVersion && !updateInfoGotten) {
            updateLatestVersion();
        }
    }
}

function gradioApp() {
    const elems = document.getElementsByTagName('gradio-app');
    const elem = elems.length == 0 ? document : elems[0];

    if (elem !== document) {
        elem.getElementById = function(id) {
            return document.getElementById(id);
        };
    }
    return elem.shadowRoot ? elem.shadowRoot : elem;
}

function showConfirmationDialog(a, file, c) {
    if (file != "") {
        var result = confirm(i18n(deleteConfirm_i18n_pref) + file + i18n(deleteConfirm_i18n_suff));
        if (result) {
            return [a, file, c];
        }
    }
    return [a, "CANCELED", c];
}

function selectHistory() {
    user_input_ta = user_input_tb.querySelector("textarea");
    if (user_input_ta) {
        disableSendBtn();
        // 在 textarea 上监听 keydown 事件
        user_input_ta.addEventListener("keydown", function (event) {
            var value = user_input_ta.value.trim();
            // 判断按下的是否为方向键
            if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
                // 如果按下的是方向键，且输入框中有内容，且历史记录中没有该内容，则不执行操作
                if (value && key_down_history.indexOf(value) === -1)
                    return;
                // 对于需要响应的动作，阻止默认行为。
                event.preventDefault();
                var length = key_down_history.length;
                if (length === 0) {
                    currentIndex = -1; // 如果历史记录为空，直接将当前选中的记录重置
                    return;
                }
                if (currentIndex === -1) {
                    currentIndex = length;
                }
                if (event.code === 'ArrowUp' && currentIndex > 0) {
                    currentIndex--;
                    user_input_ta.value = key_down_history[currentIndex];
                } else if (event.code === 'ArrowDown' && currentIndex < length - 1) {
                    currentIndex++;
                    user_input_ta.value = key_down_history[currentIndex];
                }
                user_input_ta.selectionStart = user_input_ta.value.length;
                user_input_ta.selectionEnd = user_input_ta.value.length;
                const input_event = new InputEvent("input", { bubbles: true, cancelable: true });
                user_input_ta.dispatchEvent(input_event);
            } else if (event.code === "Enter") {
                if (value) {
                    currentIndex = -1;
                    if (key_down_history.indexOf(value) === -1) {
                        key_down_history.push(value);
                        if (key_down_history.length > MAX_HISTORY_LENGTH) {
                            key_down_history.shift();
                        }
                    }
                }
            }
        });
    }
}

function disableSendBtn() {
    sendBtn.disabled = user_input_ta.value.trim() === '';
    user_input_ta.addEventListener('input', () => {
        sendBtn.disabled = user_input_ta.value.trim() === '';
    });
}

function adjustDarkMode() {
    function toggleDarkMode(isEnabled) {
        if (isEnabled) {
            document.body.classList.add("dark");
            document.body.style.setProperty("background-color", "var(--neutral-950)", "important");
        } else {
            document.body.classList.remove("dark");
            document.body.style.backgroundColor = "";
        }
    }
    
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    apSwitch.checked = darkModeQuery.matches;
    toggleDarkMode(darkModeQuery.matches);
    darkModeQuery.addEventListener("change", (e) => {
        apSwitch.checked = e.matches;
        toggleDarkMode(e.matches);
    });
    apSwitch.addEventListener("change", (e) => {
        toggleDarkMode(e.target.checked);
    });
}

function setChatbotHeight() {
    const screenWidth = window.innerWidth;
    const statusDisplay = document.querySelector('#status-display');
    const statusDisplayHeight = statusDisplay ? statusDisplay.offsetHeight : 0;
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    if (isInIframe) {
        chatbot.style.height = `700px`;
        chatbotWrap.style.maxHeight = `calc(700px - var(--line-sm) * 1rem - 2 * var(--block-label-margin))`
    } else {
        if (screenWidth <= 320) {
            chatbot.style.height = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 150}px)`;
            chatbotWrap.style.maxHeight = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 150}px - var(--line-sm) * 1rem - 2 * var(--block-label-margin))`;
        } else if (screenWidth <= 499) {
            chatbot.style.height = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 100}px)`;
            chatbotWrap.style.maxHeight = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 100}px - var(--line-sm) * 1rem - 2 * var(--block-label-margin))`;
        } else {
            chatbot.style.height = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 160}px)`;
            chatbotWrap.style.maxHeight = `calc(var(--vh, 1vh) * 100 - ${statusDisplayHeight + 160}px - var(--line-sm) * 1rem - 2 * var(--block-label-margin))`;
        }
    }
}
function setChatbotScroll() {
    var scrollHeight = chatbotWrap.scrollHeight;
    chatbotWrap.scrollTo(0,scrollHeight)
}


let timeoutId;
let isThrottled = false;
// 监听chatWrap元素的变化，为 bot 消息添加复制按钮。
var mObserver = new MutationObserver(function (mutationsList) {
    for (const mmutation of mutationsList) {
        if (mmutation.type === 'childList') {
            for (var node of mmutation.addedNodes) {
                if (node.nodeType === 1 && node.classList.contains('message')) {
                    saveHistoryHtml();
                    disableSendBtn();
                    document.querySelectorAll('#chuanhu-chatbot .message-wrap .message.bot').forEach(addChuanhuButton);
                }
            }
            for (var node of mmutation.removedNodes) {
                if (node.nodeType === 1 && node.classList.contains('message')) {
                    saveHistoryHtml();
                    disableSendBtn();
                    document.querySelectorAll('#chuanhu-chatbot .message-wrap .message.bot').forEach(addChuanhuButton);
                }
            }
        } else if (mmutation.type === 'attributes') {
            if (isThrottled) break; // 为了防止重复不断疯狂渲染，加上等待_(:з」∠)_
            isThrottled = true;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                isThrottled = false;
                document.querySelectorAll('#chuanhu-chatbot .message-wrap .message.bot').forEach(addChuanhuButton);
                saveHistoryHtml();
                disableSendBtn();
            }, 1500);
        }
    }
});

var submitObserver = new MutationObserver(function (mutationsList) {
    document.querySelectorAll('#chuanhu-chatbot .message-wrap .message.bot').forEach(addChuanhuButton);
    saveHistoryHtml();
});

// 监视页面内部 DOM 变动
var observer = new MutationObserver(function (mutations) {
    gradioLoaded(mutations);
});

// 监视页面变化
window.addEventListener("DOMContentLoaded", function () {
    const ga = document.getElementsByTagName("gradio-app");
    observer.observe(ga[0], { childList: true, subtree: true });
    isInIframe = (window.self !== window.top);
    historyLoaded = false;
});
window.addEventListener('resize', setChatbotHeight);
window.addEventListener('scroll', function(){setChatbotHeight(); setUpdateWindowHeight();});
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", adjustDarkMode);

// console suprise
var styleTitle1 = `
font-size: 16px;
font-family: ui-monospace, monospace;
color: #06AE56;
`
var styleDesc1 = `
font-size: 12px;
font-family: ui-monospace, monospace;
`
function makeML(str) {
    let l = new String(str)
    l = l.substring(l.indexOf("/*") + 3, l.lastIndexOf("*/"))
    return l
}
let ChuanhuInfo = function () {
    /* 
   ________                      __             ________          __ 
  / ____/ /_  __  ______ _____  / /_  __  __   / ____/ /_  ____ _/ /_
 / /   / __ \/ / / / __ `/ __ \/ __ \/ / / /  / /   / __ \/ __ `/ __/
/ /___/ / / / /_/ / /_/ / / / / / / / /_/ /  / /___/ / / / /_/ / /_  
\____/_/ /_/\__,_/\__,_/_/ /_/_/ /_/\__,_/   \____/_/ /_/\__,_/\__/  
                                                                     
   川虎Chat (Chuanhu Chat) - GUI for ChatGPT API and many LLMs
 */
}
let description = `
© 2023 Chuanhu, MZhao, Keldos
GitHub repository: [https://github.com/GaiZhenbiao/ChuanhuChatGPT]\n
Enjoy our project!\n
`
console.log(`%c${makeML(ChuanhuInfo)}`,styleTitle1)
console.log(`%c${description}`, styleDesc1)

// button svg code
const copyIcon   = '<span><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height=".8em" width=".8em" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></span>';
const copiedIcon = '<span><svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height=".8em" width=".8em" xmlns="http://www.w3.org/2000/svg"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
const mdIcon     = '<span><svg stroke="currentColor" fill="none" stroke-width="1" viewBox="0 0 14 18" stroke-linecap="round" stroke-linejoin="round" height=".8em" width=".8em" xmlns="http://www.w3.org/2000/svg"><g transform-origin="center" transform="scale(0.85)"><path d="M1.5,0 L12.5,0 C13.3284271,-1.52179594e-16 14,0.671572875 14,1.5 L14,16.5 C14,17.3284271 13.3284271,18 12.5,18 L1.5,18 C0.671572875,18 1.01453063e-16,17.3284271 0,16.5 L0,1.5 C-1.01453063e-16,0.671572875 0.671572875,1.52179594e-16 1.5,0 Z" stroke-width="1.8"></path><line x1="3.5" y1="3.5" x2="10.5" y2="3.5"></line><line x1="3.5" y1="6.5" x2="8" y2="6.5"></line></g><path d="M4,9 L10,9 C10.5522847,9 11,9.44771525 11,10 L11,13.5 C11,14.0522847 10.5522847,14.5 10,14.5 L4,14.5 C3.44771525,14.5 3,14.0522847 3,13.5 L3,10 C3,9.44771525 3.44771525,9 4,9 Z" stroke="none" fill="currentColor"></path></svg></span>';
const rawIcon    = '<span><svg stroke="currentColor" fill="none" stroke-width="1.8" viewBox="0 0 18 14" stroke-linecap="round" stroke-linejoin="round" height=".8em" width=".8em" xmlns="http://www.w3.org/2000/svg"><g transform-origin="center" transform="scale(0.85)"><polyline points="4 3 0 7 4 11"></polyline><polyline points="14 3 18 7 14 11"></polyline><line x1="12" y1="0" x2="6" y2="14"></line></g></svg></span>';
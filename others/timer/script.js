// script.js
let timerInterval;
let totalDuration;
let remainingSeconds;

// DOM要素
const timerDisplay = document.getElementById('timerDisplay');
const progressCircle = document.getElementById('progress-circle');
const startMenu = document.getElementById('start-menu');
const inProgressMenu = document.getElementById('in-progress-menu');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');

// SVG円の設定
const radius = progressCircle.r.baseVal.value;
const circumference = 2 * Math.PI * radius;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

// 初期化
resetTimer();

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}

function runTimer() {
    timerInterval = setInterval(() => {
        remainingSeconds--;
        const percentage = (remainingSeconds / totalDuration) * 100;

        updateDisplay(remainingSeconds);
        setProgress(percentage);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            updateDisplay(0);
            setProgress(0);
            // 完了メッセージ
            timerDisplay.setAttribute('data-text', 'COMPLETE');
            timerDisplay.textContent = 'COMPLETE';
        }
    }, 1000);
}

function startTimer(duration) {
    totalDuration = duration;
    remainingSeconds = duration;
    
    updateDisplay(remainingSeconds);
    setProgress(100);
    
    startMenu.style.display = 'none';
    inProgressMenu.style.display = 'block';
    
    runTimer();
}

function pauseTimer() {
    clearInterval(timerInterval);
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'inline-block';
}

function resumeTimer() {
    resumeBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    runTimer();
}

function resetTimer() {
    clearInterval(timerInterval);
    updateDisplay('--:--');
    setProgress(100);
    progressCircle.style.strokeDashoffset = circumference; // 円を完全に隠す

    startMenu.style.display = 'block';
    inProgressMenu.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    resumeBtn.style.display = 'none';
}

function updateDisplay(seconds) {
    let displayText;
    if (typeof seconds === 'number') {
        const minutes = Math.floor(seconds / 60);
        const remainderSeconds = seconds % 60;
        displayText = `${minutes}:${remainderSeconds < 10 ? '0' : ''}${remainderSeconds}`;
    } else {
        displayText = seconds; // '--:--'などの文字列をそのまま表示
    }
    timerDisplay.setAttribute('data-text', displayText);
    timerDisplay.textContent = displayText;
}